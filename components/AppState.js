"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getHealth } from "@/lib/api";
import { newId } from "@/lib/analysis";

const KEY = "ecotrack.workspace.v1";
const Ctx = createContext(null);

export function AppStateProvider({ children }) {
  const [loaded, setLoaded] = useState(false);
  const [health, setHealth] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [reports, setReports] = useState([]);
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      setAnalyses(saved.analyses || []);
      setActivity(saved.activity || []);
      setReports(saved.reports || []);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ analyses: analyses.slice(0, 10), activity: activity.slice(0, 40), reports: reports.slice(0, 30) }));
    } catch {}
  }, [analyses, activity, reports, loaded]);

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await getHealth());
    } catch {
      setHealth({ status: "down" });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const toast = useCallback((message, kind = "info") => {
    const id = newId();
    setToasts((t) => [...t, { id, message, kind }]);
    timers.current[id] = setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismissToast = (id) => {
    clearTimeout(timers.current[id]);
    setToasts((t) => t.filter((x) => x.id !== id));
  };

  const logActivity = useCallback((text, href) => {
    setActivity((a) => [{ id: newId(), at: new Date().toISOString(), text, href }, ...a].slice(0, 40));
  }, []);

  const addAnalysis = useCallback((a) => setAnalyses((list) => [a, ...list].slice(0, 10)), []);
  const addReport = useCallback((r) => setReports((list) => [r, ...list].slice(0, 30)), []);
  const clearWorkspace = useCallback(() => {
    setAnalyses([]);
    setActivity([]);
    setReports([]);
  }, []);

  const value = { loaded, health, refreshHealth, analyses, addAnalysis, activity, logActivity, reports, addReport, clearWorkspace, toast };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span>{t.message}</span>
            <button className="icon-btn" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

export function aiModeOf(health) {
  if (!health) return { key: "checking", label: "Checking API…" };
  if (health.status === "down") return { key: "down", label: "API unreachable" };
  if (health.ai_mode === "gemini") return { key: "gemini", label: "Gemini connected" };
  return { key: "offline", label: "Offline mode" };
}
