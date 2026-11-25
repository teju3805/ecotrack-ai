export const MAX_BYTES = 4.4 * 1024 * 1024;
export const CHANGE_TYPES = ["Added", "Removed", "Modified", "Moved"];
const BINDING = new Set(["obligation", "prohibition"]);

export const isBinding = (t) => BINDING.has(t);

export function isObligationRelated(r) {
  if (["new", "tightened", "relaxed", "removed", "changed"].includes(r.obligation_change)) return true;
  if (r.old_obligation_type !== r.new_obligation_type && (isBinding(r.old_obligation_type) || isBinding(r.new_obligation_type))) return true;
  return false;
}

export function summarize(rows) {
  const c = { total: rows.length, Added: 0, Removed: 0, Modified: 0, Moved: 0, obligation: 0, review: 0, newObligations: 0, modifiedRequirements: 0 };
  for (const r of rows) {
    c[r.change_type] = (c[r.change_type] || 0) + 1;
    if (isObligationRelated(r)) c.obligation += 1;
    if (r.review_flag) c.review += 1;
    if (r.obligation_change === "new") c.newObligations += 1;
    if (r.change_type === "Modified" && (isBinding(r.old_obligation_type) || isBinding(r.new_obligation_type))) c.modifiedRequirements += 1;
  }
  return c;
}

export function stakeholderImpact(rows) {
  const g = {};
  for (const r of rows) {
    for (const s of r.stakeholders || []) {
      g[s] ??= { name: s, rows: [], obligationChanges: 0 };
      g[s].rows.push(r);
      if (isObligationRelated(r)) g[s].obligationChanges += 1;
    }
  }
  return Object.values(g).sort((a, b) => b.rows.length - a.rows.length);
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(d) {
  if (!d) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d + "T00:00:00"));
}

export const sectionLabel = (r) =>
  r.old_section === r.new_section ? (r.new_section || r.old_section || "—") : `${r.old_section || "—"} → ${r.new_section || "—"}`;

export async function validatePdf(file) {
  if (!file) return "No file selected.";
  const looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksPdf) return "This is not a PDF. Choose a .pdf file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 4.4 MB.`;
  try {
    const head = await file.slice(0, 5).text();
    if (head !== "%PDF-") return "This file does not look like a valid PDF. It may be damaged or renamed.";
  } catch {}
  return null;
}

/** Word-level diff for highlighting. The concatenated tokens always equal the original text exactly. */
export function wordDiff(a, b) {
  const ta = (a || "").match(/\s+|[^\s]+/g) || [];
  const tb = (b || "").match(/\s+|[^\s]+/g) || [];
  if (!a || !b || ta.length * tb.length > 250000) {
    return { old: ta.map((t) => ({ t, k: "same" })), new: tb.map((t) => ({ t, k: "same" })) };
  }
  const n = ta.length, m = tb.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const oldOut = [], newOut = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { oldOut.push({ t: ta[i], k: "same" }); newOut.push({ t: tb[j], k: "same" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { oldOut.push({ t: ta[i], k: /^\s+$/.test(ta[i]) ? "same" : "del" }); i++; }
    else { newOut.push({ t: tb[j], k: /^\s+$/.test(tb[j]) ? "same" : "ins" }); j++; }
  }
  while (i < n) { oldOut.push({ t: ta[i], k: /^\s+$/.test(ta[i]) ? "same" : "del" }); i++; }
  while (j < m) { newOut.push({ t: tb[j], k: /^\s+$/.test(tb[j]) ? "same" : "ins" }); j++; }
  return { old: oldOut, new: newOut };
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
