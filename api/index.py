import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile  # noqa: E402
from fastapi.responses import Response  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from ecotrack import config  # noqa: E402
from ecotrack.analyze import analyze  # noqa: E402
from ecotrack.compare import compare  # noqa: E402
from ecotrack.extract import ExtractError, extract  # noqa: E402
from ecotrack.report import build_report  # noqa: E402

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="EcoTrack AI API", docs_url="/api/docs", openapi_url="/api/openapi.json")


class CompareIn(BaseModel):
    old: list[dict]
    new: list[dict]


class AnalyzeIn(BaseModel):
    items: list[dict]


class ReportIn(BaseModel):
    rows: list[dict]
    meta: dict = {}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_mode": "gemini" if config.api_key() else "offline",
        "gen_model": config.GEN_MODEL,
        "embed_model": config.EMBED_MODEL,
    }


@app.post("/api/extract")
async def api_extract(file: UploadFile = File(...), version: str = Form(...)):
    if version not in ("old", "new"):
        raise HTTPException(400, "version must be 'old' or 'new'")
    data = await file.read()
    if len(data) > config.MAX_PDF_BYTES:
        raise HTTPException(413, "File is larger than the 4.4 MB limit for this prototype.")
    try:
        return extract(data, version)
    except ExtractError as e:
        raise HTTPException(422, str(e))


@app.post("/api/compare")
def api_compare(body: CompareIn):
    return compare(body.old, body.new)


@app.post("/api/analyze")
def api_analyze(body: AnalyzeIn):
    if len(body.items) > 20:
        raise HTTPException(400, "Send at most 20 items per call.")
    return analyze(body.items)


@app.post("/api/report")
def api_report(body: ReportIn):
    pdf = build_report(body.rows, body.meta)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="ecotrack_change_log.pdf"'})
