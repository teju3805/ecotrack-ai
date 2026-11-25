import io
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.fonts import addMapping
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .analyze import summarize

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
_fonts_ready = False


def _fonts():
    global _fonts_ready
    if _fonts_ready:
        return
    pdfmetrics.registerFont(TTFont("DV", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DV-B", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("DV-I", os.path.join(FONT_DIR, "DejaVuSans-Oblique.ttf")))
    addMapping("DV", 0, 0, "DV")
    addMapping("DV", 1, 0, "DV-B")
    addMapping("DV", 0, 1, "DV-I")
    addMapping("DV", 1, 1, "DV-B")
    _fonts_ready = True


INK, GREY, LIGHT, RULE = colors.HexColor("#1A1A1A"), colors.HexColor("#555555"), colors.HexColor("#F2F2F0"), colors.HexColor("#C8C8C4")


def _styles():
    return {
        "title": ParagraphStyle("t", fontName="DV-B", fontSize=17, leading=22, textColor=INK, spaceAfter=4),
        "meta": ParagraphStyle("m", fontName="DV", fontSize=8.5, leading=12, textColor=GREY, spaceAfter=10),
        "h": ParagraphStyle("h", fontName="DV-B", fontSize=12, leading=16, textColor=INK, spaceBefore=10, spaceAfter=6),
        "body": ParagraphStyle("b", fontName="DV", fontSize=9, leading=12.5, textColor=INK),
        "label": ParagraphStyle("l", fontName="DV-B", fontSize=7.5, leading=10, textColor=GREY),
        "quote": ParagraphStyle("q", fontName="DV", fontSize=9, leading=12.5, textColor=INK),
        "ai": ParagraphStyle("a", fontName="DV-I", fontSize=9, leading=12.5, textColor=INK),
        "flag": ParagraphStyle("f", fontName="DV-B", fontSize=8.5, leading=11.5, textColor=colors.HexColor("#8A3B00")),
        "cell": ParagraphStyle("c", fontName="DV", fontSize=8.5, leading=11, textColor=INK),
        "cellb": ParagraphStyle("cb", fontName="DV-B", fontSize=8.5, leading=11, textColor=colors.white),
    }


def _loc(page, section):
    if page is None:
        return "—"
    return f"p.{page}" + (f", §{section}" if section else "")


def build_report(rows, meta=None):
    _fonts()
    meta = meta or {}
    st = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=42, rightMargin=42, topMargin=42, bottomMargin=42,
                            title="EcoTrack AI change log")
    story = [Paragraph("EcoTrack AI — Change log", st["title"])]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(escape(f"Old: {meta.get('old_name', 'old version')} · New: {meta.get('new_name', 'new version')} · "
                                  f"Generated {stamp} · Explanations: {meta.get('ai_mode', 'unknown')}"), st["meta"]))
    counts = {}
    for r in rows:
        counts[r["change_type"]] = counts.get(r["change_type"], 0) + 1
    flagged = sum(1 for r in rows if r.get("review_flag"))
    story.append(Paragraph(escape(", ".join(f"{k}: {v}" for k, v in sorted(counts.items())) +
                                  f" · Needs review: {flagged}"), st["body"]))
    story.append(Paragraph("Quoted text is copied exactly from the extracted PDF text. Text under “AI explanation” is "
                           "machine-generated and should be checked by a person.", st["meta"]))

    summ = summarize(rows)
    if summ:
        story.append(Paragraph("Stakeholder summary", st["h"]))
        data = [[Paragraph(h, st["cellb"]) for h in ("Stakeholder group", "Changes", "New or tighter obligations", "Change IDs")]]
        for g in summ:
            data.append([Paragraph(escape(g["stakeholder"]), st["cell"]), Paragraph(str(g["changes"]), st["cell"]),
                         Paragraph(str(g["obligation_increases"]), st["cell"]), Paragraph(escape(", ".join(g["items"])), st["cell"])])
        t = Table(data, colWidths=[170, 55, 95, 191], repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), INK), ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
                               ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(t)

    story.append(Paragraph("Changes", st["h"]))
    for r in rows:
        head = f"{r['item_id']} · {r['change_type']}"
        if r.get("relocated"):
            head += " (relocated)"
        if r.get("nature") == "editorial":
            head += " · editorial"
        head += f" · {_loc(r.get('old_page'), r.get('old_section'))} → {_loc(r.get('new_page'), r.get('new_section'))}"
        block = [Paragraph(escape(head), st["h"])]
        for side, label in (("old", "SOURCE TEXT — OLD VERSION (exact)"), ("new", "SOURCE TEXT — NEW VERSION (exact)")):
            txt = r.get(f"{side}_text")
            if txt:
                q = Table([[Paragraph(label, st["label"])], [Paragraph(escape(txt), st["quote"])]], colWidths=[511])
                q.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, INK), ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                                       ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 3),
                                       ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
                block += [q, Spacer(1, 4)]
        src = "Gemini" if r.get("explanation_source") == "gemini" else "rule-based, offline"
        block.append(Paragraph(f"AI EXPLANATION ({src})", st["label"]))
        block.append(Paragraph(escape(r.get("explanation", "")), st["ai"]))
        block.append(Paragraph(escape("Stakeholders: " + ", ".join(r.get("stakeholders", [])) +
                                      f" · Obligation change: {r.get('obligation_change', 'none')}"), st["meta"]))
        if r.get("review_flag"):
            block.append(Paragraph(escape("NEEDS REVIEW: " + "; ".join(r.get("review_reasons", []))), st["flag"]))
        story.append(KeepTogether(block))
        story.append(Spacer(1, 6))

    def footer(canv, d):
        canv.saveState()
        canv.setFont("DV", 7.5)
        canv.setFillColor(GREY)
        canv.drawString(42, 24, "EcoTrack AI prototype · not legal advice")
        canv.drawRightString(A4[0] - 42, 24, str(d.page))
        canv.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
