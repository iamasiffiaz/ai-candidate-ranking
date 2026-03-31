from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    similarity_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_weaknesses: Optional[str] = None
    ai_match_explanation: Optional[str] = None
    job_id: int
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeUploadResponse(BaseModel):
    uploaded: int
    failed: int
    resumes: List[ResumeResponse]
    errors: List[str] = []
