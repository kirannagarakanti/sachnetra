---
tags: [quant_finance, entity_aware, sentiment_analysis, academic_research, sachnetra_v2]
source: [[User Request (2026-05-07)]]
last_updated: 2026-05-07
---
# Academic Validation of Entity-Aware Sentiment

**TL;DR:** Academic research on Indian quantitative finance directly validates SachNetra's core architectural decisions. The most critical finding is that **article-level sentiment is useless for alpha generation**; sentiment must be calculated at the **entity (ticker) level**.

## 1. The Core Breakthrough: Entity-Aware Sentiment
A single article often contains mixed signals (e.g., "RBI raises rates — good for deposits, bad for home loans"). 
- **Wrong Approach:** Averaging the sentiment (Neutral) destroys the signal.
- **Right Approach (SachNetra):** Store per-entity sentiment.
  - `HDFCBANK.NS` (deposits) → POSITIVE
  - `LICHSGFIN.NS` (home loans) → NEGATIVE

*Implementation in V2-001:* The `india_news_signals` table uses an `entity_sentiment JSONB` column to store this granular data instead of a single article score.

## 2. Event Types & Relevance Classes
Research shows news falls into distinct categories that require different trading responses:

### Relevance Classes
- **Class A (Idiosyncratic):** Company-specific news (e.g., "Tata Motors recalls vehicles"). Affects only that stock.
- **Class B (Systemic):** Market-wide or sector-wide news (e.g., "RBI raises repo rate"). Affects the entire sector/market.

### Event Types
News should be categorized into actionable events: `earnings`, `m_and_a`, `management_change`, `regulation`, `product_launch`, `legal`, `macro`.

*Implementation in V2-001:* The `relevance_class` and `event_type` columns in the `india_news_signals` schema directly support this classification.

## 3. The Entity Registry (Aliases)
Indian companies are referred to by multiple names (e.g., "Hindustan Unilever" = "HUL" = "HINDUNILVR.NS"). Without a registry, entity extraction misses 40% of mentions.
- You must maintain a strict mapping of `aliases -> Canonical NSE Ticker`.

*Implementation in V2-001:* The `scripts/_india-market-keywords.mjs` file serves as this in-memory registry for the Nifty 50, acting as the foundation before transitioning to a full relational database table in V3.

## 4. Three-Timestamp Architecture
Backtesting requires exact chronological fidelity to avoid look-ahead bias.
1. `published_at` (when the source released it)
2. `scraped_at` / `ingestion_time` (when SachNetra saw it)
3. `processed_at` (when AI finished scoring it)

*Implementation in V2-001:* These exact three timestamps are already explicitly defined in the `india_news_signals` DDL.

## 5. Model Fallback Strategy
Research suggests a tiered approach to sentiment scoring:
- **VADER / Lexicon (Fast/Free):** Use for first-pass filtering (~70% accuracy).
- **Transformers / Deep Learning (Costly/Slow):** Use only for market-moving articles (High accuracy).

*Implementation in V2-001:* SachNetra uses keyword matching for the `is_market_moving` first pass, and HuggingFace FinBERT for the deep learning pass.

## Future: WorldQuant Brain Pipeline
The ultimate output of this architecture is a flattened time-series view (`entity_sentiment_timeseries`) that contains `ticker`, `timestamp`, `sentiment_score`, `relevance_class`, and `event_name`. This matches the exact format required for WorldQuant Brain Alpha signal submissions.

## Linked Nodes
- [[sachnetra_db_schema]]
- [[sachnetra_quant_pivot]]
- [[sachnetra_sentiment_architecture]]
