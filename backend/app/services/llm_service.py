import logging
from typing import Dict

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Structured prompt that guides the LLM to produce parseable output
_ANALYSIS_PROMPT = """\
You are an expert HR professional and talent acquisition specialist.

Job Title: {job_title}

Job Description:
{job_description}

Job Requirements:
{requirements}

Candidate Resume:
{resume_text}

Semantic Similarity Score (0.0 – 1.0): {score:.2f}

Analyze this candidate against the job and respond EXACTLY in this format (one line each):

SUMMARY: <2-3 sentence professional summary of the candidate>
STRENGTHS: <strength 1> | <strength 2> | <strength 3>
WEAKNESSES: <weakness 1> | <weakness 2>
EXPLANATION: <1-2 sentences explaining the {score:.2f} similarity score>
"""


async def generate_candidate_analysis(
    job_title: str,
    job_description: str,
    requirements: str,
    resume_text: str,
    similarity_score: float,
) -> Dict[str, str]:
    """
    Call Ollama to generate a structured candidate analysis.
    Falls back to a generic response if the LLM is unreachable or times out.
    """
    prompt = _ANALYSIS_PROMPT.format(
        job_title=job_title,
        job_description=job_description[:1500],
        requirements=(requirements or "Not specified")[:500],
        resume_text=resume_text[:2000],
        score=similarity_score,
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 512},
                },
            )
            resp.raise_for_status()
            raw = resp.json().get("response", "")
            return _parse_response(raw)

    except httpx.TimeoutException:
        logger.warning("Ollama LLM request timed out — using fallback analysis")
        return _fallback(similarity_score)
    except Exception as e:
        logger.error(f"Ollama LLM call failed: {e}")
        return _fallback(similarity_score)


def _parse_response(raw: str) -> Dict[str, str]:
    """Parse structured LLM output into a dict."""
    result = {
        "summary": "",
        "strengths": "",
        "weaknesses": "",
        "match_explanation": "",
    }
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("SUMMARY:"):
            result["summary"] = line[len("SUMMARY:"):].strip()
        elif line.startswith("STRENGTHS:"):
            result["strengths"] = line[len("STRENGTHS:"):].strip()
        elif line.startswith("WEAKNESSES:"):
            result["weaknesses"] = line[len("WEAKNESSES:"):].strip()
        elif line.startswith("EXPLANATION:"):
            result["match_explanation"] = line[len("EXPLANATION:"):].strip()

    # Graceful fallback if parsing finds nothing useful
    if not any(result.values()) and raw:
        result["summary"] = raw[:400]

    return result


def _fallback(score: float) -> Dict[str, str]:
    """Return a generic analysis when the LLM is unavailable."""
    pct = int(score * 100)
    return {
        "summary": (
            "AI analysis is temporarily unavailable. "
            "Please review this candidate's resume manually."
        ),
        "strengths": "Manual review required",
        "weaknesses": "Manual review required",
        "match_explanation": (
            f"Embedding-based semantic similarity score: {pct}%. "
            "AI narrative explanation unavailable."
        ),
    }
