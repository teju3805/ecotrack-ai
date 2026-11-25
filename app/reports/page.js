"use client";

import { useApp } from "@/components/AppState";
import { IconDownload, IconFile } from "@/components/Icons";
import { EmptyState, ErrorState, LinkButton, Notice, PageHeader, Skeleton } from "@/components/ui";
import { useReport } from "@/components/useReport";
import { formatDateTime } from "@/lib/analysis";

export default function Reports() {
  const { loaded, analyses, reports } = useApp();
  const { download, busyId, error, clearError } = useReport();

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="PDF change logs generated with ReportLab from your comparisons." />
      <Notice tone="info">Reports are generated on demand from the comparisons saved in this browser. The PDF is created by the server and downloaded straight to you; it is not kept on the server.</Notice>
      {error && <ErrorState title="Report generation failed" message={error} onRetry={clearError} />}
      {!loaded ? <Skeleton h={200} /> : analyses.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<IconFile size={26} />} title="No reports available" action={<LinkButton href="/compare">Run a comparison</LinkButton>}>
            A report becomes available as soon as a comparison is complete.
          </EmptyState>
        </div>
      ) : (
        <div className="report-grid">
          {analyses.map((a) => {
            const last = reports.find((r) => r.analysisId === a.id);
            return (
              <article key={a.id} className="panel report-card">
                <div className="report-icon"><IconFile size={20} /></div>
                <div className="report-body">
                  <h2 className="h-sm">Change log: {a.next.title}</h2>
                  <div className="muted small">{a.prev.title} → {a.next.title}</div>
                  <dl className="report-meta">
                    <div><dt>Changes</dt><dd>{a.rows.length}</dd></div>
                    <div><dt>Compared</dt><dd>{formatDateTime(a.createdAt)}</dd></div>
                    <div><dt>Last generated</dt><dd>{last ? formatDateTime(last.generatedAt) : "Not yet"}</dd></div>
                  </dl>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => download(a)} disabled={busyId === a.id}>
                  <IconDownload size={15} /> {busyId === a.id ? "Generating…" : "Download PDF"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
