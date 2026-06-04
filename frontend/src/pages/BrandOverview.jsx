import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { api } from "../lib/api.js";

function scoreClass(score) {
  if (score === null || score === undefined) return "";
  if (score >= 35) return "brand-score-high";
  if (score >= 20) return "brand-score-mid";
  return "brand-score-low";
}

export default function BrandOverview() {
  const [brands, setBrands] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.brands().then(setBrands).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!brands) return <div className="loading">Loading brands…</div>;

  const chartData = brands.map((b) => ({
    name: b.brand_name,
    score: b.breakthrough_score ? Number(b.breakthrough_score.toFixed(1)) : 0,
    hasTranscripts: b.hasTranscripts,
  }));

  const reviewed = brands.filter((b) => b.hasTranscripts);
  const context = brands.filter((b) => !b.hasTranscripts);

  return (
    <div>
      <h1 className="page-title">Soft drinks category — at a glance</h1>
      <p className="page-subtitle">
        Nine brands, four with reviewer transcripts and five providing competitive context.
        Sorted by Breakthrough Score — RGC's success-prediction metric.
      </p>

      <div className="section">
        <h2>Breakthrough Score by brand</h2>
        <p className="section-sub">
          Higher = stronger predicted commercial success. Reviewed brands shown in blue;
          competitor-context brands in grey.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 16, left: -8, bottom: 8 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} dy={10} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="score">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.hasTranscripts ? "#2a4880" : "#c8c4ba"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="section-sub" style={{ marginTop: 12, fontStyle: "italic" }}>
          <strong>Notable:</strong> the three highest-scoring brands ({chartData.slice(0,3).map(c=>c.name).join(", ")})
          have no reviewer transcripts, while the reviewed brands sit further down. The dashboard's
          job is to connect consumer voice from the reviewed brands with positioning data from the
          higher-scoring competitors.
        </p>
      </div>

      <div className="section">
        <h2>Reviewed brands ({reviewed.length})</h2>
        <p className="section-sub">Consumer-voice data available — click for signals + evidence.</p>
        <div className="brand-grid">
          {reviewed.map((b) => (
            <BrandCard key={b.brand_name} brand={b} reviewed />
          ))}
        </div>
      </div>

      <div className="section">
        <h2>Competitor context ({context.length})</h2>
        <p className="section-sub">No transcripts, but full product, retail, and positioning data.</p>
        <div className="brand-grid">
          {context.map((b) => (
            <BrandCard key={b.brand_name} brand={b} reviewed={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandCard({ brand, reviewed }) {
  return (
    <Link to={`/brand/${encodeURIComponent(brand.brand_name)}`} style={{ textDecoration: "none" }}>
      <div className="brand-card">
        <div className="brand-card-header">
          <h3 className="brand-name">{brand.brand_name}</h3>
          <span className={`brand-score ${scoreClass(brand.breakthrough_score)}`}>
            {brand.breakthrough_score ? brand.breakthrough_score.toFixed(1) : "—"}
          </span>
        </div>
        <div>
          <span className={`tag ${reviewed ? "tag-transcript" : "tag-context"}`}>
            {reviewed ? `${brand.transcriptCount} transcripts` : "Competitor context"}
          </span>
          <span className="tag">{brand.productCount} products</span>
        </div>
        <div className="brand-meta">
          {brand.hq_city || "—"} · founded {brand.founded_year || "—"}
        </div>
      </div>
    </Link>
  );
}
