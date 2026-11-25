"""Checks that verification catches bad AI output and that the app degrades safely.

Usage:  python scripts/test_pipeline.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from ecotrack import analyze as A  # noqa: E402
from ecotrack import llm  # noqa: E402
from ecotrack.compare import compare  # noqa: E402
from ecotrack.extract import ExtractError, extract  # noqa: E402

OLD = {"id": "OLD-p02-03", "page": 2, "section": "4.3", "heading": "", "position": 5,
       "text": "Operators should maintain records of all discharges for three years.", "obligation_type": "recommendation"}
NEW = {"id": "NEW-p02-04", "page": 2, "section": "4.4", "heading": "", "position": 6,
       "text": "Operators shall maintain records of all discharges for five years.", "obligation_type": "obligation"}
ITEM = {"item_id": "CHG-001", "change_type": "Modified", "old": OLD, "new": NEW, "similarity": 0.9,
        "relocated": True, "flags": []}

CASES = [
    ("good output passes", {"explanation": "Record keeping becomes mandatory and rises from three to five years.",
                            "obligation_change": "new", "evidence_ids": [OLD["id"], NEW["id"]],
                            "stakeholders": ["Facility operators / industry"]}, False, None),
    ("hallucinated number", {"explanation": "Records must now be kept for seven years.", "obligation_change": "new",
                             "evidence_ids": [NEW["id"]], "stakeholders": ["Facility operators / industry"]}, True, "Number"),
    ("misquote", {"explanation": "The clause now says “must keep records”.", "obligation_change": "new",
                  "evidence_ids": [NEW["id"]], "stakeholders": ["Workers"]}, True, "Quoted phrase"),
    ("wrong direction", {"explanation": "The requirement is relaxed.", "obligation_change": "relaxed",
                         "evidence_ids": [NEW["id"]], "stakeholders": ["Workers"]}, True, "weaker"),
    ("missed obligation change", {"explanation": "Minor wording update.", "obligation_change": "none",
                                  "evidence_ids": [NEW["id"]], "stakeholders": ["Workers"]}, True, "binding"),
    ("invented evidence ID", {"explanation": "Record keeping changes.", "obligation_change": "new",
                              "evidence_ids": ["NEW-p09-99"], "stakeholders": ["Workers"]}, True, "IDs"),
    ("invented stakeholder", {"explanation": "Record keeping changes.", "obligation_change": "new",
                              "evidence_ids": [NEW["id"]], "stakeholders": ["Shareholders"]}, True, "outside the fixed list"),
]


def run_cases():
    ok = True
    for name, ai, want_flag, reason_part in CASES:
        ai = dict(ai, pair_id="CHG-001", nature="substantive")
        row = A.verify(A.build_row(ITEM, ai, "gemini"), ITEM, ai, "gemini")
        quote_exact = row["old_text"] == OLD["text"] and row["new_text"] == NEW["text"]
        hit = row["review_flag"] == want_flag and (reason_part is None or any(reason_part in r for r in row["review_reasons"]))
        ok &= hit and quote_exact
        print(f"{'PASS' if hit and quote_exact else 'FAIL'}  {name:<26} flag={row['review_flag']}  {row['review_reasons'][:1]}")
    return ok


def run_gemini_path():
    orig = llm.explain
    llm.explain = lambda items: {it["item_id"]: {"pair_id": it["item_id"], "nature": "substantive",
                                                 "explanation": "Record keeping becomes mandatory.",
                                                 "stakeholders": ["Facility operators / industry"],
                                                 "obligation_change": "new",
                                                 "evidence_ids": [OLD["id"], NEW["id"]]} for it in items}
    os.environ["GEMINI_API_KEY"] = "test-key"
    try:
        res = A.analyze([ITEM])
    finally:
        llm.explain = orig
    r = res["rows"][0]
    good = res["ai_source"] == "gemini" and r["explanation_source"] == "gemini" and not r["review_flag"]
    print(f"{'PASS' if good else 'FAIL'}  mocked Gemini response is used and verified")
    return good


def run_fallback():
    os.environ["GEMINI_API_KEY"] = "invalid-key-for-test"
    sdir = os.path.join(ROOT, "public", "samples")
    old = extract(open(os.path.join(sdir, "riverton_guidelines_v1.pdf"), "rb").read(), "old")
    new = extract(open(os.path.join(sdir, "riverton_guidelines_v2.pdf"), "rb").read(), "new")
    cmp = compare(old["paragraphs"], new["paragraphs"])
    res = A.analyze(cmp["items"][:3])
    good = cmp["embedding_mode"] == "local" and res["ai_source"] == "rules" and res["note"]
    print(f"{'PASS' if good else 'FAIL'}  Gemini unreachable -> falls back to local embeddings and rules ({res['note']})")
    del os.environ["GEMINI_API_KEY"]
    return bool(good)


def run_bad_pdf():
    try:
        extract(b"not a pdf", "old")
    except ExtractError as e:
        print(f"PASS  non-PDF input rejected: {e}")
        return True
    print("FAIL  non-PDF input accepted")
    return False


def run_prompt():
    p = llm.build_prompt([ITEM])
    good = OLD["id"] in p and NEW["id"] in p and "STAKEHOLDER_LIST" in p and "Do not use outside knowledge" in p
    print(f"{'PASS' if good else 'FAIL'}  prompt contains IDs, stakeholder list and grounding rule")
    return good


if __name__ == "__main__":
    import logging
    logging.disable(logging.WARNING)
    results = [run_cases(), run_gemini_path(), run_fallback(), run_bad_pdf(), run_prompt()]
    print("\nALL PASSED" if all(results) else "\nSOME TESTS FAILED")
    sys.exit(0 if all(results) else 1)
