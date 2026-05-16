---
tags: [synthesis, sachnetra, roadmap, quant-finance, data-infrastructure, alpha]
source: [[conversation.md]]
last_updated: 2026-05-15
---
# SachNetra Quant Pivot
*Strategy layer — the "why" and the business model. For execution sequencing, load `[[sachnetra_quant_roadmap]]`. For the data-model refinement (cluster → thread → entity), load `[[cluster_story_entity_architecture]]`.*

> ## Current State Snapshot (2026-05-15)
>
> This doc was written 2026-05-05 as the founding strategy. Below is what has happened since.
>
> **Foundation built (V2-001 → V2-011, all complete):**
> - `india_news_signals` PostgreSQL table — schema matches this doc almost exactly
> - Jaccard clustering live in `scripts/_clustering.mjs`
> - FinBERT sentiment fallback chain in `scripts/_sentiment-chain.mjs`
> - Nifty 50 entity registry in `shared/market-taxonomy.json`
> - Market-moving gate, relevance class A/B, sector + event-type extraction
> - Auto-enrichment queue between Vercel (✨ button) and Railway cron
>
> **Production bug discovered 2026-05-14**: V2-011's `seed-india-signals.mjs` depended on user activity to populate Redis. Zero rows that day. Triggered the V2-012 rebuild.
>
> **In flight (V2-012)**: Autonomous Railway-side RSS pipeline. Railway now owns the digest writing end-to-end. Adds 5 new columns including `cluster_hash`, `feed_bucket`, `thread_id` (reserved for V2-013).
>
> **Architecture refinement since this doc was written**:
> The original schema here is flat (one row per headline). The current model is layered:
> `headline → cluster (V2-012) → thread (V2-013) → entity (V2-014)`.
> Full detail in `[[cluster_story_entity_architecture]]`. The flat schema below is preserved
> as historical context but is superseded by the layered design.
>
> **Roadmap status**: Several items from this doc's original plan are *not yet tasks*:
> - **Product A (Corporate Filings Intelligence)** — flagged here as the highest-alpha source. Should become V2-015.
> - **Hindi (V2-007)** — flagged here as the unique moat. Currently sequenced behind less-strategic features; consider reprioritizing.
> - **Feedback / source credibility (V2-004)** — flagged here as a five-unique-advantages item. Currently labeled as UI feedback only; should be reframed as "Source Credibility Scoring" since the original plan ties it to monetization.
> - **B2B API surface (Product B)** — schema is ready; the API isn't a task yet.
> See `[[sachnetra_quant_roadmap]]` for the full sequencing with effort estimates.

**TL;DR:** SachNetra is not a news app — it is India's data infrastructure with a news app as its public face; the quant pivot transforms article sentiment into entity-level Alpha signals for institutional sale.

## The Core Thesis

"You accidentally built the foundation of India's most valuable financial intelligence platform while trying to build a news aggregator."

Seven independent AI research systems + practitioner Quantchics + multiple academic papers converge on identical conclusion:
- Hindi/English bilingual entity-aware sentiment data for Indian markets does not exist at production quality
- The opportunity is wide open — no dominant provider
- India alternative data market: $290M (2024) → $4.4B (2033), 35.2% CAGR

## Two-Application Architecture

### Application 1: SachNetra (Consumer + Open Source)

**What it is**: Indian news aggregator. Live at sachnetra.com.
**Public face**: "See India clearly" — Eye of Truth (Sach = Truth, Netra = Eye)
**Intelligence layer**: invisible, collects data from every digest run

**V1 (shipped):**
- 56+ Indian RSS sources scraped
- Jaccard-based story clustering (solves syndication echo chamber problem)
- AI summaries: "what happened" + "what it means"
- Category tagging, state filtering, map layer, timeline view
- PWA, live on Vercel

**V2 Priority Order:**
1. **Data Foundation** — PostgreSQL table `india_news_signals` on Railway; three timestamps; fire-and-forget from digest
2. **"What It Means" button** — Groq-powered on-demand analysis; stores summary only (legally safe)
3. **Cluster summary upgrade** — all cluster headlines → Groq (multi-source, richer)
4. **Related stories** — Jaccard 0.15–0.35 threshold
5. **Feedback buttons** — 👍👎 on every card; builds credibility index
6. **Map with real data** — persist locations, DeckGL heat layer
7. **Hindi language** — i18next already installed; activates latency advantage
8. **RSSHub government sources** — PIB, MEA, MHA, NDMA on Railway
9. **WhatsApp brief** — 7am automated digest
10. **Landing page** — build after real usage numbers

### Application 2: IndiaSignal (B2B Intelligence, Unnamed)

**Product A — Corporate Filing Intelligence Feed**
- Source: NSE/BSE corporate announcement portal (free, public PDFs)
- Architecture: OCR + LLM hybrid; 93–97% accuracy; ~$260–660/month
- Events: auditor resignations (highest alpha), promoter pledging, board outcomes, SEBI penalties
- Signal advantage: market reacts in minutes after filing; journalists take hours

**Product B — Bilingual Sentiment Signal API**
```
GET /sentiment/company/HDFCBANK.NS?hours=24
→ {sentiment_timeseries, event_count, avg_sentiment, buzz_score, relevance_class}
```
Pricing: ₹499/month (startup) → ₹2,999/month (fund) → ₹15,000–50,000/year (institutional)

**Product C — Historical Dataset**
- 12 months → approach Neudata for listing
- Licensing: $50,000–500,000 one-time

## The Intelligence Pipeline

```
RSS → parse → classifyByKeyword() → digest → user sees card (UNCHANGED)
                      ↓
              [market-moving? YES]
                      ↓
              persistSignal() → PostgreSQL (fire and forget)
                      ↓ [async]
              scoreFinBERT() → HuggingFace API
              extractCompanies() → Nifty 50 keyword match
              detectSectors() → keyword rules
              updateSentimentTimeSeries() → Redis sorted sets
                      ↓ [on user click]
              generateRichSummary() → Groq → Redis cache (summary only)
```

## The Five Unique Advantages (Research-Validated)

| Gap | SachNetra Solution |
|---|---|
| Hindi corporate news mapped to NSE tickers | i18next + Hindi RSS + FinBERT |
| NSE/BSE filing events as real-time feed | OCR + LLM pipeline (Phase 2) |
| Source credibility scoring for Indian media | 👍👎 feedback system |
| Conglomerate entity disambiguation (Tata = 23 stocks) | Nifty 50 → 500 registry |
| Syndication deduplication at scale | Jaccard clustering (already live) |

## Data Schema (PostgreSQL `india_news_signals`)

```sql
CREATE TABLE india_news_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_hash    TEXT UNIQUE NOT NULL,  -- deduplication
  scraped_at       TIMESTAMPTZ NOT NULL,
  published_at     TIMESTAMPTZ,
  processed_at     TIMESTAMPTZ,
  headline         TEXT NOT NULL,
  source_name      TEXT NOT NULL,
  article_url      TEXT,
  event_category   TEXT,
  threat_level     TEXT,
  is_market_moving BOOLEAN DEFAULT FALSE,
  nse_tickers      TEXT[],
  sectors          TEXT[],
  companies        TEXT[],
  sentiment_score  DECIMAL(5,4),
  sentiment_label  TEXT,
  relevance_class  TEXT,         -- A or B
  event_type       TEXT,
  entity_sentiment JSONB,        -- per-ticker sentiment
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

## Revenue Timeline

| Period | Milestone | Revenue |
|---|---|---|
| Month 1–3 | Build and collect | ₹0 (data accumulating) |
| Month 4–6 | First B2B pilots | ₹50,000–2,00,000/month |
| Month 6–12 | API subscription launch | ₹2,00,000–10,00,000/month |
| Year 2 | Dataset licensing | ₹50,00,000+ deals |
| Year 3 | WorldQuant consultant | $2,000–8,000/quarter USD |

## The Flywheel

```
Better data → Better predictions → More users → More hype
     ↑                                              ↓
More contributors ← More trust ← More engagement ←
```

## The One Sentence

"SachNetra is the collection engine. The database is the asset. The quant system is the proof of value."

## Linked Nodes

- [[quant_finance]]
- [[world_quant]]
- [[reserve_bank_of_india]]
- [[compounding]]
- [[background_brain]]
- [[personal_investing]]
