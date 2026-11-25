import re

PATTERNS = [
    ("prohibition", r"\b(shall not|must not|may not|is prohibited|are prohibited|no person shall)\b"),
    ("obligation", r"\b(shall|must|is required to|are required to|is mandatory|are mandatory)\b"),
    ("recommendation", r"\b(should|is recommended|are recommended|is encouraged|are encouraged)\b"),
    ("permission", r"\b(may|is permitted|are permitted|is allowed|are allowed)\b"),
]
RANK = {"none": 0, "permission": 0, "recommendation": 1, "obligation": 2, "prohibition": 2}


def classify(text):
    t = text.lower()
    for label, pat in PATTERNS:
        if re.search(pat, t):
            return label
    return "none"


def modal_word(text):
    m = re.search(r"\b(shall not|must not|may not|shall|must|should|may)\b", text.lower())
    return m.group(1) if m else None
