"use client";

import Link from "next/link";
import { IconAlert, IconCheckCircle, IconInfo, IconRefresh } from "./Icons";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function ChangeTypeBadge({ type }) {
  return <span className={`badge badge-${type.toLowerCase()}`}>{type}</span>;
}

export function ObligationBadge() {
  return <span className="badge badge-obligation" title="Wording that creates or changes a duty was affected">Obligation change</span>;
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, message, onRetry, secondary }) {
  return (
    <div className="alert alert-error" role="alert">
      <IconAlert size={18} />
      <div>
        <div className="alert-title">{title}</div>
        <div className="alert-body">{message}</div>
        <div className="alert-actions">
          {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}><IconRefresh size={14} /> Try again</button>}
          {secondary}
        </div>
      </div>
    </div>
  );
}

export function Notice({ tone = "info", title, children }) {
  const Icon = tone === "warn" ? IconAlert : tone === "ok" ? IconCheckCircle : IconInfo;
  return (
    <div className={`alert alert-${tone}`}>
      <Icon size={17} />
      <div>
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-body">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ h = 80 }) {
  return <div className="skeleton" style={{ height: h }} aria-hidden="true" />;
}

export function LinkButton({ href, children, variant = "primary", size }) {
  return <Link href={href} className={`btn btn-${variant} ${size ? `btn-${size}` : ""}`}>{children}</Link>;
}
