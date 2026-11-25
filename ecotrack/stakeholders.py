import re

STAKEHOLDERS = [
    "Regulators and enforcement agencies",
    "Facility operators / industry",
    "Small businesses (MSMEs)",
    "Local bodies",
    "Consultants, auditors and labs",
    "Workers",
    "Communities and the public",
    "NGOs and civil society",
]

KEYWORDS = [
    (r"\b(board|inspect\w*|authorit\w*|regulator\w*|enforce\w*|notice to comply)\b", "Regulators and enforcement agencies"),
    (r"\b(operator\w*|unit\w*|facilit\w*|industr\w*|plant\w*|occupier\w*)\b", "Facility operators / industry"),
    (r"\b(small|msme\w*|micro)\b", "Small businesses (MSMEs)"),
    (r"\b(municipal\w*|panchayat\w*|local bod\w*|sewer\w*)\b", "Local bodies"),
    (r"\b(laborator\w*|lab|labs|audit\w*|consultant\w*|sampl\w*|analys\w*|calibrat\w*)\b", "Consultants, auditors and labs"),
    (r"\b(worker\w*|staff|employee\w*|personnel)\b", "Workers"),
    (r"\b(public|register|communit\w*|resident\w*|disclos\w*|publish\w*)\b", "Communities and the public"),
    (r"\b(ngo\w*|civil society)\b", "NGOs and civil society"),
]


def guess(text):
    t = text.lower()
    found = [g for pat, g in KEYWORDS if re.search(pat, t)]
    return found or ["Facility operators / industry"]


def clean(groups):
    allowed = {s.lower(): s for s in STAKEHOLDERS}
    out, dropped = [], []
    for g in groups or []:
        key = str(g).strip().lower()
        if key in allowed and allowed[key] not in out:
            out.append(allowed[key])
        elif key not in allowed:
            dropped.append(str(g))
    return out, dropped
