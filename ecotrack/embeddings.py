import hashlib
import logging
import re

import numpy as np

from . import config

log = logging.getLogger("ecotrack")


def _normalize(m):
    n = np.linalg.norm(m, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return m / n


def _local(texts, dim=4096):
    """Offline fallback: hashed word unigrams and bigrams. Lexical, not semantic."""
    m = np.zeros((len(texts), dim), dtype=np.float32)
    for i, t in enumerate(texts):
        words = re.findall(r"[a-z0-9]+", t.lower())
        for f in words + [a + " " + b for a, b in zip(words, words[1:])]:
            m[i, int(hashlib.md5(f.encode()).hexdigest()[:8], 16) % dim] += 1.0
    return _normalize(m)


def _gemini(texts):
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=config.api_key())
    out = []
    for i in range(0, len(texts), 100):
        r = client.models.embed_content(
            model=config.EMBED_MODEL,
            contents=texts[i:i + 100],
            config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY"),
        )
        out.extend(e.values for e in r.embeddings)
    return np.array(out, dtype=np.float32)


def embed(texts):
    """Returns (unit-length vectors, mode). All texts must be embedded in one call so they share a mode."""
    if not texts:
        return np.zeros((0, 1), dtype=np.float32), "none"
    if config.api_key():
        try:
            return _normalize(_gemini(texts)), "gemini"
        except Exception as e:
            log.warning("Gemini embeddings failed, using local fallback: %s", e)
    return _local(texts), "local"
