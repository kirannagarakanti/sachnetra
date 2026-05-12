# News Sentiment Analysis Implementation Guide

This guide details the technical and strategic requirements for implementing **news sentiment analysis** in the SachNetra V2 pipeline, synthesized strictly from the provided research report (`indian_sentiment_report.pdf`) and the V2 architecture analysis. 

*(Note: This guide focuses purely on news and social media sentiment processing, excluding raw document/filing extraction).*

## 1. Core Sentiment Strategy

To generate viable alpha from Indian equity markets using news data, the implementation must adhere to these structural rules:

- **Company-Level Granularity**: Sentiment must be scored at the specific company/entity level. Market-level sentiment is highly diluted by retail noise and herding behavior. Company-level analysis provides the strongest signal with the lowest noise for direct stock selection.
- **Event-Specific Actionability**: 
  - **Top Categories**: Academic research confirms that **Business** and **Politics** news categories show the strongest sentiment effects in Indian markets.
  - **High-Value Events**: Focus sentiment extraction heavily on earnings surprises, M&A activity, regulatory (SEBI) news, macroeconomic (RBI) policy, and management changes.
- **Signal Processing & Decay**:
  - **Alpha Decay**: Aggregate news sentiment exerts a short-lived influence due to fast alpha decay. 
  - **Holding Period**: The optimal holding period for daily news sentiment is **1 to 3 days**.
  - **Smoothing**: Apply a **90-day smoothing period** for base sentiment signals to balance stability and responsiveness.
- **Non-Redundancy**: Sentiment represents an orthogonal signal. Research confirms it has low correlation with Price Momentum (0.12-0.25), Trading Volume (0.15-0.30), and Fundamentals (0.05-0.15).

## 2. Academic & Industry Validation

The underlying logic for the pipeline is supported by peer-reviewed findings specific to the NSE/BSE:
- Investor sentiment has strong, statistically significant positive effects on the Nifty 500 and BSE Sensex returns (e.g., a beta coefficient of 1.305 on Sensex returns).
- There is explicit information flow and direction of causality from news sentiment to stock price movement.
- Twitter/social media sentiment (analyzed via VADER) shows significant correlations with BSE/NSE returns and volume.

## 3. Database Schema & State Management

The pipeline must support storing **per-entity sentiment** rather than just a single sentiment score for an article, aligning with the V2 architecture analysis.

- **Entity Sentiment Storage**: Leverage the `entity_sentiment` JSONB column in PostgreSQL to capture specific companies mentioned in the news.
  - **Format Example**: `{"HDFCBANK.NS": {"score": 0.8, "label": "positive"}, "LICHSGFIN.NS": {"score": -0.6, "label": "negative"}}`
- **Data Ingestion Rules**:
  - The pipeline must store **ALL** incoming headlines (do not discard non-market-moving news). Every headline is data.
  - Use the `is_market_moving` boolean flag to filter rows.
  - Only push `is_market_moving = true` articles to the Redis Enrichment Queue for heavy LLM processing.

## 4. NLP Resources & Models

Depending on the source language of the news, the following tools are validated for Indian financial sentiment:

1. **Hindi/Indic Language News**:
   - **Hindi FinBERT**: A specialized pre-trained model optimized for Hindi financial text, achieving an 86.08% macro F1 score.
   - **IndicFinNLP**: For complex themes, translating Indic texts to English and scoring with English-trained models often outperforms native language-specific models.
2. **Social Media & "Hinglish"**:
   - **VADER Sentiment Analysis**: Academically validated as reliable for predicting price trends and daily returns using Twitter data in Indian markets.
3. **Complex News Enrichment**:
   - **Groq-v2 / FinBERT**: Use as an asynchronous background worker to process market-moving news from the enrichment queue, extracting precise entity-level sentiment scores.

## 5. Market Structure Constraints

Your sentiment scoring logic or trading execution layer must programmatically account for:
- **Noise Trader Theory**: Expect overshoot and subsequent mean-reversion on highly public news due to retail herd behavior. Entity-level scoring mitigates this.
- **Circuit Breakers**: NSE triggers halts at 10%, 15%, and 20% index movements. Sentiment signals generated shortly before a circuit breaker may become disconnected from executable prices.
