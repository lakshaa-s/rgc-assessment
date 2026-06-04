"""
RGC Assessment — FastAPI backend.

Loads the four data files + the pre-extracted signals.json at startup,
and exposes endpoints the React frontend can query.

Endpoints:
  GET /                        — health check
  GET /brands                  — list of all brands with summary metrics
  GET /brands/{brand}          — single brand detail (products + transcripts + aggregated signals)
  GET /transcripts             — list of transcripts (filterable by brand/sentiment)
  GET /transcripts/{review_id} — single transcript with signals + evidence
  GET /products                — all products with brand context
  GET /insights/positioning    — KEY commercial view: brand positioning vs reviewer voice
"""

import json
from collections import Counter
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- setup ---

DATA = Path(__file__).parent.parent / "data"

app = FastAPI(title="RGC Insights API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if we have time
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- load data once at startup ---

with open(DATA / "transcripts.json") as f:
    TRANSCRIPTS = json.load(f)

with open(DATA / "users.json") as f:
    USERS = json.load(f)

with open(DATA / "signals.json") as f:
    SIGNALS = json.load(f)

import numpy as np

PRODUCTS_DF = pd.read_csv(DATA / "products.csv")
BRANDS_DF = pd.read_csv(DATA / "brands.csv")


def df_to_records(df):
    """Convert a DataFrame to JSON-safe list-of-dicts (replaces NaN with None)."""
    return df.replace({np.nan: None}).to_dict(orient="records")


def row_to_dict(row):
    """Convert a single DataFrame row to a JSON-safe dict."""
    d = row.to_dict()
    return {k: (None if isinstance(v, float) and pd.isna(v) else v) for k, v in d.items()}

# Index users by personId for quick lookup
USERS_BY_ID = {u["personId"]: u for u in USERS}


# --- helpers ---

def transcript_summary(t):
    """Compact summary of a transcript for list views."""
    transcription = t.get("transcription") or {}
    votes = t.get("votes") or [{}]
    would_buy = t.get("wouldBuy") or [{}]

    return {
        "reviewId": t["reviewId"],
        "brand": t["brand"],
        "productId": t.get("productId"),
        "productName": votes[0].get("product", {}).get("name") if votes else None,
        "rating": votes[0].get("rating") if votes else None,
        "sentiment": transcription.get("sentiment"),
        "wordCount": transcription.get("wordCount"),
        "wouldBuyFirst": would_buy[0].get("wouldBuyInTheFirstPlace") if would_buy else None,
        "wouldBuyAfter": would_buy[0].get("wouldBuyAfterTrying") if would_buy else None,
        "headlineQuote": SIGNALS.get(t["reviewId"], {}).get("headline_quote") if SIGNALS.get(t["reviewId"]) else None,
    }


def aggregate_brand_signals(brand_name):
    """Aggregate signals across all transcripts for one brand."""
    brand_transcripts = [t for t in TRANSCRIPTS if t["brand"] == brand_name]
    if not brand_transcripts:
        return None

    themes = Counter()
    praise = []
    complaints = []
    usage_occasions = Counter()
    competitor_mentions = Counter()
    headline_quotes = []
    sentiments = Counter()
    ratings = []
    would_buy_first = Counter()
    would_buy_after = Counter()

    for t in brand_transcripts:
        rid = t["reviewId"]
        sig = SIGNALS.get(rid) or {}

        # Skip transcripts where extraction failed
        if isinstance(sig, dict) and "error" not in sig:
            for theme in sig.get("themes", []):
                themes[theme["tag"]] += 1
            for p in sig.get("praise", []):
                praise.append({**p, "reviewId": rid})
            for c in sig.get("complaints", []):
                complaints.append({**c, "reviewId": rid})
            for u in sig.get("usage_occasions", []):
                usage_occasions[u["occasion"]] += 1
            for m in sig.get("competitor_mentions", []):
                competitor_mentions[m["brand"]] += 1
            if sig.get("headline_quote"):
                headline_quotes.append({"quote": sig["headline_quote"], "reviewId": rid})

        # Pre-tagged sentiment + ratings
        transcription = t.get("transcription") or {}
        if transcription.get("sentiment"):
            sentiments[transcription["sentiment"]] += 1
        votes = t.get("votes") or [{}]
        if votes and votes[0].get("rating") is not None:
            ratings.append(votes[0]["rating"])
        wb = t.get("wouldBuy") or [{}]
        if wb:
            if wb[0].get("wouldBuyInTheFirstPlace"):
                would_buy_first[wb[0]["wouldBuyInTheFirstPlace"]] += 1
            if wb[0].get("wouldBuyAfterTrying"):
                would_buy_after[wb[0]["wouldBuyAfterTrying"]] += 1

    return {
        "transcriptCount": len(brand_transcripts),
        "avgRating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "sentimentMix": dict(sentiments),
        "wouldBuyFirst": dict(would_buy_first),
        "wouldBuyAfter": dict(would_buy_after),
        "topThemes": themes.most_common(8),
        "topUsageOccasions": usage_occasions.most_common(8),
        "competitorMentions": competitor_mentions.most_common(8),
        "praise": praise,
        "complaints": complaints,
        "headlineQuotes": headline_quotes,
    }


# --- endpoints ---

@app.get("/")
def health():
    return {
        "status": "ok",
        "data": {
            "transcripts": len(TRANSCRIPTS),
            "users": len(USERS),
            "products": len(PRODUCTS_DF),
            "brands": len(BRANDS_DF),
            "signals_extracted": len([s for s in SIGNALS.values() if s and "error" not in (s or {})]),
        },
    }


@app.get("/brands")
def list_brands():
    """List all brands with their breakthrough score, product count, and whether they have transcripts."""
    brands = df_to_records(BRANDS_DF)
    transcript_brands = {t["brand"] for t in TRANSCRIPTS}

    enriched = []
    for b in brands:
        name = b.get("brand_name")
        product_count = len(PRODUCTS_DF[PRODUCTS_DF["brand"] == name])
        has_transcripts = name in transcript_brands
        transcript_count = sum(1 for t in TRANSCRIPTS if t["brand"] == name)

        enriched.append({
            **b,
            "productCount": product_count,
            "hasTranscripts": has_transcripts,
            "transcriptCount": transcript_count,
        })

    # Sort by breakthrough_score desc
    enriched.sort(key=lambda x: x.get("breakthrough_score") or 0, reverse=True)
    return enriched


@app.get("/brands/{brand_name}")
def brand_detail(brand_name: str):
    """Full brand detail — context + products + aggregated signals."""
    brand_row = BRANDS_DF[BRANDS_DF["brand_name"] == brand_name]
    if brand_row.empty:
        raise HTTPException(404, f"Brand '{brand_name}' not found")

    brand = row_to_dict(brand_row.iloc[0])
    products = df_to_records(PRODUCTS_DF[PRODUCTS_DF["brand"] == brand_name])
    signals = aggregate_brand_signals(brand_name)

    transcripts = [transcript_summary(t) for t in TRANSCRIPTS if t["brand"] == brand_name]

    return {
        "brand": brand,
        "products": products,
        "signals": signals,
        "transcripts": transcripts,
    }


@app.get("/transcripts")
def list_transcripts(brand: str | None = None, sentiment: str | None = None):
    """List transcripts with optional filters."""
    result = TRANSCRIPTS
    if brand:
        result = [t for t in result if t["brand"] == brand]
    if sentiment:
        result = [
            t for t in result
            if (t.get("transcription") or {}).get("sentiment") == sentiment.upper()
        ]
    return [transcript_summary(t) for t in result]


@app.get("/transcripts/{review_id}")
def transcript_detail(review_id: str):
    """Full transcript text + extracted signals + reviewer info."""
    t = next((x for x in TRANSCRIPTS if x["reviewId"] == review_id), None)
    if not t:
        raise HTTPException(404, "Transcript not found")

    user = USERS_BY_ID.get(t["personId"])
    signals = SIGNALS.get(review_id)

    return {
        "transcript": t,
        "signals": signals,
        "user": user,
    }


@app.get("/products")
def list_products(brand: str | None = None):
    """All products, optionally filtered by brand."""
    df = PRODUCTS_DF
    if brand:
        df = df[df["brand"] == brand]
    return df_to_records(df)


@app.get("/insights/positioning")
def positioning_vs_voice():
    """
    KEY commercial view — for each brand with transcripts, compare the brand's
    stated positioning (from products data) against what reviewers actually said.
    """
    transcript_brands = {t["brand"] for t in TRANSCRIPTS}
    results = []

    for brand in transcript_brands:
        signals = aggregate_brand_signals(brand)
        if not signals:
            continue

        # Brand-level context
        brand_row = BRANDS_DF[BRANDS_DF["brand_name"] == brand]
        brand_info = row_to_dict(brand_row.iloc[0]) if not brand_row.empty else {}

        # Aggregate stated positioning from products
        brand_products = PRODUCTS_DF[PRODUCTS_DF["brand"] == brand]
        stated_positioning = []
        target_users = []
        usage_scenarios = []
        claims = []
        for _, p in brand_products.iterrows():
            for col in ["market_positioning", "positioning"]:
                if col in p and p[col]:
                    stated_positioning.append(str(p[col]))
            for col in ["target_users", "target_user"]:
                if col in p and p[col]:
                    target_users.append(str(p[col]))
            for col in ["usage_scenarios", "usage_scenario"]:
                if col in p and p[col]:
                    usage_scenarios.append(str(p[col]))
            for col in ["claims", "health_claims"]:
                if col in p and p[col]:
                    claims.append(str(p[col]))

        results.append({
            "brand": brand,
            "breakthroughScore": brand_info.get("breakthrough_score"),
            "stated": {
                "positioning": stated_positioning,
                "targetUsers": target_users,
                "usageScenarios": usage_scenarios,
                "claims": claims,
            },
            "voice": {
                "topThemes": signals["topThemes"],
                "topUsageOccasions": signals["topUsageOccasions"],
                "competitorMentions": signals["competitorMentions"],
                "praise": signals["praise"][:5],
                "complaints": signals["complaints"][:5],
                "sentimentMix": signals["sentimentMix"],
                "avgRating": signals["avgRating"],
            },
        })

    return results
