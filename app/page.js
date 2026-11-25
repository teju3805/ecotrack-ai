"use client";

import Link from "next/link";
import { useApp } from "@/components/AppState";
import { IconArrowRight, IconCompare, IconFile } from "@/components/Icons";
import { EmptyState, LinkButton, PageHeader, Skeleton, StatCard } from "@/components/ui";
import { formatDate, formatDateTime, summarize } from "@/lib/analysis";

export default function Overview() {
  const { loaded, analyses, activity } = useApp();
  const all = analyses.flatMap((a) => a.rows);
  const s = summarize(all);

  return (
    <div className="page">
      <PageHeader
        title="Environmental Policy Overview"
        subtitle="Track policy changes, obligations and stakeholder impact."
        actions={<>
          <LinkButton href="/reports" variant="secondary"><IconFile size={16} /> View reports</LinkButton>
          <LinkButton href="/compare"><IconCompare size={16} /> Compare policy versions</LinkButton>
        </>}
      />

      {!loaded ? (
        <div className="stats"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
      ) : analyses.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<IconCompare size={26} />}
            title="No comparisons yet"
            action={<LinkButton href="/compare">Start a comparison <IconArrowRight size={16} /></LinkButton>}
          >
            Upload the previous and updated versions of a guidance PDF. EcoTrack AI lists every change, quotes obligations exactly and shows who is affected.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="stats">
            <StatCard label="Documents analyzed" value={analyses.length * 2} hint={`${analyses.length} comparison${analyses.length === 1 ? "" : "s"} in this browser`} />
            <StatCard label="Total changes detected" value={s.total} hint={`${s.Added} added · ${s.Removed} removed · ${s.Modified} modified`} />
            <StatCard label="New obligations" value={s.newObligations} hint="Binding wording that was not there before" tone="amber" />
            <StatCard label="Modified requirements" value={s.modifiedRequirements} hint="Changed paragraphs with binding wording" />
          </div>

          <div className="two-col">
            <section className="panel">
              <div className="panel-head"><h2>Recent analyses</h2><Link href="/history" className="text-link">View all</Link></div>
              <table className="simple">
                <thead>
                  <tr><th scope="col">Document pair</th><th scope="col">Previous version</th><th scope="col">Updated version</th><th scope="col">Changes</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Action</span></th></tr>
                </thead>
                <tbody>
                  {analyses.slice(0, 5).map((a) => {
                    const c = summarize(a.rows);
                    return (
                      <tr key={a.id}>
                        <td data-label="Document pair"><div className="strong">{a.next.title}</div><div className="muted small">vs {a.prev.title}</div></td>
                        <td data-label="Previous version">{formatDate(a.prev.date)}</td>
                        <td data-label="Updated version">{formatDate(a.next.date)}</td>
                        <td data-label="Changes">{c.total}</td>
                        <td data-label="Status">{c.review ? <span className="status status-warn">{c.review} to review</span> : <span className="status status-ok">Complete</span>}</td>
                        <td className="row-action"><Link className="btn btn-ghost btn-sm" href={`/results/${a.id}`}>View analysis</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <div className="panel-head"><h2>Recent activity</h2></div>
              {activity.length === 0 ? (
                <p className="muted small pad">Activity from this browser appears here.</p>
              ) : (
                <ol className="activity">
                  {activity.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      <span className="act-dot" aria-hidden="true" />
                      <div>
                        {e.href ? <Link href={e.href} className="text-link">{e.text}</Link> : <span>{e.text}</span>}
                        <div className="muted small">{formatDateTime(e.at)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
