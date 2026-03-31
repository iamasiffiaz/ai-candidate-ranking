import logging
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.models.resume import Resume
from app.services.embedding_service import search_similar_resumes, store_embedding
from app.services.llm_service import generate_candidate_analysis

logger = logging.getLogger(__name__)


async def index_resume(resume: Resume, job: Job, db: AsyncSession) -> str:
    """
    Generate an embedding for the resume text and upsert it into Qdrant.
    Persists the resulting point ID back to the database row.
    """
    text = f"Candidate: {resume.candidate_name or 'Unknown'}\n{resume.raw_text or ''}"
    metadata = {
        "resume_id": resume.id,
        "job_id": job.id,
        "candidate_name": resume.candidate_name,
        "candidate_email": resume.candidate_email,
    }
    point_id = store_embedding(text, metadata)

    await db.execute(
        update(Resume).where(Resume.id == resume.id).values(qdrant_point_id=point_id)
    )
    await db.commit()
    return point_id


async def rank_candidates_for_job(
    job: Job,
    db: AsyncSession,
    top_k: Optional[int] = None,
    generate_ai_summaries: bool = True,
) -> List[Resume]:
    """
    Core ranking pipeline:
    1. Embed the job description as a query vector.
    2. Search Qdrant for the most similar resume embeddings (filtered by job_id).
    3. Map similarity scores back to DB rows and sort.
    4. Optionally generate LLM summaries for the top-10 candidates.
    5. Persist all scores and summaries, then return sorted list.
    """
    query_text = (
        f"Job Title: {job.title}\n"
        f"Description: {job.description}\n"
        f"Requirements: {job.requirements or ''}"
    )

    search_results = search_similar_resumes(
        query_text=query_text,
        job_id=job.id,
        top_k=top_k or 200,
    )

    if not search_results:
        logger.warning(f"No Qdrant results for job {job.id}")
        return []

    score_map = {r["point_id"]: r["score"] for r in search_results}

    # Fetch all resumes for this job
    rows = await db.execute(select(Resume).where(Resume.job_id == job.id))
    resumes = rows.scalars().all()

    # Attach scores and filter out resumes not yet indexed
    scored: List[Resume] = []
    for r in resumes:
        if r.qdrant_point_id and r.qdrant_point_id in score_map:
            r.similarity_score = score_map[r.qdrant_point_id]
            scored.append(r)

    # Sort by descending similarity
    scored.sort(key=lambda r: r.similarity_score or 0, reverse=True)

    # Optionally limit to top_k results
    if top_k:
        scored = scored[:top_k]

    # Persist similarity scores
    for r in scored:
        await db.execute(
            update(Resume)
            .where(Resume.id == r.id)
            .values(similarity_score=r.similarity_score)
        )

    # Generate LLM summaries for the top 10 candidates only (rate-limit awareness)
    if generate_ai_summaries:
        for r in scored[:10]:
            if r.ai_summary:
                continue  # Skip if already analysed
            try:
                analysis = await generate_candidate_analysis(
                    job_title=job.title,
                    job_description=job.description,
                    requirements=job.requirements or "",
                    resume_text=r.raw_text or "",
                    similarity_score=r.similarity_score or 0,
                )
                await db.execute(
                    update(Resume)
                    .where(Resume.id == r.id)
                    .values(
                        ai_summary=analysis["summary"],
                        ai_strengths=analysis["strengths"],
                        ai_weaknesses=analysis["weaknesses"],
                        ai_match_explanation=analysis["match_explanation"],
                    )
                )
                r.ai_summary = analysis["summary"]
                r.ai_strengths = analysis["strengths"]
                r.ai_weaknesses = analysis["weaknesses"]
                r.ai_match_explanation = analysis["match_explanation"]
            except Exception as e:
                logger.error(f"LLM analysis failed for resume {r.id}: {e}")

    await db.commit()

    # Refresh ORM state from DB
    for r in scored:
        await db.refresh(r)

    return scored
