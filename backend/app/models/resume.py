from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)          # UUID-prefixed stored name
    original_filename = Column(String(500), nullable=False)  # Original upload name
    file_path = Column(String(1000), nullable=False)

    # Parsed candidate info (extracted from PDF)
    candidate_name = Column(String(255), nullable=True, index=True)
    candidate_email = Column(String(255), nullable=True, index=True)
    candidate_phone = Column(String(50), nullable=True)
    raw_text = Column(Text, nullable=True)

    # Qdrant embedding reference
    qdrant_point_id = Column(String(255), nullable=True, unique=True)

    # AI-generated ranking data
    similarity_score = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_strengths = Column(Text, nullable=True)
    ai_weaknesses = Column(Text, nullable=True)
    ai_match_explanation = Column(Text, nullable=True)

    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    job = relationship("Job", back_populates="resumes")
    uploader = relationship("User")
