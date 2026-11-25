# EcoTrack AI — Environmental Policy Change Tracker (PS 102)

Compares two versions of an environmental guidance PDF and produces a **change log** and an
**affected-stakeholder summary**. Obligation wording is **quoted exactly**: quotes are copied from the
extracted PDF text by paragraph ID, never written by the AI, and every AI explanation is checked
against the source before it is shown.

```
Next.js page  ──►  /api/extract  (PyMuPDF: text + page numbers, paragraph IDs, obligation labels)
              ──►  /api/compare  (difflib diff → Gemini embeddings → cosine top-k matching)   ← retrieval
              ──►  /api/analyze  (grounded Gemini prompt → JSON → verification checks)        ← generation
              ──►  /api/report   (ReportLab PDF)
```

All four endpoints live in one FastAPI app (`api/index.py`), deployed as one Vercel Python function.
The pipeline code is in `ecotrack/`.

## Round 3 web app

Pages: **Overview** (dashboard from your real comparisons), **Compare Documents** (drag-and-drop upload with PDF checks,
processing steps, retry on error), **Results** (summary metrics, searchable/filterable/sortable change log, detail panel with
side-by-side source evidence and word highlighting, stakeholder impact, source-evidence list, PDF export), **Change History**,
**Reports** and **Settings**. Results, history and report records are saved only in the browser (localStorage); nothing is
stored on the server. Frontend code: `app/`, `components/`, `lib/`. The Python backend is unchanged.

## Run it locally (about 5 minutes)

Needs Python 3.10+ and Node.js 18+.

```bash
pip install -r requirements.txt
npm install
export GEMINI_API_KEY="your-key"      # optional; Windows PowerShell: $env:GEMINI_API_KEY="your-key"
npm run dev                            # starts Next.js on :3000 and FastAPI on :8000
```

Open **http://localhost:3000**, click **Use sample documents**, then **Compare versions**.

Without a key the app still works in **offline mode**: local word-overlap similarity instead of Gemini
embeddings, and rule-based explanations instead of Gemini. The badge in the top-right corner shows the mode.
Get a free key at https://aistudio.google.com/apikey.

## Deploy to Vercel

1. Push this folder to a GitHub repository (`node_modules`, `.next` and `.env` are git-ignored).
2. On vercel.com: **Add New → Project → Import** the repository. Framework preset: **Next.js** (auto-detected).
3. Under **Environment Variables** add `GEMINI_API_KEY`.
4. **Deploy**. Then open `https://<your-app>.vercel.app/api/health` — it should show `"ai_mode": "gemini"`.

If `/api/health` returns 404, check in the Vercel dashboard (Deployment → Functions) that `api/index.py`
was built, and check the build log for Python install errors.

## Test and evaluate

```bash
python scripts/test_pipeline.py   # safety checks: hallucinated numbers, misquotes, wrong obligation direction,
                                  # invented IDs/stakeholders, Gemini failure fallback, bad PDF input
python scripts/evaluate.py        # runs the sample pair and scores it against data/answer_key.json
python scripts/make_samples.py    # regenerates the fictional sample PDFs and answer key
```

`evaluate.py` prints recall, precision, change-type accuracy, quote exactness and timing, and saves
`data/sample_run.json` and `data/sample_report.pdf`. **Run it with your Gemini key** — Gemini embeddings
score on a different scale from the offline fallback, so check the printed similarity values and tune
the thresholds if needed.

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | — | Enables Gemini embeddings and explanations |
| `GEMINI_MODEL` | `gemini-flash-latest` | Text model used for explanations |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Embedding model |
| `T_HIGH` / `T_LOW` | `0.85` / `0.70` | Gemini-mode match thresholds (confident / minimum) |
| `T_HIGH_LOCAL` / `T_LOW_LOCAL` | `0.60` / `0.35` | Offline-mode thresholds |
| `T_DELTA` | `0.03` | Near-tie gap that flags an ambiguous match |
| `ANALYZE_BATCH` | `6` | Changes per Gemini call in `evaluate.py` (the web page also sends 6) |
| `GEMINI_TEMPERATURE` | model default | Optional sampling temperature |

## Project layout

```
api/index.py            FastAPI app: /api/health, /api/extract, /api/compare, /api/analyze, /api/report
ecotrack/extract.py     PDF → paragraphs (page, section, ID, obligation label); header/footer removal
ecotrack/compare.py     difflib diff, exact-move detection, embedding retrieval, Added/Removed/Modified/Moved
ecotrack/embeddings.py  Gemini embeddings with offline fallback
ecotrack/llm.py         Grounded prompt and Gemini JSON call
ecotrack/analyze.py     Rule-based fallback, verification checks, stakeholder summary
ecotrack/report.py      ReportLab PDF report (bundled DejaVu font for Unicode text)
app/page.js             The web page: upload, progress, filters, stakeholder summary, change cards
public/samples/         Fictional test PDFs (v1, v2) with 11 planted changes
data/answer_key.json    The planted changes, used by evaluate.py
scripts/                make_samples.py, evaluate.py, test_pipeline.py
```

## Verification checks (Responsible AI)

Every row is flagged **Needs review** (with the reason shown) if any of these fail:

- an ID the AI cites is not part of that change
- a phrase the explanation puts in quotes is not in the source text
- a number in the explanation (digits or words) is not in the source text
- the AI's obligation direction contradicts the wording change (e.g. says “relaxed” when *should* became *shall*)
- the AI names a stakeholder group outside the fixed list
- the similarity score is below the confident threshold, or the best match is a near-tie

## Limits of the prototype

English, text-based PDFs under 4.4 MB (Vercel caps request bodies at 4.5 MB). No OCR for scanned PDFs.
Complex tables and multi-column layouts may extract in the wrong order. Not legal advice.
