import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import BrandOverview from "./pages/BrandOverview.jsx";
import BrandDetail from "./pages/BrandDetail.jsx";
import Transcripts from "./pages/Transcripts.jsx";
import TranscriptDetail from "./pages/TranscriptDetail.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="logo">RGC Insights</Link>
            <nav className="nav">
              <Link to="/">Brands</Link>
              <Link to="/transcripts">Transcripts</Link>
            </nav>
          </div>
          <p className="tagline">Soft drinks category — consumer voice meets brand intelligence</p>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<BrandOverview />} />
            <Route path="/brand/:name" element={<BrandDetail />} />
            <Route path="/transcripts" element={<Transcripts />} />
            <Route path="/transcripts/:id" element={<TranscriptDetail />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>RGC Technical Assessment · Lakshaa Srishankar · June 2026</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
