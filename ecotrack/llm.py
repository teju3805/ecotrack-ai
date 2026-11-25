import json
import os

from . import config
from .stakeholders import STAKEHOLDERS

PROMPT_HEAD = """You compare two versions of a public environmental guidance document.
Use ONLY the text given below. Do not use outside knowledge.

For every item, return one result with these fields:
  pair_id: the item's id, copied exactly
  nature: "substantive" if the meaning changed, "editorial" if only wording, order, spelling or numbering changed
  explanation: at most 2 short sentences in plain language saying what changed and why it matters
  stakeholders: groups affected, chosen ONLY from STAKEHOLDER_LIST, written exactly as listed
  obligation_change: one of "new", "tightened", "relaxed", "removed", "none"
  evidence_ids: the paragraph IDs you relied on (only IDs shown in that item)

Rules:
- Do NOT copy or rewrite whole source sentences. Quote at most a few words, in double quotes, exactly as they appear.
- Only mention numbers that appear in the item's text.
- If text exists only in OLD, say it no longer appears. Do not claim the activity is now prohibited unless NEW says so.
- Return JSON: {"results": [ ... ]}

STAKEHOLDER_LIST: """


def build_prompt(items):
    parts = [PROMPT_HEAD + json.dumps(STAKEHOLDERS), ""]
    for it in items:
        parts.append(f"ITEM {it['item_id']}  (detected change type: {it['change_type']})")
        for side in ("old", "new"):
            p = it.get(side)
            if p:
                parts.append(f"  {side.upper()} [{p['id']}, page {p['page']}, section {p['section'] or '-'}, "
                             f"wording type: {p['obligation_type']}]: \"{p['text']}\"")
            else:
                parts.append(f"  {side.upper()}: (none)")
        parts.append("")
    return "\n".join(parts)


def explain(items):
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=config.api_key())
    cfg = {"response_mime_type": "application/json"}
    if os.environ.get("GEMINI_TEMPERATURE"):
        cfg["temperature"] = float(os.environ["GEMINI_TEMPERATURE"])
    resp = client.models.generate_content(
        model=config.GEN_MODEL, contents=build_prompt(items), config=types.GenerateContentConfig(**cfg))
    data = json.loads(resp.text)
    results = data.get("results", []) if isinstance(data, dict) else data
    return {r["pair_id"]: r for r in results if isinstance(r, dict) and "pair_id" in r}
