import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

export default function BrandDetail() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api.brand(name).then(setData).catch((e) => setError(e.message));
  }, [name]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return <div className="loading">Loading {name}…</div>;

  const { brand, products, signals, transcripts } = data;
  const hasVoice = signals && signals.transcriptCount > 0;

  // Aggregate stated positioning from products
  const positioning = [];
  const targetUsers = [];
  const usageScenarios = [];
  products.forEach((p) => {
    ["market_positioning", "positioning"].forEach((c) => {
      if (p[c]) positioning.push(p[c]);
    });
    ["target_users", "target_user"].forEach((c) => {
      if (p[c]) targetUsers.push(p[c]);
    });
    ["usage_scenarios", "usage_scenario"].forEach((c) => {
      if (p[c]) usageScenarios.push(p[c]);
    });
  });

  return (
    <div>
      <Link to="/" className="back-link">← All brands</Link>

      <div className="detail-header">
        <div>
          <h1 className="page-title">{brand.brand_name}</h1>
          <p className="page-subtitle">
            {brand.hq_city || "—"} · founded {brand.founded_year || "—"}
            {brand.industry ? ` · ${brand.industry}` : ""}
          </p>
        </div>
        <div className="detail-scores">
          <div className="score-pill">
            <div className="label">Breakthrough</div>
            <div className="value">
              {brand.breakthrough_score ? brand.breakthrough_score.toFixed(1) : "—"}
            </div>
          </div>
          <div className="score-pill">
            <div className="label">Momentum</div>
            <div className="value">
              {brand.momentum_score ? brand.momentum_score.toFixed(1) : "—"}
            </div>
          </div>
          <div className="score-pill">
            <div className="label">Popularity</div>
            <div className="value">
              {brand.popularity_score ? brand.popularity_score.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>

      {brand.description && (
        <div className="section">
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#444" }}>
            {brand.description}
          </p>
        </div>
      )}

      {/* THE KEY INSIGHT: positioning vs voice */}
      {hasVoice && (
        <div className="section">
          <h2>Positioning vs consumer voice</h2>
          <p className="section-sub">
            What the brand is positioned for, vs what reviewers actually talk about.
          </p>
          <div className="positioning-compare">
            <div>
              <h4>What the brand says</h4>
              {positioning.length === 0 && targetUsers.length === 0 && usageScenarios.length === 0 ? (
                <p style={{ color: "#999", fontStyle: "italic" }}>No positioning data in products.</p>
              ) : (
                <>
                  {positioning.slice(0, 3).map((p, i) => (
                    <p key={`p${i}`}>{p}</p>
                  ))}
                  {targetUsers.slice(0, 2).map((u, i) => (
                    <p key={`u${i}`}><em>Target:</em> {u}</p>
                  ))}
                  {usageScenarios.slice(0, 2).map((u, i) => (
                    <p key={`s${i}`}><em>Scenario:</em> {u}</p>
                  ))}
                </>
              )}
            </div>
            <div>
              <h4>What reviewers say</h4>
              <p><em>Top themes:</em></p>
              <div className="theme-list">
                {signals.topThemes.slice(0, 6).map((t) => (
                  <span key={t.tag} className="theme-pill">
                    {t.tag} <span className="theme-count">{t.count}</span>
                  </span>
                ))}
              </div>
              {signals.topUsageOccasions.length > 0 && (
                <>
                  <p style={{ marginTop: 12 }}><em>Usage occasions in transcripts:</em></p>
                  <div className="theme-list">
                    {signals.topUsageOccasions.slice(0, 6).map((u) => (
                      <span key={u.occasion} className="theme-pill">
                        {u.occasion} <span className="theme-count">{u.count}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasVoice && (
        <div className="section">
          <h2>Consumer voice</h2>
          <p style={{ color: "#999", fontStyle: "italic", margin: 0 }}>
            No reviewer transcripts available for this brand. This brand is included for category,
            retail, and competitive context only.
          </p>
        </div>
      )}

      {hasVoice && (
        <div className="detail-grid">
          <div className="section">
            <h2>What customers love ({signals.praise.length})</h2>
            <p className="section-sub">Praise from transcripts, with the supporting phrase.</p>
            {signals.praise.slice(0, 6).map((p, i) => (
              <div key={i} className="evidence-item praise">
                <p className="evidence-point">{p.point}</p>
                <p className="evidence-quote">"{p.evidence}"</p>
              </div>
            ))}
            {signals.praise.length === 0 && (
              <p style={{ color: "#999", fontStyle: "italic" }}>No specific praise extracted.</p>
            )}
          </div>

          <div className="section">
            <h2>What frustrates customers ({signals.complaints.length})</h2>
            <p className="section-sub">Complaints or hesitations, with the supporting phrase.</p>
            {signals.complaints.slice(0, 6).map((c, i) => (
              <div key={i} className="evidence-item complaint">
                <p className="evidence-point">{c.point}</p>
                <p className="evidence-quote">"{c.evidence}"</p>
              </div>
            ))}
            {signals.complaints.length === 0 && (
              <p style={{ color: "#999", fontStyle: "italic" }}>No specific complaints extracted.</p>
            )}
          </div>
        </div>
      )}

      {hasVoice && signals.competitorMentions.length > 0 && (
        <div className="section">
          <h2>Competitor mentions</h2>
          <p className="section-sub">
            Other brands reviewers explicitly compared this one to.
          </p>
          <div className="theme-list">
            {signals.competitorMentions.map((m) => (
              <span key={m.brand} className="theme-pill">
                {m.brand} <span className="theme-count">{m.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>Products ({products.length})</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          {products.map((p) => (
            <li key={p.id || p.name}>
              <strong>{p.name}</strong>
              {p.price ? ` — £${p.price}` : ""}
              {p.category ? ` · ${p.category}` : ""}
            </li>
          ))}
        </ul>
      </div>

      {hasVoice && transcripts.length > 0 && (
        <div className="section">
          <h2>Transcripts ({transcripts.length})</h2>
          <div className="transcript-list">
            {transcripts.slice(0, 6).map((t) => (
              <Link key={t.reviewId} to={`/transcripts/${t.reviewId}`} style={{ textDecoration: "none" }}>
                <div className="transcript-card">
                  <div className="transcript-header">
                    <span className="transcript-brand">{t.productName}</span>
                    <span className={`transcript-sentiment sentiment-${t.sentiment}`}>
                      {t.sentiment} · {t.rating}/5
                    </span>
                  </div>
                  <p className="transcript-quote">"{t.headlineQuote || "(no quote)"}"</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
