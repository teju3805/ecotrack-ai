"use client";

import { useState } from "react";
import { fetchReport } from "@/lib/api";
import { newId } from "@/lib/analysis";
import { useApp } from "./AppState";

export function useReport() {
  const { addReport, logActivity, toast } = useApp();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function download(analysis) {
    setBusyId(analysis.id);
    setError(null);
    try {
      const meta = { old_name: analysis.prev.title, new_name: analysis.next.title, ai_mode: analysis.aiSources.join(", ") };
      const blob = await fetchReport(analysis.rows, meta);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `EcoTrack_${analysis.next.title.replace(/[^\w.-]+/g, "_").slice(0, 40)}_change_log.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      addReport({ id: newId(), analysisId: analysis.id, title: `Change log: ${analysis.prev.title} → ${analysis.next.title}`,
                  generatedAt: new Date().toISOString(), changes: analysis.rows.length });
      logActivity(`Report downloaded for ${analysis.next.title}`, `/results/${analysis.id}`);
      toast("PDF report downloaded.", "ok");
    } catch (e) {
      setError(`The report could not be generated: ${e.message}`);
      toast("Report generation failed.", "error");
    } finally {
      setBusyId(null);
    }
  }
  return { download, busyId, error, clearError: () => setError(null) };
}
