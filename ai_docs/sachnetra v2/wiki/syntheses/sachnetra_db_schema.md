---
tags: [database, schema, quant_finance, entity_aware, sachnetra_v2]
source: [[User Request (2026-05-05)]]
last_updated: 2026-05-05
---
# SachNetra DB Schema
**TL;DR:** A highly normalized schema with strategic denormalization designed for entity-aware sentiment analysis, event-driven categorization, geographic mapping, and AI clustering for Indian quantitative finance.

## Core Schema Architecture
- Five interconnected domains: News Content, Financial Entity, Geographic, AI Enrichment, and Event and Signal.
- Employs a hub-and-spoke pattern with the `news_articles` table as the central hub.

## 1. Quantitative Finance Data Storage
- **`news_articles`**: Stores raw (HTML/PDF paths) and parsed content, language, and processing status.
- **`entities` & `entity_aliases`**: Canonical entity registry with ticker mappings and surface forms (handles Indian languages).
- **`article_entity_mentions`**: Implements per-entity annotation. Stores sentiment score, signal type, and relevance class (A/B) for entity-aware sentiment analysis.
- **`market_prices`**: Time-series market data for backtesting and signal validation.

## 2. Diverse News Category Handling
- **`event_types` & `article_events`**: Per-event tagging for heterogeneous Indian news (e.g., corporate earnings, RBI rate decisions).
- **`news_categories` & `article_categories`**: Hierarchical, multi-label classification structure supporting regional Indian news.

## 3. Geographic Event Mapping
- **`locations`**: Location hierarchy covering Indian administrative divisions (country, state, district, city, pincode) with PostGIS geometries.
- **`article_locations`**: Links news to geography with a `location_role` (e.g., event_location vs. mentioned).
- **`location_news_summary`**: Materialized view for fast geographic dashboard queries.

## 4. AI Summary and Clustering Integration
- **`article_summaries`**: Stores AI-generated extractive/abstractive summaries and extracted key information.
- **`article_embeddings`**: Uses `pgvector` for storing 768-dimensional embeddings for semantic search.
- **`article_clusters` & `article_cluster_assignments`**: Hierarchical document clustering for topic discovery.
- **`topics` & `article_topics`**: Dynamic topic modeling integration.

## 5. Performance & Optimization
- **Time-Series Partitioning**: Partition `news_articles` by `publish_time` (e.g., monthly).
- **Denormalization**: Use `article_analytics_cache` to reduce join overhead for real-time dashboards.
- **Indexing**: Composite, partial, GIN (full-text), GiST (spatial), and IVFFlat (vector) indexes.

## 6. Pipeline & Integration
- Multi-stage ingestion: Raw ingestion -> Entity extraction -> Location -> Event -> Category -> Sentiment -> AI Enrichment -> Clustering -> Cache Update.
- Support for CDC (Change Data Capture) logical replication for real-time streaming.

## Linked Nodes
- [[sachnetra_quant_pivot]]
- [[quant_finance]]
