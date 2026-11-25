"use client";

import { isObligationRelated, sectionLabel, stakeholderImpact } from "@/lib/analysis";
import { IconUsers } from "./Icons";
import { ChangeTypeBadge, EmptyState } from "./ui";

export default function StakeholderImpact({ rows, onOpen }) {
  const groups = stakeholderImpact(rows);
  if (!groups.length) return <EmptyState title="No stakeholder impact identified">No change in this analysis was tagged with a stakeholder group.</EmptyState>;
  return (
    <>
      <p className="muted small intro">Potential impact only, based on the analysis of each change. Groups are chosen from a fixed list; this is not a legal conclusion.</p>
      <div className="impact-grid">
        {groups.map((g) => (
          <article key={g.name} className="panel impact">
            <header className="impact-head">
              <span className="impact-icon"><IconUsers size={16} /></span>
              <div>
                <h3>{g.name}</h3>
                <div className="muted small">
                  {g.rows.length} change{g.rows.length === 1 ? "" : "s"} · {g.obligationChanges} obligation-related
                </div>
              </div>
            </header>
            <div className="impact-why muted small">Why they may be affected</div>
            <ul className="impact-list">
              {g.rows.map((r) => (
                <li key={r.item_id}>
                  <button className="impact-item" onClick={() => onOpen(r)}>
                    <span className="impact-item-top">
                      <ChangeTypeBadge type={r.change_type} />
                      <span className="mono small">§ {sectionLabel(r)}</span>
                      {isObligationRelated(r) && <span className="tiny-flag">obligation</span>}
                    </span>
                    <span className="impact-text">{r.explanation}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
