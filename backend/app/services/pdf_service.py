import re
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple

import fitz  # PyMuPDF

from app.core.config import settings

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract all text content from a PDF file using PyMuPDF.
    Returns concatenated text from all pages.
    """
    try:
        doc = fitz.open(file_path)
        pages_text = [page.get_text() for page in doc]
        doc.close()
        return "\n".join(pages_text).strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed for {file_path}: {e}")
        return ""


def extract_candidate_info(
    text: str,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Heuristically extract candidate name, email, and phone number from
    resume plain text. Accuracy depends on resume formatting.
    """
    # Email: standard RFC 5322-ish pattern
    email_match = re.search(
        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", text
    )
    email = email_match.group(0) if email_match else None

    # Phone: various formats (+1 555-555-5555, (555) 555-5555, etc.)
    phone_match = re.search(
        r"(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}", text
    )
    phone = phone_match.group(0).strip() if phone_match else None

    # Name: heuristic — look at first 5 non-empty lines for a 2–4 word name
    name = None
    for line in (l.strip() for l in text.splitlines() if l.strip()):
        words = line.split()
        if 2 <= len(words) <= 4 and all(
            w.replace("-", "").replace(".", "").isalpha() for w in words
        ):
            name = line
            break

    return name, email, phone


async def save_upload_file(
    file_content: bytes, original_filename: str
) -> Tuple[str, str]:
    """
    Persist uploaded bytes to the uploads directory with a UUID prefix
    to avoid filename collisions.
    Returns (absolute_file_path, unique_filename).
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = upload_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(file_content)

    return str(file_path), unique_name
