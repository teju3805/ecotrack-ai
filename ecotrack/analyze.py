import logging
import re
from difflib import SequenceMatcher

from . import config, llm
from .obligations import RANK, modal_word
from .stakeholders import STAKEHOLDERS, clean, guess

log = logging.getLogger("ecotrack")

NUM_WORDS = {w: str(i) for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen "
    "sixteen seventeen eighteen nineteen twenty".split())}
NUM_WORDS.update({"thirty": "30", "forty": "40", "fifty": "50", "sixty": "60", "ninety": "90", "hundred": "100"})
OBLIGATION_CHANGES = {"new", "tightened", "relaxed", "removed", "none", "changed"}


def _words(t):
    return re.findall(r"\d+(?:\.\d+)*|[\w’'-]+", t)


def _expected_change(it):
    o, n = it.get("old"), it.get("new")
    ro = RANK[o["obligation_type"]] if o else 0
    rn = RANK[n["obligation_type"]] if n else 0
    return ro, rn


def rules(it):
    """Deterministic explanation used when Gemini is not configured or fails."""
    o, n, kind = it.get("old"), it.get("new"), it["change_type"]
    ro, rn = _expected_change(it)
    nature, parts = "substantive", []
    if kind == "Moved":
        nature = "editorial"
        parts.append(f"Text unchanged; moved from section {o['section'] or '-'} to section {n['section'] or '-'}.")
        oc = "none"
    elif kind == "Added":
        parts.append(f"New clause added{' in section ' + n['section'] if n['section'] else ''}.")
        mw = modal_word(n["text"])
        if rn == 2 and mw:
            parts.append(f"It uses “{mw}”, so it creates a new obligation.")
        oc = "new" if rn == 2 else "none"
    elif kind == "Removed":
        parts.append(f"The clause from section {o['section'] or '-'} no longer appears in the new version.")
        if ro == 2:
            parts.append("The duty it stated is no longer stated.")
        oc = "removed" if ro == 2 else "none"
    else:
        ow, nw = _words(o["text"]), _words(n["text"])
        if sorted(w.lower() for w in ow) == sorted(w.lower() for w in nw):
            nature = "editorial"
            parts.append("Same words in a different order; the meaning appears unchanged.")
        else:
            om, nm = modal_word(o["text"]), modal_word(n["text"])
            if om and nm and om != nm:
                parts.append(f"Wording changed from “{om}” to “{nm}”")
            sm = SequenceMatcher(None, [w.lower() for w in ow], [w.lower() for w in nw], autojunk=False)
            edits = 0
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == "equal" or edits >= 3:
                    continue
                a, b = " ".join(ow[i1:i2]), " ".join(nw[j1:j2])
                if {a.lower(), b.lower()} <= {om or "", nm or ""}:
                    continue
                edits += 1
                if tag == "replace":
                    parts.append(f"“{a}” changed to “{b}”")
                elif tag == "delete":
                    parts.append(f"removed “{a}”")
                else:
                    parts.append(f"added “{b}”")
            parts = ["; ".join(parts) + "."] if parts else ["Minor wording change."]
        if it.get("relocated"):
            parts.append(f"Also moved from section {o['section'] or '-'} to {n['section'] or '-'}.")
        if rn > ro:
            oc = "new"
        elif rn < ro:
            oc = "removed" if rn == 0 else "relaxed"
        elif rn == 2 and nature == "substantive":
            oc = "changed"
        else:
            oc = "none"
    text = " ".join(p for p in [o and o["text"], n and n["text"]] if p)
    return {
        "pair_id": it["item_id"],
        "nature": nature,
        "explanation": " ".join(parts),
        "stakeholders": guess(text),
        "obligation_change": oc,
        "evidence_ids": [p["id"] for p in (o, n) if p],
    }


def _num_ok(token, source):
    s = source.lower()
    if token.lower() in NUM_WORDS:
        return token.lower() in s or re.search(rf"\b{NUM_WORDS[token.lower()]}\b", s) is not None
    if re.search(rf"(?<![\d.]){re.escape(token)}(?![\d])", s):
        return True
    words = [w for w, d in NUM_WORDS.items() if d == token]
    return any(re.search(rf"\b{w}\b", s) for w in words)


def verify(row, it, ai, source):
    reasons = list(it.get("flags", []))
    allowed_ids = {p["id"] for p in (it.get("old"), it.get("new")) if p}
    bad_ids = [i for i in ai.get("evidence_ids", []) if i not in allowed_ids]
    if bad_ids:
        reasons.append(f"Explanation cites IDs that are not part of this change: {', '.join(bad_ids)}")

    src = " ".join(t for t in (row["old_text"], row["new_text"]) if t)
    extra = " ".join(str(x) for x in (row["old_section"], row["new_section"], row["old_page"], row["new_page"]) if x)
    expl = row["explanation"]
    quotes = re.findall(r"[“\"]([^”\"]{2,})[”\"]", expl) + re.findall(r"(?<![A-Za-z])'([^']{2,60})'(?![A-Za-z])", expl)
    for q in quotes:
        if q.lower() not in src.lower():
            reasons.append(f"Quoted phrase “{q}” is not in the source text")
    for tok in re.findall(r"\b\d+(?:\.\d+)?\b", expl) + [w for w in re.findall(r"[A-Za-z]+", expl) if w.lower() in NUM_WORDS]:
        if not _num_ok(tok, src + " " + extra):
            reasons.append(f"Number “{tok}” in the explanation does not appear in the source")

    ro, rn = _expected_change(it)
    oc = row["obligation_change"]
    if oc in ("new", "tightened") and rn < ro:
        reasons.append("AI says the obligation got stronger, but the wording moved from binding to non-binding")
    if oc in ("relaxed", "removed") and rn > ro:
        reasons.append("AI says the obligation got weaker, but the wording moved from non-binding to binding")
    if rn > ro and oc == "none":
        reasons.append("Wording became binding (e.g. should → shall) but the AI reported no obligation change")
    if row["dropped_stakeholders"]:
        reasons.append("AI suggested stakeholder groups outside the fixed list: " + ", ".join(row["dropped_stakeholders"]))

    seen, uniq = set(), []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            uniq.append(r)
    row["review_reasons"] = uniq
    row["review_flag"] = bool(uniq)
    return row


def build_row(it, ai, source):
    o, n = it.get("old"), it.get("new")
    groups, dropped = clean(ai.get("stakeholders"))
    oc = str(ai.get("obligation_change", "none")).lower()
    return {
        "item_id": it["item_id"],
        "change_type": it["change_type"],
        "relocated": it.get("relocated", False),
        "nature": ai.get("nature", "substantive"),
        "old_id": o["id"] if o else None, "old_page": o["page"] if o else None,
        "old_section": o["section"] if o else None, "old_text": o["text"] if o else None,
        "old_obligation_type": o["obligation_type"] if o else None,
        "new_id": n["id"] if n else None, "new_page": n["page"] if n else None,
        "new_section": n["section"] if n else None, "new_text": n["text"] if n else None,
        "new_obligation_type": n["obligation_type"] if n else None,
        "explanation": str(ai.get("explanation", "")).strip(),
        "explanation_source": source,
        "stakeholders": groups or guess(" ".join(p["text"] for p in (o, n) if p)),
        "dropped_stakeholders": dropped,
        "obligation_change": oc if oc in OBLIGATION_CHANGES else "none",
        "evidence_ids": ai.get("evidence_ids", []),
        "similarity": it.get("similarity"),
    }


def analyze(items):
    results, source, note = {}, "rules", None
    if config.api_key() and items:
        try:
            results = llm.explain(items)
            source = "gemini"
        except Exception as e:
            log.warning("Gemini analysis failed, using rule-based explanations: %s", e)
            note = f"Gemini call failed ({type(e).__name__}); rule-based explanations used for this batch."
    rows = []
    for it in items:
        ai = results.get(it["item_id"])
        src = "gemini" if ai else "rules"
        if not ai:
            ai = rules(it)
        rows.append(verify(build_row(it, ai, src), it, ai, src))
    return {"rows": rows, "ai_source": source, "note": note}


def summarize(rows):
    groups = {s: {"stakeholder": s, "changes": 0, "obligation_increases": 0, "items": []} for s in STAKEHOLDERS}
    for r in rows:
        for s in r["stakeholders"]:
            g = groups[s]
            g["changes"] += 1
            if r["obligation_change"] in ("new", "tightened"):
                g["obligation_increases"] += 1
            g["items"].append(r["item_id"])
    return [g for g in groups.values() if g["changes"]]
