"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { aiModeOf, useApp } from "@/components/AppState";
import DocumentUploadCard from "@/components/DocumentUploadCard";
import { IconAlert, IconArrowRight, IconCheck, IconFile } from "@/components/Icons";
import { ErrorState, Notice, PageHeader } from "@/components/ui";
import { analyzeItems, compareParagraphs, extractPdf } from "@/lib/api";
import { newId, validatePdf } from "@/lib/analysis";

const BATCH = 6;
const STAGES = [
  { key: "prev", label: "Extracting text from the previous version" },
  { key: "next", label: "Extracting text from the updated version" },
  { key: "match", label: "Matching paragraphs (difflib + semantic similarity)" },
  { key: "analyze", label: "Analyzing changes and verifying evidence" },
];
const SAMPLES = [
  { url: "/samples/riverton_guidelines_v1.pdf", title: "Riverton Effluent Guidelines v1.0 (fictional)" },
  { url: "/samples/riverton_guidelines_v2.pdf", title: "Riverton Effluent Guidelines v2.0 (fictional)" },
];

function ProcessingSteps({ status, detail }) {
  return (
    <ol className="steps" aria-live="polite">
      {STAGES.map((s, i) => {
        const st = status[s.key] || "pending";
        return (
          <li key={s.key} className={`step step-${st}`}>
            <span className="step-icon" aria-hidden="true">
              {st === "done" ? <IconCheck size={14} /> : st === "error" ? <IconAlert size={14} /> : st === "active" ? <span className="spinner" /> : i + 1}
            </span>
            <span className="step-text">
              {s.label}
              {st === "active" && detail[s.key] && <span className="muted small"> · {detail[s.key]}</span>}
              {st === "done" && detail[s.key] && <span className="muted small"> · {detail[s.key]}</span>}
            </span>
            <span className="visually-hidden">{st}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Compare() {
  const router = useRouter();
  const { health, addAnalysis, logActivity, toast } = useApp();
  const mode = aiModeOf(health);
  const [prev, setPrev] = useState(null);
  const [next, setNext] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState({});
  const [detail, setDetail] = useState({});
  const [error, setError] = useState(null);
  const [sampleBusy, setSampleBusy] = useState(false);

  const ready = prev?.file && !prev.error && next?.file && !next.error && !running;

  async function loadSamples() {
    setSampleBusy(true);
    setError(null);
    try {
      const docs = await Promise.all(SAMPLES.map(async (s) => {
        const r = await fetch(s.url);
        if (!r.ok) throw new Error(`could not load ${s.url}`);
        const file = new File([await r.blob()], s.url.split("/").pop(), { type: "application/pdf" });
        return { file, title: s.title, date: "", error: await validatePdf(file) };
      }));
      setPrev(docs[0]);
      setNext(docs[1]);
    } catch (e) {
      setError({ title: "Sample documents could not be loaded", message: e.message });
    } finally {
      setSampleBusy(false);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    setStatus({});
    setDetail({});
    let stage = "prev";
    const mark = (k, v, d) => {
      setStatus((s) => ({ ...s, [k]: v }));
      if (d !== undefined) setDetail((x) => ({ ...x, [k]: d }));
    };
    try {
      mark("prev", "active");
      const o = await extractPdf(prev.file, "old");
      mark("prev", "done", `${o.pages} pages, ${o.paragraphs.length} paragraphs`);
      stage = "next";
      mark("next", "active");
      const n = await extractPdf(next.file, "new");
      mark("next", "done", `${n.pages} pages, ${n.paragraphs.length} paragraphs`);
      stage = "match";
      mark("match", "active");
      const cmp = await compareParagraphs(o.paragraphs, n.paragraphs);
      mark("match", "done", `${cmp.items.length} changes, ${cmp.unchanged_count} unchanged`);
      stage = "analyze";
      mark("analyze", "active", cmp.items.length ? `0 of ${cmp.items.length}` : "nothing to analyze");
      const rows = [], sources = new Set(), notes = [];
      for (let i = 0; i < cmp.items.length; i += BATCH) {
        const a = await analyzeItems(cmp.items.slice(i, i + BATCH));
        rows.push(...a.rows);
        sources.add(a.ai_source);
        if (a.note) notes.push(a.note);
        mark("analyze", "active", `${Math.min(i + BATCH, cmp.items.length)} of ${cmp.items.length}`);
      }
      mark("analyze", "done", `${rows.length} verified`);
      const analysis = {
        id: newId(),
        createdAt: new Date().toISOString(),
        prev: { title: prev.title || prev.file.name, fileName: prev.file.name, size: prev.file.size, date: prev.date, pages: o.pages, paragraphs: o.paragraphs.length },
        next: { title: next.title || next.file.name, fileName: next.file.name, size: next.file.size, date: next.date, pages: n.pages, paragraphs: n.paragraphs.length },
        rows,
        unchanged: cmp.unchanged_count,
        embeddingMode: cmp.embedding_mode,
        thresholds: cmp.thresholds,
        aiSources: sources.size ? [...sources] : ["none"],
        notes: [...new Set(notes)],
      };
      addAnalysis(analysis);
      logActivity(`Compared ${analysis.prev.title} with ${analysis.next.title}: ${rows.length} changes`, `/results/${analysis.id}`);
      if (notes.length) toast("Gemini was unavailable for part of this run; rule-based explanations were used there.", "warn");
      router.push(`/results/${analysis.id}`);
    } catch (e) {
      mark(stage, "error");
      const titles = {
        invalid: "The document could not be processed",
        unavailable: "The EcoTrack API is not reachable",
        server: "Processing failed on the server",
        request: "The request was rejected",
      };
      setError({ title: titles[e.kind] || "Comparison failed", message: e.message });
      setRunning(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Compare policy versions"
        subtitle="Upload the previous and updated versions of the same guidance document."
        actions={<button className="btn btn-secondary" onClick={loadSamples} disabled={running || sampleBusy}>
          <IconFile size={16} /> {sampleBusy ? "Loading samples…" : "Use sample documents"}
        </button>}
      />

      <ol className="wizard" aria-label="Comparison steps">
        <li className={!running ? "on" : "done"}><span>1</span> Upload documents</li>
        <li className={!running ? "" : "done"}><span>2</span> Check analysis settings</li>
        <li className={running ? "on" : ""}><span>3</span> Process and review</li>
      </ol>

      <div className="upload-grid">
        <DocumentUploadCard label="Previous policy version" hint="The version currently in force" doc={prev} onChange={setPrev} disabled={running} />
        <DocumentUploadCard label="Updated policy version" hint="The revised version" doc={next} onChange={setNext} disabled={running} />
      </div>

      <section className="panel settings-panel" aria-labelledby="pipeline-h">
        <div className="panel-head">
          <h2 id="pipeline-h">Analysis settings</h2>
          <span className="muted small">Every comparison runs all steps; the mode depends on the server’s Gemini configuration.</span>
        </div>
        <dl className="pipeline">
          <div><dt>Text comparison</dt><dd>difflib, exact</dd><dd><span className="status status-ok">Always on</span></dd></div>
          <div><dt>Semantic matching</dt><dd>{mode.key === "gemini" ? "Gemini embeddings + cosine" : "Local word similarity"}</dd><dd><span className={`status ${mode.key === "gemini" ? "status-ok" : "status-warn"}`}>{mode.key === "gemini" ? "Gemini" : "Offline"}</span></dd></div>
          <div><dt>AI explanation</dt><dd>{mode.key === "gemini" ? "Gemini, grounded prompt" : "Deterministic rules"}</dd><dd><span className={`status ${mode.key === "gemini" ? "status-ok" : "status-warn"}`}>{mode.key === "gemini" ? "Gemini" : "Offline"}</span></dd></div>
          <div><dt>Stakeholder impact</dt><dd>Fixed list of 8 groups</dd><dd><span className="status status-ok">Always on</span></dd></div>
          <div><dt>Source verification</dt><dd>Quotes by ID; claim checks</dd><dd><span className="status status-ok">Always on</span></dd></div>
        </dl>
        {mode.key === "down" && <Notice tone="warn" title="API unreachable">The backend did not respond to a health check. Start it locally or check the Vercel deployment, then try again.</Notice>}
      </section>

      {(running || error) && (
        <section className="panel" aria-labelledby="proc-h">
          <div className="panel-head"><h2 id="proc-h">Processing</h2></div>
          <ProcessingSteps status={status} detail={detail} />
          {error && (
            <ErrorState title={error.title} message={error.message} onRetry={ready || (prev?.file && next?.file) ? run : null}
                        secondary={<button className="btn btn-ghost btn-sm" onClick={() => { setError(null); setStatus({}); }}>Change files</button>} />
          )}
        </section>
      )}

      <div className="sticky-cta">
        <span className="muted small">{!prev?.file || !next?.file ? "Add both documents to continue." : prev.error || next.error ? "Fix the file errors above." : "Ready to compare."}</span>
        <button className="btn btn-primary" onClick={run} disabled={!ready}>
          {running ? "Comparing…" : <>Compare versions <IconArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
