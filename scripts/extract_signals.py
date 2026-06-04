"""
Phase 1 of the RGC assessment — offline signal extraction.

For each transcript, this script asks Claude to extract structured signals
WITH evidence phrases from the original text. The brief explicitly requires
that any suggested signal show the evidence behind it.

Run this ONCE tonight. The output (data/signals.json) is then read by the
backend at request time — no live API calls during the dashboard build.

Cost: ~$0.40 across 130 transcripts at claude-sonnet-4-5.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python scripts/extract_signals.py

Output:
    data/signals.json  — one entry per reviewId, with extracted signals + evidence
"""

import os
import json
import sys
import time
from pathlib import Path
from anthropic import Anthropic

# --- config ---
DATA_DIR = Path(__file__).parent.parent / "data"
TRANSCRIPTS = DATA_DIR / "transcripts.json"
OUTPUT = DATA_DIR / "signals.json"
MODEL = "claude-sonnet-4-5"

# --- extraction prompt ---
SYSTEM_PROMPT = """You are a commercial insights analyst extracting structured signals from consumer product review transcripts in the UK soft drinks category.

For each transcript, extract:

1. **themes** — 2-5 short tags describing what the review is fundamentally about (e.g. "head-to-head comparison", "mixer for cocktails", "natural taste preference"). Each tag must come with an exact phrase from the transcript as evidence.

2. **praise** — specific things the reviewer liked. Each item must include the exact phrase from the transcript.

3. **complaints** — specific things the reviewer disliked, or hesitations. Each item must include the exact phrase from the transcript. Empty array if none.

4. **usage_occasions** — when, how, or with what the product is being consumed (e.g. "with vodka", "in the evening", "as a mixer"). Each item must include the exact phrase from the transcript.

5. **competitor_mentions** — explicit references to other brands or products being compared. Include the brand name and the exact phrase. Empty array if none.

6. **purchase_drivers** — reasons the reviewer would or would not buy. Include the exact phrase. Empty array if none.

7. **headline_quote** — the single most quotable sentence (10-25 words) from the transcript that best captures the reviewer's overall take.

Rules:
- Every signal must include an `evidence` field with the EXACT phrase from the transcript. Do not paraphrase the evidence.
- If a category has nothing in the transcript, return an empty array — do not invent.
- Keep tags short (2-5 words). Keep evidence phrases short (5-20 words, but exact from transcript).
- Output valid JSON only, no preamble or explanation.

JSON schema:
{
  "themes": [{"tag": "string", "evidence": "exact phrase"}],
  "praise": [{"point": "string", "evidence": "exact phrase"}],
  "complaints": [{"point": "string", "evidence": "exact phrase"}],
  "usage_occasions": [{"occasion": "string", "evidence": "exact phrase"}],
  "competitor_mentions": [{"brand": "string", "context": "string", "evidence": "exact phrase"}],
  "purchase_drivers": [{"driver": "string", "direction": "for | against", "evidence": "exact phrase"}],
  "headline_quote": "string"
}"""


def extract_one(client, transcript):
    """Extract structured signals from one transcript record."""
    text = transcript.get("transcription", {}).get("text") if transcript.get("transcription") else None
    if not text:
        return None

    user_prompt = (
        f"Brand: {transcript['brand']}\n"
        f"Product: {transcript['votes'][0]['product']['name'] if transcript.get('votes') else 'unknown'}\n"
        f"Rating: {transcript['votes'][0]['rating'] if transcript.get('votes') else 'unknown'}/5\n"
        f"Sentiment (pre-tagged): {transcript['transcription']['sentiment']}\n\n"
        f"Transcript:\n{text}\n\n"
        f"Extract signals as specified. Output JSON only."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = response.content[0].text.strip()
    # Sometimes the model wraps JSON in ```json ... ```; strip if present.
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse failed for {transcript['reviewId']}: {e}")
        return {"error": "parse_failed", "raw": raw[:500]}


def main():
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("ERROR: ANTHROPIC_API_KEY not set in environment.")
        print("Run: export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    client = Anthropic()

    with open(TRANSCRIPTS) as f:
        transcripts = json.load(f)

    print(f"Loaded {len(transcripts)} transcripts.")

    # Resume support: if signals.json already exists, skip done ones.
    existing = {}
    if OUTPUT.exists():
        with open(OUTPUT) as f:
            existing = json.load(f)
        print(f"Found {len(existing)} already-extracted signals — resuming.")

    results = dict(existing)
    start = time.time()

    for i, t in enumerate(transcripts):
        rid = t["reviewId"]
        if rid in results:
            continue

        if not t.get("transcription") or not t["transcription"].get("text"):
            results[rid] = None
            print(f"[{i+1}/{len(transcripts)}] {rid} — no transcript, skipped")
            continue

        try:
            print(f"[{i+1}/{len(transcripts)}] {rid} ({t['brand']}) — extracting...", end=" ", flush=True)
            signals = extract_one(client, t)
            results[rid] = signals
            print("✓")
        except Exception as e:
            print(f"✗ error: {e}")
            results[rid] = {"error": str(e)}

        # Save after each one so a crash mid-run doesn't lose work.
        if (i + 1) % 10 == 0:
            with open(OUTPUT, "w") as f:
                json.dump(results, f, indent=2)
            elapsed = time.time() - start
            print(f"  → checkpoint saved ({len(results)} done, {elapsed:.0f}s elapsed)")

    # Final save
    with open(OUTPUT, "w") as f:
        json.dump(results, f, indent=2)

    elapsed = time.time() - start
    print(f"\n✅ Done. {len(results)} signals saved to {OUTPUT}")
    print(f"   Total time: {elapsed:.0f}s")


if __name__ == "__main__":
    main()
