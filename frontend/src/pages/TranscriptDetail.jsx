import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

function highlightEvidence(text, evidencePhrases) {
  // Mark all evidence phrases in the transcript text
  let result = text;
  evidencePhrases.forEach((phrase) => {
    if (!phrase) return;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    result = result.replace(re, "@@HL@@$1@@/HL@@");
  });

  const parts = result.split(/(@@HL@@.*?@@\/HL@@)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@@HL@@")) {
      const inner = part.replace(/@@HL@@/, "").replace(/@@\/HL@@/, "");
      return <span key={i} className="evidence-highlight">{inner}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function TranscriptDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.transcript(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="loading">Error: {error}</div>;
  if (!data) return <div className="loading">Loading transcript…</div>;

  const { transcript, signals, user } = data;
  const text = transcript.transcription?.text || "";

  const evidencePhrases = [];
  if (signals && !signals.error) {
    (signals.themes || []).forEach((t) => evidencePhrases.push(t.evidence));
    (signals.praise || []).forEach((p) => evidencePhrases.push(p.evidence));
    (signals.complaints || []).forEach((c) => evidencePhrases.push(c.evidence));
    (signals.usage_occasions || []).forEach((u) => evidencePhrases.push(u.evidence));
    (signals.competitor_mentions || []).forEach((m) => evidencePhrases.push(m.evidence));
  }

  return (
    <div>
      <Link to="/transcripts" className="back-link">← All transcripts</Link>

      <h1 className="page-title">
        {transcript.brand} — {transcript.votes?.[0]?.product?.name || "—"}
      </h1>
      <p className="page-subtitle">
        Rating: {transcript.votes?.[0]?.rating || "—"}/5 ·
        Sentiment: {transcript.transcription?.sentiment || "—"} ·
        Word count: {transcript.transcription?.wordCount || "—"}
      </p>

      <div className="detail-grid">
        <div>
          <div className="section">
            <h2>Transcript</h2>
            <p className="section-sub">Highlighted phrases are evidence for the extracted signals.</p>
            <div className="transcript-text">
              {evidencePhrases.length > 0 ? highlightEvidence(text, evidencePhrases) : text}
            </div>
          </div>
        </div>

        <div>
          {signals && !signals.error && (
            <>
              {signals.headline_quote && (
                <div className="section">
                  <h2>Headline</h2>
                  <p style={{ fontStyle: "italic", fontSize: 15, margin: 0 }}>"{signals.headline_quote}"</p>
                </div>
              )}

              {signals.themes && signals.themes.length > 0 && (
                <div className="section">
                  <h2>Themes</h2>
                  <div className="theme-list">
                    {signals.themes.map((t, i) => (
                      <span key={i} className="theme-pill">{t.tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {signals.praise && signals.praise.length > 0 && (
                <div className="section">
                  <h2>Praise</h2>
                  {signals.praise.map((p, i) => (
                    <div key={i} className="evidence-item praise">
                      <p className="evidence-point">{p.point}</p>
                      <p className="evidence-quote">"{p.evidence}"</p>
                    </div>
                  ))}
                </div>
              )}

              {signals.complaints && signals.complaints.length > 0 && (
                <div className="section">
                  <h2>Complaints</h2>
                  {signals.complaints.map((c, i) => (
                    <div key={i} className="evidence-item complaint">
                      <p className="evidence-point">{c.point}</p>
                      <p className="evidence-quote">"{c.evidence}"</p>
                    </div>
                  ))}
                </div>
              )}

              {signals.usage_occasions && signals.usage_occasions.length > 0 && (
                <div className="section">
                  <h2>Usage occasions</h2>
                  {signals.usage_occasions.map((u, i) => (
                    <div key={i} className="evidence-item">
                      <p className="evidence-point">{u.occasion}</p>
                      <p className="evidence-quote">"{u.evidence}"</p>
                    </div>
                  ))}
                </div>
              )}

              {signals.competitor_mentions && signals.competitor_mentions.length > 0 && (
                <div className="section">
                  <h2>Competitor mentions</h2>
                  {signals.competitor_mentions.map((m, i) => (
                    <div key={i} className="evidence-item">
                      <p className="evidence-point">{m.brand} — {m.context}</p>
                      <p className="evidence-quote">"{m.evidence}"</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {user && (
            <div className="section">
              <h2>Reviewer</h2>
              <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
                Anonymised profile · ID: <code>{user.personId?.slice(0, 12)}…</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
