# V2-001: Intelligence Pipeline Foundation

## Objective
Establish the foundational background data collection pipeline. This ensures that every 15 minutes, regardless of user activity, market-moving news is intercepted, analyzed for sentiment, and permanently stored in PostgreSQL for future quantitative backtesting.

## Context
Currently (V1), sentiment and summaries are generated just-in-time when a user clicks. With low initial user volume, this leads to lost historical data. This task implements "Trigger 2" - an automatic background track that operates completely independently of users.

## Task Scope

### 1. Database Setup
- `[ ]` Set up PostgreSQL on Railway.
- `[ ]` Create a simple `india_news_signals` table to store extracted data permanently. Do NOT implement the full 15-table schema yet.

### 2. Intelligence Pipeline (`server/intelligence-pipeline.ts`)
Create a new file `server/intelligence-pipeline.ts` with the following functions:
- `[ ]` `checkMarketKeywords(title: string)`: Fast, free keyword matching to flag articles as market-moving.
- `[ ]` `scoreWithFinBERT(title: string)`: Primary path uses HuggingFace API (`HF_API_TOKEN`). Fallback path will eventually use Railway Xenova (setup deferred to a future task).
- `[ ]` `extractCompanies(title: string)`: Free keyword matching against Nifty 50 companies.
- `[ ]` `detectSectors(title: string)`: Free keyword rules to identify relevant sectors.
- `[ ]` `persistSignal(data)`: Function to INSERT the extracted data into the `india_news_signals` PostgreSQL table.

### 3. Digest Integration (`server/worldmonitor/news/v1/list-feed-digest.ts`)
- `[ ]` Import the intelligence pipeline functions.
- `[ ]` Immediately after `classifyByKeyword()` executes, trigger the pipeline asynchronously.
- `[ ]` Implement as a "fire and forget" hook: it must NEVER block or delay the main digest response.

## Out of Scope
- Modifying the Groq prompt for user summaries (handled in a separate task).
- Any user-facing UI changes (handled in a separate task).
- Deploying the Xenova FinBERT model to Railway (handled in a separate task after this foundation is proven working).

## Verification Steps
1. Run the digest manually.
2. Verify that the PostgreSQL database has new rows in `india_news_signals`.
3. Ensure the digest response time remains unchanged (verifying the fire-and-forget nature).
4. Run `npm run typecheck` and ensure 0 errors.
