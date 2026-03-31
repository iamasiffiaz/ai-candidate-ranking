from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User, UserRole
from app.schemas.job import JobCreate, JobResponse, JobUpdate

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_job_or_404(job_id: int, db: AsyncSession) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


async def _with_resume_count(job: Job, db: AsyncSession) -> JobResponse:
    """Attach the resume count to a JobResponse."""
    count_result = await db.execute(
        select(func.count(Resume.id)).where(Resume.job_id == job.id)
    )
    count = count_result.scalar() or 0
    resp = JobResponse.model_validate(job)
    resp.resume_count = count
    return resp


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new job description."""
    job = Job(**payload.model_dump(), created_by=current_user.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return await _with_resume_count(job, db)


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List jobs with optional active-only filter and pagination."""
    query = select(Job)
    if active_only:
        query = query.where(Job.is_active.is_(True))
    query = query.order_by(Job.created_at.desc()).offset(skip).limit(limit)
    rows = await db.execute(query)
    jobs = rows.scalars().all()
    return [await _with_resume_count(j, db) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single job by ID."""
    job = await _get_job_or_404(job_id, db)
    return await _with_resume_count(job, db)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    payload: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a job. Admins can edit any job; recruiters only their own."""
    job = await _get_job_or_404(job_id, db)
    if current_user.role != UserRole.admin and job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to edit this job",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return await _with_resume_count(job, db)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a job and all its associated resumes (cascade)."""
    job = await _get_job_or_404(job_id, db)
    if current_user.role != UserRole.admin and job.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to delete this job",
        )
    await db.delete(job)
    await db.commit()
