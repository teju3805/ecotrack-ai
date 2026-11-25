"""Builds the fictional test documents and the answer key.

Every clause is invented for testing. It is not taken from any real regulation.
"""
import json
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FOREWORD = ("Foreword. This is a fictional document created only to test EcoTrack AI. The Riverton State "
            "Environment Board does not exist, and none of these clauses is a real legal requirement.")

V1 = [
    ("1", "Purpose and Scope", [
        ("1.1", "These guidelines apply to industrial units that discharge treated effluent into public sewers or surface water bodies within the Riverton region."),
        ("1.2", "These guidelines do not apply to domestic sewage from residential premises."),
    ]),
    ("2", "Definitions", [
        ("2.1", "“Operator” means the person or company that holds the consent to operate the unit."),
        ("2.2", "“Board” means the Riverton State Environment Board."),
        ("2.3", "“Monitoring period” means one calendar month."),
    ]),
    ("3", "Monitoring Requirements", [
        ("3.1", "Operators shall install a flow meter at the final outlet of the effluent treatment plant."),
        ("3.2", "Operators shall collect a composite effluent sample once every month."),
        ("3.3", "Samples shall be analysed by a laboratory recognised by the Board."),
        ("3.4", "Operators should calibrate the flow meter once every year."),
    ]),
    ("PB", None, None),
    ("4", "Reporting and Records", [
        ("4.1", "Operators shall submit monitoring data to the Board within 30 days of monitoring."),
        ("4.2", "Reports shall be submitted in the format given in Annexure A of these guidelines."),
        ("4.3", "Operators should maintain records of all discharges for three years."),
        ("4.4", "Operators may submit reports by post or by email."),
    ]),
    ("5", "Waste Handling", [
        ("5.1", "Sludge from the effluent treatment plant shall be stored in covered containers."),
        ("5.2", "Facilities may burn dry leaf waste on site with prior notice to the Board."),
        ("5.3", "Operators shall keep spill-control material near all chemical storage areas."),
    ]),
    ("PB", None, None),
    ("6", "Enforcement", [
        ("6.1", "The Board may inspect any unit without prior notice."),
        ("6.2", "Units found in violation shall be issued a notice to comply within 15 days."),
    ]),
]

V2 = [
    ("1", "Purpose and Scope", [
        ("1.1", "These guidelines apply to industrial units that discharge treated effluent into public sewers or surface water bodies within the Riverton region."),
        ("1.2", "These guidelines do not apply to domestic sewage from residential premises."),
    ]),
    ("2", "Definitions", [
        ("2.1", "“Operator” means the person or company that holds the consent to operate the unit."),
        ("2.2", "“Board” means the Riverton State Environment Board."),
        ("2.3", "“Monitoring period” means one calendar month."),
    ]),
    ("3", "Monitoring Requirements", [
        ("3.1", "Operators shall install a flow meter at the final outlet of the effluent treatment plant."),
        ("3.2", "Operators shall collect a composite effluent sample once every fortnight."),
        ("3.3", "Samples shall be analysed by a laboratory recognised by the Board."),
        ("3.4", "Operators shall calibrate the flow meter once every year."),
        ("3.5", "Operators shall keep spill-control material near all chemical storage areas."),
    ]),
    ("PB", None, None),
    ("4", "Reporting and Records", [
        ("4.1", "Operators shall submit monitoring data to the Board within 14 days of monitoring."),
        ("4.2", "Reports shall be submitted in the format given in Annexure A of these guidelines."),
        ("4.3", "Operators shall report any accidental discharge to the Board within 24 hours."),
        ("4.4", "Operators shall maintain records of all discharges for five years."),
        ("4.5", "Operators may submit reports by email or by post."),
    ]),
    ("5", "Waste Handling", [
        ("5.1", "Sludge from the effluent treatment plant shall be stored in covered containers."),
    ]),
    ("PB", None, None),
    ("6", "Enforcement", [
        ("6.1", "The Board may inspect any unit without prior notice."),
        ("6.2", "Units found in violation shall be issued a notice to comply within 7 days."),
    ]),
    ("7", "Public Disclosure", [
        ("7.1", "Operators shall publish an annual summary of monitoring results on a public register."),
    ]),
]

ANSWER_KEY = [
    {"type": "Modified", "old_section": "", "new_section": "", "note": "document version label 1.0 -> 2.0", "obligation_change": "none", "nature": "editorial"},
    {"type": "Modified", "old_section": "3.2", "new_section": "3.2", "note": "sampling frequency month -> fortnight", "obligation_change": "tightened"},
    {"type": "Modified", "old_section": "3.4", "new_section": "3.4", "note": "should -> shall (calibration)", "obligation_change": "new"},
    {"type": "Moved", "old_section": "5.3", "new_section": "3.5", "note": "spill-control clause moved, text unchanged", "obligation_change": "none"},
    {"type": "Modified", "old_section": "4.1", "new_section": "4.1", "note": "reporting deadline 30 -> 14 days", "obligation_change": "tightened"},
    {"type": "Added", "old_section": None, "new_section": "4.3", "note": "accidental discharge report within 24 hours", "obligation_change": "new"},
    {"type": "Modified", "old_section": "4.3", "new_section": "4.4", "note": "should -> shall, three -> five years, renumbered", "obligation_change": "new"},
    {"type": "Modified", "old_section": "4.4", "new_section": "4.5", "note": "editorial reorder, renumbered", "obligation_change": "none", "nature": "editorial"},
    {"type": "Removed", "old_section": "5.2", "new_section": None, "note": "leaf-burning permission removed", "obligation_change": "none"},
    {"type": "Modified", "old_section": "6.2", "new_section": "6.2", "note": "notice period 15 -> 7 days", "obligation_change": "tightened"},
    {"type": "Added", "old_section": None, "new_section": "7.1", "note": "public register disclosure", "obligation_change": "new"},
]


def build(spec, version, path):
    title = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=19, spaceAfter=4)
    sub = ParagraphStyle("s", fontName="Helvetica", fontSize=10, leading=13, spaceAfter=10)
    h = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=12, leading=15, spaceBefore=12, spaceAfter=6)
    body = ParagraphStyle("b", fontName="Helvetica", fontSize=11, leading=15, spaceAfter=8, leftIndent=28, firstLineIndent=-28)
    note = ParagraphStyle("n", fontName="Helvetica-Oblique", fontSize=9.5, leading=13, spaceAfter=10)

    story = [Paragraph("Riverton Guidelines on Effluent Monitoring and Reporting", title),
             Paragraph(f"Version {version} · Riverton State Environment Board (fictional)", sub),
             Paragraph(FOREWORD, note)]
    for num, heading, clauses in spec:
        if num == "PB":
            story.append(PageBreak())
            continue
        story.append(Paragraph(f"{num} {heading}", h))
        for cnum, text in clauses:
            story.append(Paragraph(f"{cnum}&nbsp;&nbsp;{text}", body))
        story.append(Spacer(1, 4))

    def page(canv, doc):
        canv.saveState()
        canv.setFont("Helvetica", 8)
        canv.drawString(56, A4[1] - 34, f"FICTIONAL TEST DOCUMENT — Riverton Effluent Guidelines, version {version}")
        canv.drawRightString(A4[0] - 56, 28, f"Page {doc.page}")
        canv.restoreState()

    SimpleDocTemplate(path, pagesize=A4, leftMargin=56, rightMargin=56, topMargin=70, bottomMargin=60,
                      title=f"Riverton Effluent Guidelines v{version} (fictional)").build(story, onFirstPage=page, onLaterPages=page)


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "public", "samples"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    build(V1, "1.0", os.path.join(ROOT, "public", "samples", "riverton_guidelines_v1.pdf"))
    build(V2, "2.0", os.path.join(ROOT, "public", "samples", "riverton_guidelines_v2.pdf"))
    with open(os.path.join(ROOT, "data", "answer_key.json"), "w") as f:
        json.dump({"old": "riverton_guidelines_v1.pdf", "new": "riverton_guidelines_v2.pdf", "changes": ANSWER_KEY}, f, indent=2)
    print("Wrote sample PDFs and data/answer_key.json")
