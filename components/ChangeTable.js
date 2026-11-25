"use client";

import { useMemo, useState } from "react";
import { isObligationRelated, sectionLabel } from "@/lib/analysis";
import { IconAlert, IconCheckCircle, IconChevronRight, IconSearch } from "./Icons";
import { ChangeTypeBadge, EmptyState, ObligationBadge } from "./ui";

const FILTERS = [
  { key: "all", label: "All changes" },
  { key: "Added", label: "Added" },
  { key: "Removed", label: "Removed" },
  { key: "Modified", label: "Modified" },
  { key: "Moved", label: "Moved" },
  { key: "obligation", label: "Obligation-related" },
  { key: "review", label: "Needs review" },
];
const TYPE_ORDER = { Added: 0, Removed: 1, Modified: 2, Moved: 3 };
const PAGE = 15;

export default function ChangeTable({ rows, onOpen, initialStakeholder }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("doc");
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c = { all: rows.length, obligation: 0, review: 0 };
    for (const r of rows) {
      c[r.change_type] = (c[r.change_type] || 0) + 1;
      if (isObligationRelated(r)) c.obligation += 1;
      if (r.review_flag) c.review += 1;
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (filter === "obligation" && !isObligationRelated(r)) return false;
      if (filter === "review" && !r.review_flag) return false;
      if (TYPE_ORDER[filter] !== undefined && r.change_type !== filter) return false;
      if (!needle) return true;
      return [r.old_text, r.new_text, r.explanation, r.old_section, r.new_section, r.item_id, ...(r.stakeholders || [])]
        .some((v) => v && String(v).toLowerCase().includes(needle));
    });
    if (sort === "type") list = [...list].sort((a, b) => TYPE_ORDER[a.change_type] - TYPE_ORDER[b.change_type]);
    if (sort === "sim-desc" || sort === "sim-asc") {
      const dir = sort === "sim-desc" ? -1 : 1;
      list = [...list].sort((a, b) => ((a.similarity ?? -1) - (b.similarity ?? -1)) * dir);
    }
    return list;
  }, [rows, q, filter, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = visible.slice(cur * PAGE, cur * PAGE + PAGE);

  return (
    <div className="panel">
      <div className="table-tools">
        <label className="search">
          <IconSearch size={15} />
          <span className="visually-hidden">Search changes</span>
          <input type="search" placeholder="Search text, explanation, section or stakeholder" value={q}
                 onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </label>
        <label className="sort">
          <span className="muted small">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="doc">Document order</option>
            <option value="type">Change type</option>
            <option value="sim-desc">Similarity, high to low</option>
            <option value="sim-asc">Similarity, low to high</option>
          </select>
        </label>
      </div>
      <div className="filters" role="tablist" aria-label="Filter changes">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key}
                  className={`filter ${filter === f.key ? "on" : ""}`}
                  onClick={() => { setFilter(f.key); setPage(0); }}>
            {f.label} <span className="filter-n">{counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {slice.length === 0 ? (
        <EmptyState title="No matching changes">Try a different search term or filter.</EmptyState>
      ) : (
        <table className="changes">
          <thead>
            <tr>
              <th scope="col">Change</th>
              <th scope="col">Section</th>
              <th scope="col">Prev. page</th>
              <th scope="col">New page</th>
              <th scope="col">Summary</th>
              <th scope="col">Similarity</th>
              <th scope="col">Evidence</th>
              <th scope="col"><span className="visually-hidden">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.item_id} onClick={() => onOpen(r)} className="clickable">
                <td data-label="Change">
                  <div className="badges">
                    <ChangeTypeBadge type={r.change_type} />
                    {isObligationRelated(r) && <ObligationBadge />}
                  </div>
                  <div className="muted small mono">{r.item_id}</div>
                </td>
                <td data-label="Section" className="mono">{sectionLabel(r)}</td>
                <td data-label="Prev. page">{r.old_page ?? "—"}</td>
                <td data-label="New page">{r.new_page ?? "—"}</td>
                <td data-label="Summary" className="summary-cell"><span className="clamp">{r.explanation}</span></td>
                <td data-label="Similarity">{r.similarity != null ? r.similarity.toFixed(2) : "—"}</td>
                <td data-label="Evidence">
                  {r.review_flag
                    ? <span className="status status-warn"><IconAlert size={14} /> Review</span>
                    : <span className="status status-ok"><IconCheckCircle size={14} /> Verified</span>}
                </td>
                <td className="row-action">
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(r); }} aria-label={`View details of ${r.item_id}`}>
                    View <IconChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {visible.length > PAGE && (
        <div className="pager">
          <span className="muted small">{cur * PAGE + 1}–{Math.min(visible.length, cur * PAGE + PAGE)} of {visible.length}</span>
          <div>
            <button className="btn btn-secondary btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
