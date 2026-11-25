"use client";

import { useId, useRef, useState } from "react";
import { formatBytes, validatePdf } from "@/lib/analysis";
import { IconAlert, IconFile, IconUpload, IconX } from "./Icons";

export default function DocumentUploadCard({ label, hint, doc, onChange, disabled }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const uid = useId();

  async function accept(file) {
    if (!file) return;
    const error = await validatePdf(file);
    onChange({ file, error, title: file.name.replace(/\.pdf$/i, ""), date: doc?.date || "" });
  }

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled) accept(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="upload-card" aria-labelledby={`${uid}-h`}>
      <div className="upload-head">
        <h3 id={`${uid}-h`}>{label}</h3>
        <span className="muted small">{hint}</span>
      </div>

      {!doc?.file ? (
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <IconUpload size={22} />
          <p><strong>Drop a PDF here</strong> or browse your files</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Browse files
          </button>
          <p className="muted small">Text-based PDF, up to 4.4 MB</p>
        </div>
      ) : (
        <div className={`file-row ${doc.error ? "file-bad" : ""}`}>
          <span className="file-icon"><IconFile size={20} /></span>
          <span className="file-meta">
            <span className="file-name">{doc.file.name}</span>
            <span className="muted small">{formatBytes(doc.file.size)}</span>
          </span>
          <span className="file-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled}>Replace</button>
            <button type="button" className="icon-btn" aria-label={`Remove ${doc.file.name}`} onClick={() => onChange(null)} disabled={disabled}><IconX size={16} /></button>
          </span>
        </div>
      )}
      {doc?.error && (
        <p className="field-error" role="alert"><IconAlert size={14} /> {doc.error}</p>
      )}

      {doc?.file && !doc.error && (
        <div className="upload-fields">
          <label className="field">
            <span>Document title</span>
            <input type="text" value={doc.title} onChange={(e) => onChange({ ...doc, title: e.target.value })} disabled={disabled} />
          </label>
          <label className="field">
            <span>Version date <span className="muted">(optional)</span></span>
            <input type="date" value={doc.date} onChange={(e) => onChange({ ...doc, date: e.target.value })} disabled={disabled} />
          </label>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-label={`Choose ${label}`}
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
      />
    </section>
  );
}
