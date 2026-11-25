import os


def _f(name, default):
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


def api_key():
    return os.environ.get("GEMINI_API_KEY", "").strip()


GEN_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "gemini-embedding-001")
BATCH_SIZE = int(_f("ANALYZE_BATCH", 6))
MAX_PDF_BYTES = int(4.4 * 1024 * 1024)


def thresholds(mode):
    """(t_high, t_low, delta). Gemini and local embeddings score on different scales."""
    if mode == "gemini":
        return _f("T_HIGH", 0.85), _f("T_LOW", 0.70), _f("T_DELTA", 0.03)
    return _f("T_HIGH_LOCAL", 0.60), _f("T_LOW_LOCAL", 0.35), _f("T_DELTA", 0.03)
