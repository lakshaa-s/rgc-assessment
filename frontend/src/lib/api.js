const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function get(path) {
  const r = await fetch(`${API_URL}${path}`);
  if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  brands: () => get("/brands"),
  brand: (name) => get(`/brands/${encodeURIComponent(name)}`),
  transcripts: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.sentiment) params.set("sentiment", filters.sentiment);
    const q = params.toString() ? `?${params}` : "";
    return get(`/transcripts${q}`);
  },
  transcript: (id) => get(`/transcripts/${id}`),
  positioning: () => get("/insights/positioning"),
};
