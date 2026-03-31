from typing import List, Optional

from pydantic import BaseModel

from app.schemas.resume import ResumeResponse


class RankingResult(BaseModel):
    job_id: int
    job_title: str
    total_candidates: int
    ranked_candidates: List[ResumeResponse]


class CandidateAnalysis(BaseModel):
    resume_id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    similarity_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_weaknesses: Optional[str] = None
    ai_match_explanation: Optional[str] = None
