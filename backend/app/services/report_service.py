import io
import logging
from typing import List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.job import Job
from app.models.resume import Resume

logger = logging.getLogger(__name__)

_BRAND_BLUE = colors.HexColor("#2563eb")
_LIGHT_BLUE = colors.HexColor("#eff6ff")
_DARK = colors.HexColor("#1e3a5f")
_GRAY = colors.HexColor("#d1d5db")
_ROW_ALT = colors.HexColor("#f0f7ff")


def generate_ranking_report(job: Job, ranked_resumes: List[Resume]) -> bytes:
    """
    Build a multi-section PDF ranking report using ReportLab.
    Returns the raw PDF bytes suitable for streaming to the client.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1.0 * inch,
        bottomMargin=1.0 * inch,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=_DARK,
        spaceAfter=8,
        alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=_BRAND_BLUE,
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=8,
        spaceAfter=3,
        leading=12,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=4,
    )

    elements = []

    # ── Title block ──────────────────────────────────────────────────────────
    elements.append(Paragraph("AI Candidate Ranking Report", title_style))
    elements.append(Paragraph(f"<b>Position:</b> {job.title}", meta_style))
    if job.location:
        elements.append(Paragraph(f"<b>Location:</b> {job.location}", meta_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=2, color=_BRAND_BLUE))
    elements.append(Spacer(1, 14))

    # ── Summary table ────────────────────────────────────────────────────────
    elements.append(Paragraph("Ranking Summary", section_style))

    table_data = [["Rank", "Candidate", "Email", "Score (%)", "AI Summary"]]
    for i, r in enumerate(ranked_resumes, 1):
        score_pct = f"{(r.similarity_score or 0) * 100:.1f}%"
        summary_text = (r.ai_summary or "—")[:130]
        if r.ai_summary and len(r.ai_summary) > 130:
            summary_text += "…"
        table_data.append([
            str(i),
            r.candidate_name or "Unknown",
            r.candidate_email or "—",
            score_pct,
            Paragraph(summary_text, body_style),
        ])

    col_w = [0.4 * inch, 1.4 * inch, 1.8 * inch, 0.7 * inch, 3.0 * inch]
    tbl = Table(table_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), _BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ROW_ALT]),
        ("GRID", (0, 0), (-1, -1), 0.4, _GRAY),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(tbl)

    # ── Detailed profiles for top 10 ─────────────────────────────────────────
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=1, color=_GRAY))
    elements.append(Paragraph("Detailed Candidate Profiles (Top 10)", section_style))

    for i, r in enumerate(ranked_resumes[:10], 1):
        score_pct = f"{(r.similarity_score or 0) * 100:.1f}%"
        elements.append(
            Paragraph(
                f"<b>#{i} — {r.candidate_name or 'Unknown'}</b> &nbsp;|&nbsp; "
                f"Match Score: <b>{score_pct}</b>",
                section_style,
            )
        )
        if r.candidate_email:
            elements.append(Paragraph(f"<b>Email:</b> {r.candidate_email}", body_style))
        if r.ai_summary:
            elements.append(Paragraph(f"<b>Summary:</b> {r.ai_summary}", body_style))
        if r.ai_strengths:
            elements.append(Paragraph(f"<b>Strengths:</b> {r.ai_strengths}", body_style))
        if r.ai_weaknesses:
            elements.append(Paragraph(f"<b>Weaknesses:</b> {r.ai_weaknesses}", body_style))
        if r.ai_match_explanation:
            elements.append(
                Paragraph(f"<b>Score Explanation:</b> {r.ai_match_explanation}", body_style)
            )
        elements.append(Spacer(1, 10))

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()
