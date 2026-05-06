---
tags: [database, schema, quant_finance, implementation, convex]
source: [[User Request (2026-05-05)]]
last_updated: 2026-05-05
---
# SachNetra Schema Analysis & Implementation Plan
**TL;DR:** Academic validation of the SachNetra DB schema, confirming entity-aware sentiment and Class A/B categorization are the primary edge for Indian markets, along with a phased implementation plan adapting the schema for Convex and Redis.

## Core Validation
- **Entity-Aware Annotation:** The single most important finding. Averaging sentiment across an article destroys signals. Per-entity sentiment generates actionable alpha.
- **Two-Label System:**
  - **Event Type:** Earnings, M&A, regulation, macro, etc.
  - **Relevance Class:** Class A (Idiosyncratic/Company-specific) vs. Class B (Systemic/Market-wide). Drives different position sizes and trading strategies.
- **Three-Timestamp Approach:** `publish_time`, `ingestion_time`, `last_processed_time` are essential for backtesting integrity.

## Model Pipeline Strategy
- **First Pass:** VADER (Fast, free, instant dictionary-based scoring).
- **High-Value Pass:** Xenova/transformers (Deep learning for market-moving articles).
- **Mature Pass:** Classical ML (TF-IDF + SVM) trained after 3 months of feedback data to achieve ~82% production accuracy.
- **Hindi Native:** Use `l3cube-pune/hindi-sentiment` (via HuggingFace/Xenova) for unmatched vernacular sentiment analysis.

## Empirical Findings (Indian Markets)
- Entity-aware news has proven predictive value for the NSE 500.
- Live pipelines achieve ~82% sentiment accuracy and ~78% price prediction accuracy.
- Combining sentiment with Fast Fourier Transform (FFT) components extracts cyclical patterns (daily, weekly, monthly RBI cycles) for a stronger signal.
- Unusual news volume before price moves (Poisson surge alerts) can detect insider trading (market surveillance value).

## Tech Stack Adaptation
The theoretical PostgreSQL schema must be mapped to SachNetra's reality:
- **Convex:** `news_articles`, `article_entity_mentions` (relational-style, persistent).
- **Redis:** `market_prices` (sorted sets/time-series), `article_analytics_cache`, `location_news_summary` (fast reads).
- **S3:** `raw_html`, `article_embeddings` (large objects).

## Phased Implementation Plan

> [!IMPORTANT]
> This schema is too good to implement all at once. The biggest risk is trying to build all 15 tables immediately and getting overwhelmed. Pick the 5 tables in Phase 1. Build them properly. Everything else follows naturally.

- **Phase 1 (Week 1): Foundation**
  - `entities` (Seed with Nifty 50)
  - `entity_aliases`
  - `news_articles` (Convex)
  - `article_entity_mentions` (The critical per-entity sentiment storage)
  - `article_events` (Event classification)
- **Phase 2 (Month 2): Geography & Categories**
  - `locations`, `article_locations`, `article_categories`
- **Phase 3 (Month 3-4): AI & Search**
  - `article_summaries`, `article_embeddings`, `article_clusters`
- **Phase 4 (Month 6+): Backtesting & Signals**
  - `market_prices`, `entity_sentiment_timeseries` view.

## The WorldQuant Alpha Pipeline
- The `entity_sentiment_timeseries` view connects every article, entity, sentiment score, and event type.
- This format is precisely what WorldQuant Brain expects for Alpha signal submissions.

## Linked Nodes
- [[sachnetra_db_schema]]
- [[sachnetra_quant_pivot]]
- [[world_quant]]
