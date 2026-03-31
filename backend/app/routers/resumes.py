import logging
import os
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse, ResumeUploadResponse
from app.services.embedding_service import delete_embedding, store_embedding
from app.services.pdf_service import (
    extract_candidate_info,
    extract_text_from_pdf,
    save_upload_file,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_resumes(
    job_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload one or more PDF resumes for a specific job.
    Each file is:
      1. Validated (PDF, size limit)
      2. Saved to disk
      3. Text-extracted via PyMuPDF
      4. Candidate info parsed via regex
      5. Embedded and stored in Qdrant
      6. Persisted in PostgreSQL
    """
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    uploaded, failed, created, errors = 0, 0, [], []

    for file in files:
        fname = file.filename or "unknown.pdf"

        if not fname.lower().endswith(".pdf"):
            errors.append(f"{fname}: Only PDF files are accepted")
            failed += 1
            continue

        try:
            content = await file.read()
            if len(content) > settings.MAX_UPLOAD_SIZE:
                errors.append(f"{fname}: Exceeds 10 MB size limit")
                failed += 1
                continue

            file_path, unique_name = await save_upload_file(content, fname)
            raw_text = extract_text_from_pdf(file_path)
            name, email, phone = extract_candidate_info(raw_text)

            # Build embedding text combining name + full resume body
            embed_text = f"Candidate: {name or 'Unknown'}\n{raw_text}"
            qdrant_id = store_embedding(
                embed_text,
                {"resume_filename": unique_name, "job_id": job_id, "candidate_name": name},
            )

            resume = Resume(
                filename=unique_name,
                original_filename=fname,
                file_path=file_path,
                candidate_name=name,
                candidate_email=email,
                candidate_phone=phone,
                raw_text=raw_text,
                qdrant_point_id=qdrant_id,
                job_id=job_id,
                uploaded_by=current_user.id,
            )
            db.add(resume)
            await db.commit()
            await db.refresh(resume)
            created.append(ResumeResponse.model_validate(resume))
            uploaded += 1

        except Exception as exc:
            logger.error(f"Failed processing {fname}: {exc}", exc_info=True)
            errors.append(f"{fname}: {exc}")
            failed += 1

    return ResumeUploadResponse(
        uploaded=uploaded, failed=failed, resumes=created, errors=errors
    )


@router.get("/job/{job_id}", response_model=List[ResumeResponse])
async def list_resumes_for_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all resumes for a job ordered by similarity score (best first)."""
    rows = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id)
        .order_by(Resume.similarity_score.desc().nulls_last())
    )
    return rows.scalars().all()


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve metadata for a single resume."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a resume: removes DB record, Qdrant embedding, and disk file."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.qdrant_point_id:
        try:
            delete_embedding(resume.qdrant_point_id)
        except Exception as e:
            logger.warning(f"Could not remove Qdrant point {resume.qdrant_point_id}: {e}")

    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)

    await db.delete(resume)
    await db.commit()
