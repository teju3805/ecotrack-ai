"use client";

import { useEffect, useMemo, useRef } from "react";
import { isObligationRelated, sectionLabel, wordDiff } from "@/lib/analysis";
import { IconAlert, IconCheckCircle, IconChevronLeft, IconChevronRight, IconShield, IconX } from "./Icons";
import { ChangeTypeBadge, ObligationBadge } from "./ui";

export function EvidencePanel({ side, text, tokens, id, page, section, wording, docTitle }) {
  return (
    <div className={`evidence evidence-${side}`}>
      <div className="evidence-head">
        <span className="evidence-label">{side === "old" ? "Previous version" : "Updated version"}</span>
        <span className="muted small">{docTitle}</span>
      </div>
      {text ? (
        <>
          <blockquote className="quote">
            {tokens
              ? tokens.map((t, i) => t.k === "same" ? <span key={i}>{t.t}</span> : <mark key={i} className={`hl-${t.k}`}>{t.t}</mark>)
              : text}
          </blockquote>
          <dl className="evidence-meta">
            <div><dt>Page</dt><dd>{page}</dd></div>
            <div><dt>Section</dt><dd>{section || "—"}</dd></div>
            <div><dt>Paragraph ID</dt><dd className="mono">{id}</dd></div>
            <div><dt>Wording</dt><dd>{wording}</dd></div>
          </dl>
        </>
      ) : (
        <p className="muted evidence-none">{side === "old" ? "Not present in the previous version." : "Not present in the updated version."}</p>
      )}
    </div>
  );
}

export default function ChangeDetailPanel({ row, rows, onClose, onNavigate, analysis }) {
  const closeRef = useRef(null);
  const idx = rows.findIndex((r) => r.item_id === row.item_id);
  const diff = useMemo(() => (row.old_text && row.new_text ? wordDiff(row.old_text, row.new_text) : null), [row]);

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && e.altKey && idx < rows.length - 1) onNavigate(rows[idx + 1]);
      if (e.key === "ArrowLeft" && e.altKey && idx > 0) onNavigate(rows[idx - 1]);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      prev?.focus?.();
    };
  }, [idx, rows, onClose, onNavigate]);

  const src = row.explanation_source === "gemini" ? "Gemini" : "Rule-based (offline mode)";

  return (
    <div className="drawer-wrap" role="presentation" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <div className="badges">
              <ChangeTypeBadge type={row.change_type} />
              {isObligationRelated(row) && <ObligationBadge />}
              {row.relocated && <span className="badge badge-neutral">Relocated</span>}
              {row.nature === "editorial" && <span className="badge badge-neutral">Editorial</span>}
            </div>
            <h2 id="detail-title">{row.item_id} · Section {sectionLabel(row)}</h2>
          </div>
          <div className="drawer-nav">
            <button className="icon-btn" onClick={() => onNavigate(rows[idx - 1])} disabled={idx <= 0} aria-label="Previous change"><IconChevronLeft /></button>
            <span className="muted small">{idx + 1} / {rows.length}</span>
            <button className="icon-btn" onClick={() => onNavigate(rows[idx + 1])} disabled={idx >= rows.length - 1} aria-label="Next change"><IconChevronRight /></button>
            <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close details"><IconX /></button>
          </div>
        </header>

        <div className="drawer-body">
          <h3 className="section-label">Source evidence <span className="muted small">exact extracted text, never rewritten</span></h3>
          <div className="evidence-grid">
            <EvidencePanel side="old" text={row.old_text} tokens={diff?.old} id={row.old_id} page={row.old_page} section={row.old_section}
                           wording={row.old_obligation_type} docTitle={analysis.prev.title} />
            <EvidencePanel side="new" text={row.new_text} tokens={diff?.new} id={row.new_id} page={row.new_page} section={row.new_section}
                           wording={row.new_obligation_type} docTitle={analysis.next.title} />
          </div>
          {diff && <p className="muted small legend"><mark className="hl-del">removed words</mark> <mark className="hl-ins">added words</mark> highlighting only; the quoted text is unchanged.</p>}

          <div className="kv-row">
            <div><span className="muted small">Similarity</span><strong>{row.similarity != null ? row.similarity.toFixed(2) : "—"}</strong></div>
            <div><span className="muted small">Obligation change</span><strong>{row.obligation_change}</strong></div>
            <div><span className="muted small">Nature</span><strong>{row.nature}</strong></div>
          </div>

          <h3 className="section-label">AI explanation <span className="muted small">{src}</span></h3>
          <div className="ai-box">
            <p>{row.explanation || "No explanation was returned."}</p>
            <p className="disclaimer">AI-generated explanations are informational. A person must review them before any legal or compliance decision.</p>
          </div>

          <h3 className="section-label">Potential stakeholder impact</h3>
          <div className="chips">
            {(row.stakeholders || []).map((s) => <span key={s} className="chip">{s}</span>)}
          </div>

          <h3 className="section-label">Verification</h3>
          {row.review_flag ? (
            <div className="alert alert-warn">
              <IconAlert size={17} />
              <div>
                <div className="alert-title">Needs human review</div>
                <ul className="reasons">{row.review_reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="alert-body small">The quoted source text above is still an exact copy of the PDF text. The flag concerns the match or the AI statement.</div>
              </div>
            </div>
          ) : (
            <div className="alert alert-ok">
              <IconShield size={17} />
              <div>
                <div className="alert-title">Verified against the source</div>
                <div className="alert-body">Quotes were copied by paragraph ID. Cited IDs, quoted phrases, numbers, obligation direction and stakeholder names passed every check.</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
