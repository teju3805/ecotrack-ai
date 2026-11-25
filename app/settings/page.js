"use client";

import { aiModeOf, useApp } from "@/components/AppState";
import { IconRefresh } from "@/components/Icons";
import { Notice, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/analysis";

export default function Settings() {
  const { health, refreshHealth, analyses } = useApp();
  const mode = aiModeOf(health);
  const lastGemini = analyses.find((a) => a.aiSources.includes("gemini"));

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="AI mode, connection status and how documents are processed." />

      <section className="panel">
        <div className="panel-head">
          <h2>AI mode</h2>
          <button className="btn btn-secondary btn-sm" onClick={refreshHealth}><IconRefresh size={14} /> Recheck</button>
        </div>
        <dl className="kv">
          <div><dt>Status</dt><dd><span className={`mode mode-${mode.key}`}><span className="dot" />{mode.label}</span></dd></div>
          <div><dt>Gemini API key</dt><dd>{health?.status === "down" ? "Unknown (API unreachable)" : health?.ai_mode === "gemini" ? "Configured on the server (never shown)" : "Not configured"}</dd></div>
          <div><dt>Text model</dt><dd className="mono">{health?.gen_model || "—"}</dd></div>
          <div><dt>Embedding model</dt><dd className="mono">{health?.embed_model || "—"}</dd></div>
          <div><dt>Last comparison that used Gemini</dt><dd>{lastGemini ? formatDateTime(lastGemini.createdAt) : "None in this browser"}</dd></div>
        </dl>
        {mode.key === "offline" && (
          <Notice tone="warn" title="Demo / offline mode">
            Without a Gemini key the app still runs end to end: difflib finds every change, local word similarity matches clauses, and deterministic rules write the explanations. Set GEMINI_API_KEY on the server (Vercel → Settings → Environment Variables) and redeploy to switch to Gemini.
          </Notice>
        )}
        {mode.key === "down" && <Notice tone="warn" title="API unreachable">The browser could not reach /api/health. Check that the backend is running.</Notice>}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Document processing and privacy</h2></div>
        <ul className="plain-list">
          <li>Each PDF is sent to the EcoTrack API for text extraction and is not saved on the server.</li>
          <li>When Gemini mode is on, the text of changed paragraphs is sent to the Google Gemini API to compute embeddings and explanations. Unchanged text is not sent.</li>
          <li>Comparison results, report history and activity are stored only in this browser’s local storage. Clear them on the Change History page.</li>
          <li>Quoted source text is always copied from the extracted PDF by paragraph ID; the AI never writes it.</li>
          <li>AI explanations are informational and need human review before any legal or compliance decision.</li>
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Application</h2></div>
        <dl className="kv">
          <div><dt>Product</dt><dd>EcoTrack AI · environmental policy change tracker (PS 102)</dd></div>
          <div><dt>Version</dt><dd>0.3.0 prototype</dd></div>
          <div><dt>Stack</dt><dd>Next.js frontend · FastAPI on Vercel · PyMuPDF · difflib · Gemini · ReportLab</dd></div>
          <div><dt>Limits</dt><dd>Text-based PDFs up to 4.4 MB; English; no OCR for scanned documents</dd></div>
        </dl>
      </section>
    </div>
  );
}
