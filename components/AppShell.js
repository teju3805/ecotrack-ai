"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { aiModeOf, useApp } from "./AppState";
import { IconClock, IconCompare, IconFile, IconGrid, IconLeaf, IconMenu, IconSliders, IconX } from "./Icons";

const NAV = [
  { href: "/", label: "Overview", icon: IconGrid },
  { href: "/compare", label: "Compare Documents", icon: IconCompare },
  { href: "/history", label: "Change History", icon: IconClock },
  { href: "/reports", label: "Reports", icon: IconFile },
  { href: "/settings", label: "Settings", icon: IconSliders },
];

function pageInfo(path) {
  if (path.startsWith("/results")) return { title: "Comparison results", crumb: ["Compare Documents", "Results"] };
  const n = NAV.find((x) => x.href === path) || NAV[0];
  return { title: n.label, crumb: [n.label] };
}

function Sidebar({ open, onClose }) {
  const path = usePathname();
  const [env, setEnv] = useState("");
  useEffect(() => {
    const h = window.location.hostname;
    setEnv(h === "localhost" || h === "127.0.0.1" ? "Local development" : h.endsWith(".vercel.app") ? "Vercel deployment" : h);
  }, []);
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark"><IconLeaf size={18} /></span>
          <span>
            <span className="brand-name">EcoTrack AI</span>
            <span className="brand-tag">Policy intelligence</span>
          </span>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close navigation"><IconX /></button>
        </div>
        <nav>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href) || (href === "/compare" && path.startsWith("/results"));
            return (
              <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClose}>
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="profile">
            <span className="avatar" aria-hidden="true">CA</span>
            <span>
              <span className="profile-name">Compliance analyst</span>
              <span className="profile-sub">Local workspace</span>
            </span>
          </div>
          <div className="env-label">{env || " "}</div>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenu }) {
  const path = usePathname();
  const { health } = useApp();
  const mode = aiModeOf(health);
  const info = pageInfo(path);
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation"><IconMenu /></button>
      <div className="topbar-title">
        <nav aria-label="Breadcrumb" className="crumbs">
          <span>EcoTrack AI</span>
          {info.crumb.map((c) => (
            <span key={c}><span className="crumb-sep">/</span>{c}</span>
          ))}
        </nav>
        <div className="topbar-h">{info.title}</div>
      </div>
      <div className="topbar-right">
        <Link href="/settings" className={`mode mode-${mode.key}`} title="AI mode — open settings">
          <span className="dot" aria-hidden="true" />
          {mode.label}
        </Link>
      </div>
    </header>
  );
}

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="shell-main">
        <Header onMenu={() => setOpen(true)} />
        <main id="main" className="content">{children}</main>
      </div>
    </div>
  );
}
