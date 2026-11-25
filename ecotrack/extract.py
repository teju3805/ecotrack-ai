import re
from collections import Counter

import pymupdf

from .obligations import classify

SECTION_RE = re.compile(r"^(\d+(?:\.\d+)*)\.?\s+(.+)$", re.S)
PAGE_NUM_RE = re.compile(r"^(page\s*)?#(\s*(of|/)\s*#)?$")
MARGIN = 0.08


class ExtractError(ValueError):
    pass


def _norm_repeat(t):
    return re.sub(r"\d+", "#", re.sub(r"\s+", " ", t.strip().lower()))


def _join_lines(raw, vocab):
    """Join the lines of one text block. Only layout noise is changed; words are not."""
    out = ""
    for line in (l.strip() for l in raw.splitlines()):
        if not line:
            continue
        if not out:
            out = line
            continue
        if out.endswith("-") and line[:1].islower():
            head = re.search(r"(\w+)-$", out)
            tail = re.match(r"(\w+)", line)
            if head and tail and (head.group(1) + tail.group(1)).lower() in vocab:
                out = out[:-1] + line
            else:
                out = out + line
        else:
            out = out + " " + line
    return re.sub(r"[ \t]+", " ", out).strip()


def _is_heading(num, body):
    words = body.split()
    return len(words) <= 8 and not body.rstrip().endswith((".", ";", ":", ",")) and classify(body) == "none"


def extract(pdf_bytes, version):
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ExtractError(f"Could not open the file as a PDF: {e}")

    pages = []
    for pno, page in enumerate(doc, start=1):
        blocks = [b for b in page.get_text("blocks", sort=True) if b[6] == 0 and b[4].strip()]
        pages.append((pno, page.rect.height, blocks))
    n_pages = len(pages)
    if sum(len(b[4]) for _, _, bl in pages for b in bl) < 40:
        raise ExtractError("This PDF has no text layer (it may be a scanned image). OCR is not supported in the prototype.")

    def in_margin(b, h):
        return b[3] < h * MARGIN or b[1] > h * (1 - MARGIN)

    counts = Counter()
    for _, h, bl in pages:
        counts.update({_norm_repeat(b[4]) for b in bl if in_margin(b, h)})
    repeated = {k for k, c in counts.items() if n_pages >= 2 and c >= max(2, 0.5 * n_pages)}

    vocab = set(re.findall(r"[a-z]+", " ".join(b[4].lower() for _, _, bl in pages for b in bl)))

    prefix = "OLD" if version == "old" else "NEW"
    paras, removed_noise = [], 0
    cur_section, cur_heading = "", ""
    for pno, h, bl in pages:
        idx = 0
        for b in bl:
            norm = _norm_repeat(b[4])
            if in_margin(b, h) and (norm in repeated or PAGE_NUM_RE.match(norm)):
                removed_noise += 1
                continue
            text = _join_lines(b[4], vocab)
            m = SECTION_RE.match(text)
            num, body = (m.group(1), m.group(2).strip()) if m else ("", text)
            if (m and _is_heading(num, body)) or (not m and len(text.split()) <= 6 and _is_heading("", text)):
                cur_section, cur_heading = (num or cur_section), body
                continue
            idx += 1
            paras.append({
                "id": f"{prefix}-p{pno:02d}-{idx:02d}",
                "version": version,
                "page": pno,
                "section": num or cur_section,
                "heading": cur_heading,
                "text": body,
                "obligation_type": classify(body),
                "position": len(paras),
            })
    return {"version": version, "pages": n_pages, "paragraphs": paras, "noise_blocks_removed": removed_noise}
