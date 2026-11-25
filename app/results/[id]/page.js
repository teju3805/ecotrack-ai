"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useApp } from "@/components/AppState";
import ChangeDetailPanel from "@/components/ChangeDetailPanel";
import ChangeTable from "@/components/ChangeTable";
import { IconAlert, IconCheckCircle, IconDownload, IconPlus } from "@/components/Icons";
import StakeholderImpact from "@/components/StakeholderImpact";
import { EmptyState, ErrorState, LinkButton, Notice, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { useReport } from "@/components/useReport";
import { formatDateTime, summarize } from "@/lib/analysis";

function EvidenceList({ rows, analysis, onOpen }) {
  const quotes = rows.flatMap((r) => [
    r.old_text && { r, side: "old", text: r.old_text, id: r.old_id, page: r.old_page, section: r.old_section, doc: analysis.prev.title },
    r.new_text && { r, side: "new", text: r.new_text, id: r.new_id, page: r.new_page, section: r.new_section, doc: analysis.next.title },
  ].filter(Boolean));
  return (
    <div className="panel">
      <p className="muted small pad">Every quotation below is the exact text extracted from the PDF, looked up by paragraph ID. Rows whose AI statement failed a check are marked; open them to see why.</p>
      <ul className="evidence-list">
        {quotes.map((q) => (
          <li key={`${q.r.item_id}-${q.side}`}>
            <div className="ev-meta">
              <span className="mono small">{q.id}</span>
              <span className="muted small">{q.side === "old" ? "Previous" : "Updated"} · p.{q.page}{q.section ? ` · §${q.section}` : ""}</span>
              {q.r.review_flag
                ? <span className="status status-warn"><IconAlert size={13} /> Needs review</span>
                : <span className="status status-ok"><IconCheckCircle size={13} /> Verified</span>}
            </div>
            <blockquote className="quote quote-sm">{q.text}</blockquote>
            <button className="text-link small" onClick={() => onOpen(q.r)}>Open {q.r.item_id}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Results() {
  const { id } = useParams();
  const { loaded, analyses } = useApp();
  const { download, busyId, error, clearError } = useReport();
  const [tab, setTab] = useState("log");
  const [open, setOpen] = useState(null);
  const close = useCallback(() => setOpen(null), []);
  const nav = useCallback((r) => r && setOpen(r), []);

  if (!loaded) return <div className="page"><Skeleton h={60} /><div className="stats"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div><Skeleton h={300} /></div>;
  const a = analyses.find((x) => x.id === id);
  if (!a) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState title="This analysis is not available" action={<LinkButton href="/compare">Start a new comparison</LinkButton>}>
            Results are kept only in this browser. They may have been cleared, or the link was opened in a different browser.
          </EmptyState>
        </div>
      </div>
    );
  }
  const s = summarize(a.rows);
  const offline = !a.aiSources.includes("gemini");

  return (
    <div className="page">
      <PageHeader
        title={<>{a.prev.title} <span className="arrow">→</span> {a.next.title}</>}
        subtitle={`Compared ${formatDateTime(a.createdAt)} · ${a.prev.paragraphs} vs ${a.next.paragraphs} paragraphs · ${a.unchanged} unchanged`}
        actions={<>
          <LinkButton href="/compare" variant="secondary"><IconPlus size={16} /> New comparison</LinkButton>
          <button className="btn btn-primary" onClick={() => download(a)} disabled={busyId === a.id}>
            <IconDownload size={16} /> {busyId === a.id ? "Generating PDF…" : "Export report"}
          </button>
        </>}
      />
      {error && <ErrorState title="Report generation failed" message={error} onRetry={() => { clearError(); download(a); }} />}
      {offline && a.rows.length > 0 && (
        <Notice tone="warn" title="Offline mode">
          Matching used local word similarity and explanations were produced by deterministic rules, because Gemini was not configured or not reachable. Source quotes are unaffected.
        </Notice>
      )}
      {a.notes.length > 0 && !offline && <Notice tone="warn" title="Partial fallback">{a.notes[0]}</Notice>}

      <div className="stats stats-6">
        <StatCard label="Total changes" value={s.total} hint={s.Moved ? `${s.Moved} moved` : "across both versions"} />
        <StatCard label="Added" value={s.Added} tone="green" />
        <StatCard label="Removed" value={s.Removed} tone="red" />
        <StatCard label="Modified" value={s.Modified} />
        <StatCard label="Obligation-related" value={s.obligation} tone="amber" hint="new, changed or dropped duties" />
        <StatCard label="Needs review" value={s.review} tone={s.review ? "amber" : undefined} hint={s.review ? "AI statements failed a check" : "all statements verified"} />
      </div>

      {a.rows.length === 0 ? (
        <div className="panel"><EmptyState title="No differences found">The two documents have the same paragraphs after extraction.</EmptyState></div>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Result views">
            {[["log", "Change log"], ["impact", "Stakeholder impact"], ["evidence", "Source evidence"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === "log" && <ChangeTable rows={a.rows} onOpen={setOpen} />}
          {tab === "impact" && <StakeholderImpact rows={a.rows} onOpen={setOpen} />}
          {tab === "evidence" && <EvidenceList rows={a.rows} analysis={a} onOpen={setOpen} />}
        </>
      )}

      {open && <ChangeDetailPanel row={open} rows={a.rows} onClose={close} onNavigate={nav} analysis={a} />}
    </div>
  );
}
