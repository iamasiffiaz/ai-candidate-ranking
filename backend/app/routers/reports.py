import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User
from app.services.report_service import generate_ranking_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/{job_id}/download")
async def download_ranking_report(
    job_id: int,
    top_k: int = Query(20, ge=1, le=100, description="Number of top candidates to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and stream a PDF ranking report for the given job.
    Includes a summary table and detailed profiles for the top candidates.
    """
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id)
        .order_by(Resume.similarity_score.desc().nulls_last())
        .limit(top_k)
    )
    resumes = list(rows.scalars().all())

    try:
        pdf_bytes = generate_ranking_report(job=job, ranked_resumes=resumes)
    except Exception as exc:
        logger.error(f"PDF generation failed for job {job_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")

    safe_title = "".join(c if c.isalnum() or c in "-_" else "_" for c in job.title)[:40]
    filename = f"ranking_report_{safe_title}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
