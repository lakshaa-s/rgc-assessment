# RGC Technical Assessment — Submission Notes

**Lakshaa Srishankar** · June 4, 2026
Live app: https://rgc-assessment.vercel.app
Repository: https://github.com/lakshaa-s/rgc-assessment

---

## What I built

A three-page dashboard that helps a brand, product, or insights team understand a soft drinks category dataset by connecting consumer voice (reviewer transcripts) with brand and product intelligence.

The headline feature: for every transcript, the app shows **extracted commercial signals tied to the exact phrase from the transcript that supports them**. The brief explicitly asked for evidence behind any suggested signal — I built that as the centrepiece rather than as an afterthought.

## The main views

### 1. Brand Overview (`/`)

Single-page summary of the category. The headline chart is a Breakthrough Score bar chart with the 9 brands coloured by whether they have reviewer transcripts (blue) or are competitor-only context (grey).

Below that, two grids of brand cards — one for the 4 reviewed brands (with transcript count) and one for the 5 competitor-context brands (no transcripts but full product/positioning data). Each card shows the brand's Breakthrough Score, HQ location, founding year, and number of products.

### 2. Brand Detail (`/brand/:name`)

For a single brand, this is the page that does the most commercial work. Top of the page: brand context (description, industry) plus Breakthrough / Momentum / Popularity scores as pills.

The key section is **"Positioning vs consumer voice"** — a side-by-side panel that shows what the brand is officially positioned for (drawn from the product-level positioning, target users, and usage scenarios in `products.csv`) against what reviewers actually said in their transcripts (top themes and usage occasions extracted from the transcripts). This is the commercial insight feature — it's where a brand or category team would spend the most time.

Below that:
- **"What customers love"** — extracted praise with the exact supporting quote
- **"What frustrates customers"** — extracted complaints with the exact supporting quote
- **Competitor mentions** — other brands reviewers compared this one to, counted across transcripts
- **Products** for that brand
- **Transcripts** — a short list with headline quotes, linking to the full transcript view

For competitor-context brands (no transcripts), the page shows the brand context, scores, and products only — no consumer-voice section. The page is deliberately honest about the absence rather than faking it.

### 3. Transcripts (`/transcripts` and `/transcripts/:id`)

The list page is a filterable browser — by brand, by sentiment, plus a free-text search across product names, brand names, and the headline quote. Each card shows the brand, product, sentiment, rating, would-buy intent, and the AI-generated headline quote.

Click a transcript and you get the full text plus the extracted signals — themes, praise, complaints, usage occasions, competitor mentions, purchase drivers. The transcript text itself has the evidence phrases highlighted in yellow, so the user can see which sentences back which tags. This was deliberate: it makes the AI extraction *auditable* rather than a black box.

## Key insights I found in the data

A few patterns that came out once the signal extraction had run across all 130 transcripts:

1. **The Breakthrough Score gap.** The three highest-scoring brands (Trip, DASH, Hip Pop) have no reviewer transcripts. The reviewed brands sit further down the table. This is by design in the dataset, but it shapes the dashboard's commercial story: consumer voice from the reviewed brands, positioning context from the higher-scoring competitors, and the side-by-side view that connects them.

2. **Double Dutch's natural-taste positioning is consumer-validated.** The product data positions Double Dutch around "premium," "flavour-driven," and "natural" — and reviewers genuinely echo that. Top praise themes include "natural taste without artificial aftertaste" and "more gentle and refined flavour." Reviewers spontaneously compare it favourably to Schweppes on this exact dimension. This is the cleanest case in the dataset of stated positioning matching observed voice.

3. **Competitor mentions are mostly Schweppes.** When reviewers reach for a comparison, it's almost always Schweppes — even when they're reviewing a brand positioned more like a wellness drink (Fix8, kombucha). This suggests Schweppes is the default mental anchor for "mixer" across reviewers regardless of the actual product being tested, which is useful intel for any of the reviewed brands thinking about positioning.

4. **Usage occasions skew heavily towards alcohol mixing.** Across the reviewed brands, the most common usage occasions are "with vodka", "with gin", "as a mixer", "for cocktails". This is partly an artefact of the head-to-head mixer challenge format in the dataset, but it's a real piece of category intel: reviewers default to alcohol-mixing as the framing even when the product is marketed as a standalone drink (e.g. Fix8 kombucha).

5. **"Would buy in the first place" vs "would buy after trying"** is a quietly informative signal. Several reviewers flip from "No" to "Yes" after trying — Double Dutch in particular. That gap is a measurable marker of trial-to-conversion potential, and a brand could use it to argue for sampling-led promotion. The dashboard surfaces both fields on each transcript card.

## How I connected transcript / user signals with product, retail, and brand intelligence

Three explicit joins are used:

- **Transcripts → Products** by `productId`, surfacing the product being reviewed.
- **Products → Brands** by `brand`, surfacing brand-level scores (Breakthrough, Momentum, Popularity) and brand context.
- **Aggregated transcript signals → Brand positioning data**, displayed side-by-side on the Brand Detail page.

This last one is the commercial join — taking the extracted themes/praise/complaints across all of a brand's transcripts and putting them next to the stated positioning, target users, and usage scenarios from the products data. The data joining is one-direction (transcripts → context), but the *visual* join is bidirectional — you can read both sides at once.

I deliberately ignored several columns:
- Most of the social/web metrics in `brands.csv` (instagram_handle, tiktok_handle, etc.) — not useful in a 24-hour timebox without an engagement-data feed
- Most of the structured product attributes (ingredients, pack size, claims) — included only in the positioning aggregation, not displayed as their own view
- User onboarding answers in `users.json` — would be powerful for segmentation work but felt out of scope for a first build

The brief explicitly invited this kind of selection. I chose what supported the commercial story and ignored the rest.

## Assumptions, limitations, tradeoffs

- **The AI extraction is the centrepiece.** I prioritised making it explainable (evidence highlighting on the transcript view) over making the dashboard wider. If I'd had less confidence in the extraction quality, the page count would be lower.
- **Offline extraction.** Signals are extracted once, saved to `signals.json`, and read at runtime. The dashboard does not call Claude live. This makes the app fast and free to host but means any new transcripts require re-running the script. For a real product this should be event-driven on transcript ingestion.
- **Render free tier sleeps after 15 min.** First request after sleep takes ~30s to wake. Production would be on a paid tier.
- **No agreement scoring (yet).** The positioning-vs-voice panel shows both sides but doesn't programmatically score how well they match. That's the next thing I would build (see below).
- **No design system.** The CSS is plain and consistent but isn't from a component library. Per the brief's "not pixel-perfect" guidance.
- **Sentiment used as-is.** The dataset comes with pre-tagged sentiment per transcript and I used it. I didn't try to recompute or override it from the LLM extraction.

## How I used AI

- **Signal extraction (offline):** Claude (`claude-sonnet-4-5`) via the Anthropic API. ~$0.40 total cost across all 130 transcripts. The prompt is explicit about the JSON schema and about requiring exact-phrase evidence; I spot-checked ~10 outputs manually before committing.
- **Pair-programming throughout:** Claude.ai for the React layout, API endpoint design, debugging (a JSON-NaN serialisation issue, a deployment-URL mismatch), CSS decisions. I treat Claude as the default rubber-duck plus boilerplate generator and the working log makes that visible.
- **Verification:** I tested every endpoint locally before deploying. The Render logs and Vercel deployment confirm both ends are alive. The signal extraction was checked against the raw transcripts.

## What I'd improve with more time

In priority order:

1. **Automated agreement scoring** between stated positioning and observed reviewer themes. Currently the user can read both panels and draw their own conclusions — a sensible MVP, but a *score* (e.g. "this brand's positioning matches reviewer voice 68% of the way") would make the insight commercial-ready.

2. **Aspect-level sentiment.** Rather than one sentiment label per transcript, extract sentiment per aspect (taste, packaging, price, occasion-fit). This is a small extension of the existing extraction prompt — would give a much richer brand-level view ("taste positive, packaging mixed, price negative").

3. **Co-consumption / occasion network.** The usage occasions data already mentions specific co-consumption ("with vodka", "after a workout", "with friends"). With more transcripts this becomes a network that retailers and brand teams would find genuinely useful for product placement and bundle pricing.

4. **Wider competitor pull.** The dataset includes 5 competitor-context brands with no transcripts. With more time I'd integrate a Companies House / Beauhurst-style feed and live retailer data to make the competitive context less static — show *trajectory*, not just snapshot.

5. **A "what to investigate next" insight card.** A short LLM-generated section per brand that synthesises the praise/complaints/positioning gap into 2-3 actionable observations for the commercial team. Right now the dashboard *surfaces* signals; this layer would *narrate* them.

6. **Reviewer segments.** `users.json` has shopper archetypes, behavioural tags, and onboarding answers — none of which I used. Linking transcripts to reviewer segments would let the dashboard answer "which segments love Double Dutch?" and "are SKIP's complaints concentrated in a specific archetype?"

7. **Better robustness.** Tests for the signal extraction (does it always return valid JSON?), retry logic on the LLM call, more graceful loading states on the frontend. None of these block usefulness today but would matter for a real deployment.

## What I'd want access to

Two specific things would make the dashboard sharper:

- **Time series.** All the metrics here are snapshots. A 12-month trend on Breakthrough Score, ratings, and review sentiment would change the conversation from "where does this brand sit?" to "where is this brand going?"
- **Wider transcript coverage.** The 4-brand transcript sample is enough to demonstrate the pattern but not enough to draw category-level claims. Even 10-15 transcripts per brand across all 9 would unlock proper cross-brand comparisons of consumer voice.

---

## Closing thought

The brief said "we are not looking for a perfect production system; we are looking for clear thinking, thoughtful prioritisation, good technical foundations, and the ability to ship something useful within a short timebox." I optimised for that:

- One headline technical feature (signals with evidence) done well rather than five features done shallowly.
- A clear three-page structure mapped to three distinct commercial questions.
- A real commercial story (positioning vs voice) that uses both the structured and unstructured data, with the join visible on the page.
- Honest about what's missing.

The working log (separate file) shows the messier reality of how this came together over ~10 hours of build time across two days, including the dead ends.
