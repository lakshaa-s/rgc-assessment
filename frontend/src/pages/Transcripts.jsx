import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Transcripts() {
  const [transcripts, setTranscripts] = useState(null);
  const [brand, setBrand] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.transcripts({ brand, sentiment }).then(setTranscripts);
  }, [brand, sentiment]);

  if (!transcripts) return <div className="loading">Loading transcripts…</div>;

  const filtered = transcripts.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.productName || "").toLowerCase().includes(s) ||
      (t.brand || "").toLowerCase().includes(s) ||
      (t.headlineQuote || "").toLowerCase().includes(s)
    );
  });

  const brands = [...new Set(transcripts.map((t) => t.brand))].sort();

  return (
    <div>
      <h1 className="page-title">Transcripts ({filtered.length})</h1>
      <p className="page-subtitle">
        Browse reviewer transcripts with extracted signals. Click any card to view the full text
        with evidence highlighting.
      </p>

      <div className="filters">
        <input
          type="text"
          placeholder="Search product / headline…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
          <option value="">All sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="MIXED">Mixed</option>
          <option value="NEGATIVE">Negative</option>
          <option value="NEUTRAL">Neutral</option>
        </select>
      </div>

      <div className="transcript-list">
        {filtered.map((t) => (
          <Link key={t.reviewId} to={`/transcripts/${t.reviewId}`} style={{ textDecoration: "none" }}>
            <div className="transcript-card">
              <div className="transcript-header">
                <span className="transcript-brand">
                  {t.brand} — {t.productName}
                </span>
                <span className={`transcript-sentiment sentiment-${t.sentiment}`}>
                  {t.sentiment || "—"} · {t.rating ? `${t.rating}/5` : "—"}
                </span>
              </div>
              <p className="transcript-quote">"{t.headlineQuote || "(no quote extracted)"}"</p>
              <div className="transcript-meta">
                Would buy first: {t.wouldBuyFirst || "—"} · After trying: {t.wouldBuyAfter || "—"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
