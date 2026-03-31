import logging
import uuid
from typing import Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level singletons — loaded once and reused across requests
_embedding_model: Optional[SentenceTransformer] = None
_qdrant_client: Optional[QdrantClient] = None


def get_embedding_model() -> SentenceTransformer:
    """Lazy-load the sentence-transformers model."""
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    return _embedding_model


def get_qdrant_client() -> QdrantClient:
    """Lazy-initialize Qdrant client."""
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
        )
    return _qdrant_client


def ensure_collection_exists() -> None:
    """Create the Qdrant collection if it does not already exist."""
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}
    if settings.QDRANT_COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
        logger.info(f"Created Qdrant collection '{settings.QDRANT_COLLECTION_NAME}'")


def generate_embedding(text: str) -> List[float]:
    """Encode text into a dense vector using the loaded embedding model."""
    model = get_embedding_model()
    vector = model.encode(text, convert_to_numpy=True)
    return vector.tolist()


def store_embedding(text: str, metadata: Dict) -> str:
    """
    Encode text, upsert the vector into Qdrant with attached metadata,
    and return the assigned point UUID.
    """
    client = get_qdrant_client()
    vector = generate_embedding(text)
    point_id = str(uuid.uuid4())

    client.upsert(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        points=[
            PointStruct(id=point_id, vector=vector, payload=metadata)
        ],
    )
    return point_id


def search_similar_resumes(
    query_text: str,
    job_id: int,
    top_k: int = 100,
) -> List[Dict]:
    """
    Embed the query text and run a filtered cosine-similarity search
    against all resume embeddings associated with the given job_id.

    Returns a list of dicts: {point_id, score, payload}.
    """
    client = get_qdrant_client()
    query_vector = generate_embedding(query_text)

    hits = client.search(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="job_id", match=MatchValue(value=job_id))]
        ),
        limit=top_k,
        with_payload=True,
    )

    return [
        {"point_id": str(hit.id), "score": hit.score, "payload": hit.payload}
        for hit in hits
    ]


def delete_embedding(point_id: str) -> None:
    """Remove a single point from the Qdrant collection."""
    client = get_qdrant_client()
    client.delete(
        collection_name=settings.QDRANT_COLLECTION_NAME,
        points_selector=[point_id],
    )
