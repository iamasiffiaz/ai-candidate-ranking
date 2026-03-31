import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers import auth, jobs, ranking, reports, resumes
from app.services.embedding_service import ensure_collection_exists

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise DB tables and Qdrant collection. Shutdown: cleanup."""
    logger.info("=== AI Candidate Ranking System starting ===")

    # Ensure upload directory exists
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Create PostgreSQL tables (idempotent)
    await init_db()
    logger.info("PostgreSQL tables ready")

    # Create Qdrant collection if absent
    try:
        ensure_collection_exists()
        logger.info("Qdrant collection ready")
    except Exception as exc:
        logger.warning(f"Qdrant not available at startup (will retry on first use): {exc}")

    yield
    logger.info("=== Shutdown complete ===")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-ready AI-powered resume ranking system. "
        "Upload resumes, define jobs, and let vector embeddings + LLM rank your candidates."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(ranking.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION, "app": settings.APP_NAME}
