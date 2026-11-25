export class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // "unavailable" | "invalid" | "server" | "request"
  }
}

async function apiFetch(path, opts = {}) {
  let r;
  try {
    r = await fetch(path, opts);
  } catch {
    throw new ApiError("unavailable", "The EcoTrack API could not be reached. Check that the backend is running and try again.");
  }
  if (!r.ok) {
    let detail = `Request failed with status ${r.status}.`;
    try {
      const j = await r.json();
      if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    const kind = r.status === 422 || r.status === 413 ? "invalid" : r.status >= 500 ? "server" : r.status === 404 ? "unavailable" : "request";
    throw new ApiError(kind, detail);
  }
  return r;
}

const postJSON = (path, body) =>
  apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export async function getHealth() {
  const r = await apiFetch("/api/health");
  return r.json();
}

export async function extractPdf(file, version) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("version", version);
  return (await apiFetch("/api/extract", { method: "POST", body: fd })).json();
}

export async function compareParagraphs(oldParas, newParas) {
  return (await postJSON("/api/compare", { old: oldParas, new: newParas })).json();
}

export async function analyzeItems(items) {
  return (await postJSON("/api/analyze", { items })).json();
}

export async function fetchReport(rows, meta) {
  return (await postJSON("/api/report", { rows, meta })).blob();
}
