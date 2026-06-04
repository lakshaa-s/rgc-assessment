# Dataset — Data Dictionary

This package contains four data files for the assessment. They describe an **anonymised sample** of video product-review data across several functional soft-drink brands, enriched with retail product intelligence and brand-level performance metrics.

All personal data has been anonymised: reviewer names are fictional, emails are replaced by a hashed `personId`, and locations are generalised to UK region level.

---

## Files

| File | Format | One row = | Records |
|------|--------|-----------|--------:|
| `transcripts.json` | JSON | a single video review (text + metadata) | 130 |
| `users.json` | JSON | a reviewer profile attached to a review | 130 |
| `products.csv` | CSV | a product in the catalogue | 35 |
| `brands.csv` | CSV | a brand with performance metrics | 9 |

---

## How to join

```
users.json ──(reviewId + personId)──► transcripts.json ──(productId)──► products.csv ──(brand)──► brands.csv
```

- **transcripts ↔ products** — join on `productId` (many reviews can share one product).
- **transcripts ↔ users** — join on the pair (`reviewId`, `personId`). A person can review more than once, so `personId` is **not** unique on its own in `users.json`. Use `personId` to identify the same individual across reviews; use the (`reviewId`, `personId`) pair to get the exact reviewer record for one review.
- **products ↔ brands** — join on the `brand` column in products.csv matching `brand_name` in brands.csv.

---

## Important: transcript coverage is partial

Only **4 of 9 brands** have reviewer transcripts. The other 5 brands are included as **competitive context** — they carry the same product enrichment and brand intelligence fields, but have no transcript data. This is intentional.

| Brand | Products | Transcripts | Role |
|-------|----------|-------------|------|
| Double Dutch | 5 | 35 | Reviewed brand |
| Fix8 | 6 | 45 | Reviewed brand |
| SKIP | 3 | 25 | Reviewed brand |
| UNAI | 2 | 25 | Reviewed brand |
| Trip | 4 | 0 | Competitive context |
| DASH | 4 | 0 | Competitive context |
| Hip Pop | 4 | 0 | Competitive context |
| Agua de Madre | 4 | 0 | Competitive context |
| Dalston's | 3 | 0 | Competitive context |

**15 of 35 products** have at least one transcript. The remaining 20 are catalogue-only.

---

## `transcripts.json`

Each record is one video review with the reviewer's rating, purchase intent, and the full spoken transcript.

---

**`reviewId`** — string
Unique review id. Primary key for this file.

**`brand`** — string
Brand the review is about. Convenience field (also derivable via product).

**`personId`** — string
Reviewer id (SHA-256 hash of email). Links to `users.json`.

**`productId`** — string
Reviewed product. Links to `products.csv`.

**`createdAt`** — ISO 8601 string
When the review was created.

**`isFeatured`** — boolean
Platform editorial flag.

**`isPublished`** — boolean
Platform publication flag.

**`challenge`** — object | null
Campaign the review was part of. Contains `id`, `title`, `slug`. Null for most rows (87/130).

**`votes`** — array
The reviewer's rating. Usually one element: `{ product: {id, name}, rating }`. Rating is 1–5.

**`wouldBuy`** — array
Purchase intent signals. Contains `wouldBuyAfterTrying` (Yes/No) and `wouldBuyInTheFirstPlace` (Yes/No).

**`transcription`** — object | null
The core unstructured data. Contains:
- `text` — full spoken transcript. The primary field to mine for signals.
- `summary` — AI-generated summary of the review.
- `sentiment` — AI-assigned: POSITIVE / NEGATIVE / NEUTRAL / MIXED.
- `wordCount` — length of the transcript (range: 17–685, avg ~230).
Null for 1 record.

---

## `users.json`

Each record is a reviewer profile snapshot attached to a specific review. One person can appear multiple times if they reviewed more than one product.

---

**`reviewId`** — string
The review this profile snapshot belongs to. Part of composite key with `personId`.

**`personId`** — string
Reviewer id (SHA-256 hash of email). Not unique on its own — use with `reviewId` for exact match.

**`brand`** — string
Brand of the associated review.

**`firstName`, `lastName`** — string
Fictional cartoon-character names. Anonymised but stable — same person always gets the same name.

**`age`** — string
Reviewer age as a string (e.g. `"32"`, not `32`). Not bucketed.

**`gender`** — string
FEMALE / MALE / NON_BINARY / PREFER_NOT_TO_SAY / blank. Four rows have blank gender.

**`region`** — string
General UK region (e.g. "Yorkshire and the Humber"). Replaces the original town-level location.

**`videoReviewerTier`** — string
Reviewer seniority: TIER_1 / TIER_2 / TIER_3.

**`archetypes`** — array of objects
Shopper personality archetypes assigned to the reviewer. Each element has `name` (e.g. "The Wellness Seeker") and `order` (1 = primary).

**`tags`** — array of strings
Pre-existing behavioural and interest tags (e.g. "budget-conscious", "eco-conscious", "health-seeker").

**`questions`** — array of objects
Onboarding Q&A responses. Each element has `id`, `title` (the question), and `answers` (array of `{id, text}`).

---

## `products.csv`

35 products across 9 brands. Contains standard retail metadata, market positioning, AI-generated audience and usage profiles, and pipeline-assigned labels.

---

### Product identity

**`productId`** — string
Unique product id. **Join key** to `transcripts.json`.

**`brand`** — string
Owning brand name. **Join key** to `brands.csv` (matches `brand_name`).

**`productName`** — string
Display name of the product.

**`companyName`** — string
Parent company. Usually the same as brand, but may differ.

**`seoName`** — string
URL-friendly slug.

---

### Retail metadata

**`category`** — string
Top-level product category. All products are "Soft Drinks" in this dataset.

**`subcategory`** — string
More specific category. Values include: "Tonic Water & Mixers", "Kombucha & Fermented Drinks", "CBD Drinks", "Adaptogenic Drinks", "Sparkling Water", "Craft Soft Drinks", "Functional & Wellness Drinks", etc.

**`price`** — number
Unit price in GBP.

**`price_multipack`** — number | null
Total multipack price if the product is sold as a pack. Null if only sold as single units.

**`multipack_quantity`** — number | null
Number of units in the multipack. Null if only sold as single units.

**`currency`** — string
Always `"GBP"`.

**`pack_size`** — string
Volume per unit (e.g. "250ml", "330ml", "200ml").

**`retailers_available`** — string
Semicolon-separated list of retailers stocking this product (e.g. "Ocado; Waitrose; Tesco"). DTC-only brands show their website (e.g. "drinkskip.com (DTC)").

---

### Product detail

**`description`** — string
AI-enriched product description. Summarises what the product is, its positioning, key ingredients, and intended use. Not the manufacturer's original marketing copy.

**`ingredients`** — string
Ingredients list as it appears on the product packaging.

---

### Packaging

**`packaging_attributes.packaging_type`** — string
Primary packaging format (e.g. "can", "bottle").

---

### Market positioning

**`market_position.market_maturity`** — string
Values: `emerging` / `growing` / `mature`.

**`market_position.price_tier`** — string
Values: `premium` / `mid-range` / `budget`.

**`market_position.seasonality`** — string
Values: `year-round` / `summer` / `seasonal`.

---

### Target audience profiles (AI-generated)

Each product has up to 3 AI-generated target user profiles describing who the product is designed for.

**`target_user_N_segment`** — string (N = 1, 2, 3)
Name of the target segment (e.g. "Health-conscious millennials", "Cocktail enthusiasts").

**`target_user_N_motivation`** — string (N = 1, 2, 3)
Why this segment would buy the product.

---

### Usage scenarios (AI-generated)

Each product has up to 4 AI-generated usage occasions describing when and how the product is consumed.

**`usage_N_scenario`** — string (N = 1, 2, 3, 4)
Short name for the occasion (e.g. "Evening wind-down", "Premium G&T serve at home").

**`usage_N_frequency`** — string (N = 1, 2, 3, 4)
Expected frequency: `daily` / `weekly` / `occasional` / `seasonal`.

---

### Companion products (AI-generated)

Each product has up to 5 AI-suggested companion products — what pairs with it or substitutes for it.

**`companion_products_count`** — number
Number of companion products for this row.

**`companion_N_type`** — string (N = 1, 2, 3, 4, 5)
What the companion product is (e.g. "Gin", "CBD oil", "Herbal tea").

**`companion_N_relationship`** — string (N = 1, 2, 3, 4, 5)
How it relates: `complementary` (pairs with) / `substitute` (replaces) / `enhancer` (improves) / `accessory` (accompanies).

---

### Labels

**`labels`** — string
Semicolon-separated list of pipeline-assigned tags with confidence scores. Example: `Vegan(0.95); CBD(0.99); Soft Drinks(0.9)`. These are machine-generated classifications, not self-declared by the brand. Confidence ranges from 0 to 1.

---

## `brands.csv`

9 brands. Each row contains brand identity, proprietary performance scores, and AI-generated intelligence.

---

### Brand identity

**`brand_name`** — string
Brand name. **Join key** — matches `brand` in products.csv.

**`founded_year`** — number
Year the brand was founded.

**`hq_city`** — string
City of headquarters.

**`hq_country`** — string
Country of headquarters.

**`headquarters_raw`** — string
Full headquarters string as recorded (may include region/state).

**`description`** — string
What the brand does, its positioning, key product lines, and notable achievements. Typically 400–700 characters.

**`industry`** — string
Industry classification (e.g. "Beverages — functional CBD & nootropic soft drinks").

**`website`** — string
Brand website URL.

**`additional_context`** — string
Extra context about the brand: product range details, distribution notes, key claims, pricing structure.

---

### Social media handles

**`instagram_handle`** — string | null
Instagram profile URL.

**`linkedin_url`** — string | null
LinkedIn company page URL. Null for some smaller brands.

**`tiktok_handle`** — string | null
TikTok profile URL.

**`twitter_handle`** — string | null
Twitter/X profile URL. Null for most brands.

**`youtube_channel_id`** — string | null
YouTube channel URL. Null for some brands.

---

### BTS (Breakthrough Score) metrics
An internal [0, 100] metric for a brand's position in its competitive landscape, aggregated from a range of underlying metrics. Because these metrics are heavily skewed (a few viral brands dominate), scores use outlier-resistant normalization so one extreme value doesn't flatten the rest.

**`momentum_score`** — number
Brand's year-over-year growth. High = grew substantially vs. last year. (Growth off a tiny base is discounted.)

**`popularity_score`** — number
Brand's absolute size/presence in the category relative to peers. High = a larger, more talked-about player.

**`breakthrough_score`** — number
Blends the two, weighted toward momentum. High = both sizeable and fast-growing.

---

### AI-generated brand intelligence

**`archetype_affinity`** — string | null
Plain-text summary of which shopper archetypes the brand appeals to and why. Describes primary, secondary and weak-fit archetypes (e.g. "Wellness Seekers", "Conscious Consumers"). Null for some brands.

**`research_overall_assessment`** — string | null
AI-generated assessment of brand legitimacy and current activity. Covers evidence of active trading, retailer presence, and any flags.

---

## Notes

- **Sentiment skews positive**: 109/130 transcripts are POSITIVE — typical of solicited video reviews. A naive "average rating" will look inflated. Lean on transcript text and sentiment mix for nuance.
- **Ages are strings**, not integers (e.g. `"32"` not `32`). Some `gender` values are blank. One `transcription` is null. Handle missing values gracefully.
- **AI-enriched fields are directional signals**, not verified certifications. They are generated from product descriptions, ingredient lists, and packaging data. Use them to structure comparisons, not as ground truth.
- **Competitor brands have no transcripts** but carry the same enrichment columns. Use them for competitive context — pricing comparisons, attribute benchmarking, market positioning.
- This is a **curated sample**, not a complete or representative export. Treat counts as illustrative, not as market share.
- Not every product has a review; the catalogue includes products with no transcripts.
