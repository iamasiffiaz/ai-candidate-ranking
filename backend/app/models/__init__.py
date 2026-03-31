# Import all models so SQLAlchemy registers them with Base.metadata
from app.models.job import Job  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.user import User, UserRole  # noqa: F401

__all__ = ["User", "UserRole", "Job", "Resume"]
