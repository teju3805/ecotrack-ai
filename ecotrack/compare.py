import re
from difflib import SequenceMatcher

import numpy as np

from . import config
from .embeddings import embed


def _norm(t):
    return re.sub(r"\s+", " ", t.lower()).strip()


def _item(kind, old=None, new=None, similarity=None, flags=None, alternatives=None):
    relocated = bool(old and new and old["section"] != new["section"])
    return {
        "change_type": kind,
        "old": old,
        "new": new,
        "similarity": None if similarity is None else round(float(similarity), 3),
        "relocated": relocated,
        "flags": flags or [],
        "alternatives": alternatives or [],
    }


def compare(old, new):
    a = [_norm(p["text"]) for p in old]
    b = [_norm(p["text"]) for p in new]
    sm = SequenceMatcher(None, a, b, autojunk=False)
    unchanged, c_old, c_new = 0, [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            unchanged += i2 - i1
        else:
            c_old += old[i1:i2]
            c_new += new[j1:j2]

    items, used_old = [], set()
    by_text = {}
    for o in c_old:
        by_text.setdefault(_norm(o["text"]), []).append(o)
    rest_new = []
    for n in c_new:
        match = next((o for o in by_text.get(_norm(n["text"]), []) if o["id"] not in used_old), None)
        if match:
            used_old.add(match["id"])
            items.append(_item("Moved", match, n, 1.0))
        else:
            rest_new.append(n)
    rest_old = [o for o in c_old if o["id"] not in used_old]

    mode = "none"
    t_high, t_low, delta = config.thresholds("local")
    used_n, used_o = set(), set()
    if rest_new and rest_old:
        vecs, mode = embed([p["text"] for p in rest_old] + [p["text"] for p in rest_new])
        e_old, e_new = vecs[:len(rest_old)], vecs[len(rest_old):]
        sim = e_new @ e_old.T
        t_high, t_low, delta = config.thresholds(mode)
        cands = sorted(((sim[i, j], i, j) for i in range(len(rest_new)) for j in range(len(rest_old)) if sim[i, j] >= t_low),
                       reverse=True)
        for s, i, j in cands:
            if i in used_n or j in used_o:
                continue
            used_n.add(i)
            used_o.add(j)
            order = np.argsort(-sim[i])
            s2 = float(sim[i, order[1]]) if len(order) > 1 else 0.0
            flags = []
            if s < t_high:
                flags.append(f"Similarity {s:.2f} is below the confident-match threshold {t_high:.2f}")
            if s - s2 < delta:
                flags.append(f"Ambiguous match: second-best candidate scores {s2:.2f}")
            alts = [{"id": rest_old[k]["id"], "score": round(float(sim[i, k]), 3)} for k in order[:3]]
            items.append(_item("Modified", rest_old[j], rest_new[i], s, flags, alts))

    items += [_item("Added", new=n) for i, n in enumerate(rest_new) if i not in used_n]
    items += [_item("Removed", old=o) for j, o in enumerate(rest_old) if j not in used_o]

    def sort_key(it):
        p = it["new"] or it["old"]
        return (it["new"] is None, p["position"])
    items.sort(key=sort_key)
    for k, it in enumerate(items, start=1):
        it["item_id"] = f"CHG-{k:03d}"

    return {
        "items": items,
        "unchanged_count": unchanged,
        "embedding_mode": mode,
        "thresholds": {"high": t_high, "low": t_low, "delta": delta},
    }
