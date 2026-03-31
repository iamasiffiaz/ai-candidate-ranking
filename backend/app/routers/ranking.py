import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.schemas.ranking import CandidateAnalysis, RankingResult
from app.schemas.resume import ResumeResponse
from app.services.llm_service import generate_candidate_analysis
from app.services.ranking_service import rank_candidates_for_job

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ranking", tags=["Ranking"])


# ── helpers ───────────────────────────────────────────────────────────────────

async def _job_or_404(job_id: int, db: AsyncSession) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/{job_id}/rank", response_model=RankingResult)
async def rank_candidates(
    job_id: int,
    top_k: Optional[int] = Query(None, ge=1, le=100),
    generate_ai: bool = Query(True, description="Generate LLM summaries for top candidates"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run the full AI ranking pipeline for the specified job:
    - Embed the job description and query Qdrant for most-similar resumes.
    - Persist similarity scores in PostgreSQL.
    - (Optionally) generate LLM summaries for the top 10 candidates.

    Returns the ranked candidate list immediately.
    """
    job = await _job_or_404(job_id, db)
    ranked = await rank_candidates_for_job(
        job=job, db=db, top_k=top_k, generate_ai_summaries=generate_ai
    )
    return RankingResult(
        job_id=job.id,
        job_title=job.title,
        total_candidates=len(ranked),
        ranked_candidates=[ResumeResponse.model_validate(r) for r in ranked],
    )


@router.get("/{job_id}/results", response_model=RankingResult)
async def get_ranking_results(
    job_id: int,
    top_k: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch previously computed ranking results from the database.
    Returns resumes ordered by descending similarity score.
    """
    job = await _job_or_404(job_id, db)
    rows = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id, Resume.similarity_score.is_not(None))
        .order_by(Resume.similarity_score.desc())
        .limit(top_k)
    )
    resumes = rows.scalars().all()
    return RankingResult(
        job_id=job.id,
        job_title=job.title,
        total_candidates=len(resumes),
        ranked_candidates=[ResumeResponse.model_validate(r) for r in resumes],
    )


@router.get("/{job_id}/candidate/{resume_id}", response_model=CandidateAnalysis)
async def get_candidate_analysis(
    job_id: int,
    resume_id: int,
    force: bool = Query(False, description="Force regenerate LLM analysis"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the AI analysis for a specific candidate.
    Generates and caches the analysis if it doesn't exist yet (or if force=True).
    """
    job = await _job_or_404(job_id, db)

    resume_result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.job_id == job_id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found for this job")

    if not resume.ai_summary or force:
        analysis = await generate_candidate_analysis(
            job_title=job.title,
            job_description=job.description,
            requirements=job.requirements or "",
            resume_text=resume.raw_text or "",
            similarity_score=resume.similarity_score or 0.0,
        )
        resume.ai_summary = analysis["summary"]
        resume.ai_strengths = analysis["strengths"]
        resume.ai_weaknesses = analysis["weaknesses"]
        resume.ai_match_explanation = analysis["match_explanation"]
        await db.commit()
        await db.refresh(resume)

    return CandidateAnalysis(
        resume_id=resume.id,
        candidate_name=resume.candidate_name,
        candidate_email=resume.candidate_email,
        candidate_phone=resume.candidate_phone,
        similarity_score=resume.similarity_score,
        ai_summary=resume.ai_summary,
        ai_strengths=resume.ai_strengths,
        ai_weaknesses=resume.ai_weaknesses,
        ai_match_explanation=resume.ai_match_explanation,
    )
