"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppState";
import { IconClock } from "@/components/Icons";
import { EmptyState, LinkButton, PageHeader, Skeleton } from "@/components/ui";
import { formatBytes, formatDate, formatDateTime, summarize } from "@/lib/analysis";

export default function History() {
  const { loaded, analyses, clearWorkspace, toast } = useApp();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="page">
      <PageHeader
        title="Change history"
        subtitle="Comparisons saved in this browser. Nothing is stored on the EcoTrack server."
        actions={analyses.length > 0 && (confirm ? (
          <div className="confirm" role="group" aria-label="Confirm clearing history">
            <span className="small">Delete all saved comparisons and reports from this browser?</span>
            <button className="btn btn-danger btn-sm" onClick={() => { clearWorkspace(); setConfirm(false); toast("History cleared.", "ok"); }}>Delete</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        ) : <button className="btn btn-secondary" onClick={() => setConfirm(true)}>Clear history</button>)}
      />
      {!loaded ? <Skeleton h={240} /> : analyses.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<IconClock size={26} />} title="No comparisons yet" action={<LinkButton href="/compare">Compare documents</LinkButton>}>
            Completed comparisons appear here so you can reopen them. Up to 10 are kept in this browser.
          </EmptyState>
        </div>
      ) : (
        <div className="history">
          {analyses.map((a) => {
            const s = summarize(a.rows);
            return (
              <article key={a.id} className="panel history-item">
                <div className="history-main">
                  <h2 className="h-sm">{a.prev.title} <span className="arrow">→</span> {a.next.title}</h2>
                  <div className="muted small">
                    Compared {formatDateTime(a.createdAt)} · versions dated {formatDate(a.prev.date)} and {formatDate(a.next.date)} · {a.prev.fileName} ({formatBytes(a.prev.size)}), {a.next.fileName} ({formatBytes(a.next.size)})
                  </div>
                  <div className="history-counts">
                    <span><strong>{s.total}</strong> changes</span>
                    <span><strong>{s.Added}</strong> added</span>
                    <span><strong>{s.Removed}</strong> removed</span>
                    <span><strong>{s.Modified}</strong> modified</span>
                    <span><strong>{s.obligation}</strong> obligation-related</span>
                    <span><strong>{s.review}</strong> to review</span>
                    <span className="muted">{a.aiSources.includes("gemini") ? "Gemini" : "Offline mode"}</span>
                  </div>
                </div>
                <Link href={`/results/${a.id}`} className="btn btn-secondary btn-sm">Reopen results</Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
