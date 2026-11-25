"""Runs the full pipeline on the sample documents and scores it against data/answer_key.json.

Usage:  python scripts/evaluate.py            (uses GEMINI_API_KEY if set, otherwise offline mode)
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from ecotrack import config  # noqa: E402
from ecotrack.analyze import analyze, summarize  # noqa: E402
from ecotrack.compare import compare  # noqa: E402
from ecotrack.extract import extract  # noqa: E402
from ecotrack.report import build_report  # noqa: E402


def main():
    key = json.load(open(os.path.join(ROOT, "data", "answer_key.json")))
    sdir = os.path.join(ROOT, "public", "samples")
    t0 = time.time()
    old_raw = open(os.path.join(sdir, key["old"]), "rb").read()
    new_raw = open(os.path.join(sdir, key["new"]), "rb").read()
    old, new = extract(old_raw, "old"), extract(new_raw, "new")
    cmp = compare(old["paragraphs"], new["paragraphs"])
    rows, sources = [], set()
    items = cmp["items"]
    for i in range(0, len(items), config.BATCH_SIZE):
        res = analyze(items[i:i + config.BATCH_SIZE])
        rows += res["rows"]
        sources.add(res["ai_source"])
    elapsed = time.time() - t0

    old_text = {p["id"]: p["text"] for p in old["paragraphs"]}
    new_text = {p["id"]: p["text"] for p in new["paragraphs"]}
    old_full = " ".join(old_text.values())
    new_full = " ".join(new_text.values())

    expected = {(c["old_section"], c["new_section"]): c for c in key["changes"]}
    found = {(r["old_section"], r["new_section"]): r for r in rows}
    tp = [k for k in expected if k in found]
    fn = [k for k in expected if k not in found]
    fp = [k for k in found if k not in expected]
    type_ok = [k for k in tp if found[k]["change_type"] == expected[k]["type"]]
    quotes = [(r["old_text"], old_full) for r in rows if r["old_text"]] + [(r["new_text"], new_full) for r in rows if r["new_text"]]
    exact = sum(1 for q, full in quotes if q in full)

    print(f"Paragraphs: old {len(old['paragraphs'])}, new {len(new['paragraphs'])}; "
          f"noise blocks removed: {old['noise_blocks_removed']} + {new['noise_blocks_removed']}")
    print(f"Unchanged paragraphs: {cmp['unchanged_count']}; embedding mode: {cmp['embedding_mode']}; "
          f"thresholds: {cmp['thresholds']}; explanation source: {', '.join(sorted(sources))}")
    print(f"Elapsed: {elapsed:.2f} s\n")
    for r in rows:
        tag = "OK " if (r["old_section"], r["new_section"]) in expected else "FP "
        flag = "  [REVIEW: " + "; ".join(r["review_reasons"]) + "]" if r["review_flag"] else ""
        sim = f" sim={r['similarity']}" if r["similarity"] is not None else ""
        print(f"{tag}{r['item_id']} {r['change_type']:<8} {str(r['old_section']):>4} -> {str(r['new_section']):<4}{sim} "
              f"| {r['obligation_change']:<9} | {r['explanation']}{flag}")
    print()
    n_exp, n_found = len(expected), len(found)
    metrics = {
        "change_recall": round(len(tp) / n_exp, 3) if n_exp else None,
        "change_precision": round(len(tp) / n_found, 3) if n_found else None,
        "change_type_accuracy": round(len(type_ok) / len(tp), 3) if tp else None,
        "quote_exactness": round(exact / len(quotes), 3) if quotes else None,
        "rows_flagged_for_review": sum(1 for r in rows if r["review_flag"]),
        "elapsed_seconds": round(elapsed, 2),
        "embedding_mode": cmp["embedding_mode"],
        "explanation_source": sorted(sources),
    }
    for k, v in metrics.items():
        print(f"{k:<26} {v}")
    if fn:
        print("Missed:", fn)
    if fp:
        print("Unexpected:", fp)

    out = os.path.join(ROOT, "data", "sample_run.json")
    json.dump({"metrics": metrics, "rows": rows, "stakeholder_summary": summarize(rows)}, open(out, "w"), indent=2, ensure_ascii=False)
    with open(os.path.join(ROOT, "data", "sample_report.pdf"), "wb") as f:
        f.write(build_report(rows, {"old_name": key["old"], "new_name": key["new"], "ai_mode": ", ".join(sorted(sources))}))
    print(f"\nSaved {out} and data/sample_report.pdf")


if __name__ == "__main__":
    main()
