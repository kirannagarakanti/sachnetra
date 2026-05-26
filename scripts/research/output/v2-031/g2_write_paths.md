# G2 Write-Path Inventory
*Compiled from codebase grep on 2026-05-26. All paths confirmed by code reading.*

---

## Files that write `nse_tickers` (india_news_signals)

| File | Line | What it does |
|---|---|---|
| `scripts/seed-india-signals.mjs` | L341 | `nse_tickers: companies.map(c => c.ticker)` — the ONLY write path that populates `nse_tickers` at ingest. Calls `extractCompanies(title)` which uses `nifty50_registry` (50 entries). The ticker stored is in **Yahoo-suffixed format** e.g. `RELIANCE.NS` (because `nifty50_registry` stores `"ticker": "RELIANCE.NS"`). |
| `scripts/seed-india-signals.mjs` | L379 | Passes `r.nse_tickers` through to the INSERT VALUES array — no transformation, stored as-is. |
| `scripts/seed-india-signals.mjs` | L396 | INSERT column list includes `nse_tickers`. |
| `scripts/migrate-india-signals.mjs` | L23 | DDL: `nse_tickers TEXT[]` — column definition. |

**Secondary readers (not writers) of nse_tickers:**

| File | What it reads |
|---|---|
| `scripts/_entity-fan-out.mjs` | Reads `nse_tickers` per cluster for entity timeline fan-out |
| `scripts/_thread-linker.mjs` | Reads `nse_tickers` for thread signal embedding |
| `scripts/research/exp4-bourse-leads-news.mjs` | Reads `nse_tickers`, strips `.NS` suffix via `norm()` to join with announcements |
| `scripts/research/exp10-intraday-filing-event-study.mjs` | Reads `nse_tickers`, strips `.NS` for event matching |
| `scripts/research/backfill-intraday-prices.mjs` | Reads `nse_tickers` to source the 15-ticker large-cap universe |

---

## Files that write `symbol` (india_bourse_announcements)

| File | Line | What it does |
|---|---|---|
| `scripts/seed-india-announcements.mjs` | (ingest script) | Writes `symbol` from NSE announcement payload `sm_name`/`symbol` field — stored as **bare NSE symbol** e.g. `RELIANCE` (no suffix). Confirmed by Exp4 §14 diagnosis. |

---

## Files that write `symbol` (research_prices / research_prices_intraday)

| File | What it does |
|---|---|
| `scripts/seed-research.mjs` | Writes `research_prices.symbol` — uses Yahoo format **with `.NS` suffix** e.g. `RELIANCE.NS` (Yahoo requires it). |
| `scripts/research/backfill-intraday-prices.mjs` | Writes `research_prices_intraday.symbol` — same Yahoo format. |

---

## Current format by table (confirmed from code + Exp4 evidence)

| Table | Column | Format | Example |
|---|---|---|---|
| `india_news_signals` | `nse_tickers` | **Yahoo-suffixed** `*.NS` | `['RELIANCE.NS', 'SBIN.NS']` |
| `india_bourse_announcements` | `symbol` | **Bare NSE symbol** | `'RELIANCE'` |
| `research_prices` | `symbol` | **Yahoo-suffixed** `*.NS` | `'RELIANCE.NS'` |
| `research_prices_intraday` | `symbol` | **Yahoo-suffixed** `*.NS` | `'RELIANCE.NS'` |

---

## G2 Recommendation: Strip on write in seed-india-signals.mjs

**Recommended canonical form: bare NSE symbol (no suffix).**

Rationale:
- `india_bourse_announcements` already uses bare symbols — the most natural join partner for G1 work.
- `research_prices` MUST keep `.NS` because Yahoo Finance requires it — document this divergence loudly.
- Stripping `.NS`/`.BO` at write time in `seed-india-signals.mjs` (one line change) is simpler and safer than adding a view.
- The research scripts already have a `norm()` function that strips suffixes — this was a workaround for the mismatch. G2 eliminates the need for that workaround.

**Exact change needed:**

In `scripts/seed-india-signals.mjs`, line 341, change:
```js
// BEFORE (current):
nse_tickers: companies.map(c => c.ticker),

// AFTER (G2 fix):
nse_tickers: companies.map(c => c.ticker.replace(/\.(NS|BO)$/, '')),
```

And update `shared/market-taxonomy.json` `nifty50_registry` to store bare symbols:
```json
// BEFORE:
{ "aliases": ["Reliance", "RIL", "Reliance Industries"], "ticker": "RELIANCE.NS" }
// AFTER:
{ "aliases": ["Reliance", "RIL", "Reliance Industries"], "ticker": "RELIANCE" }
```

Also update `_entity-fan-out.test.mjs` fixtures which currently use `.NS` suffixed tickers.

**Note:** `research_prices.symbol` keeps `.NS` — Yahoo requirement. Document in `ARCHITECTURE.md`:
> `research_prices.symbol` uses Yahoo-suffixed format (`RELIANCE.NS`) because Yahoo Finance requires the exchange suffix. All other india_* tables use bare NSE symbols (`RELIANCE`). Never join research_prices directly to india_news_signals on symbol without stripping the suffix.

---

## Backfill note for existing nse_tickers rows

After the G2 fix ships, existing rows still have `.NS`-suffixed values. The G1 backfill
(which re-tags all 17,461 rows) will write bare symbols — so G1 and G2 are naturally
co-deployed: G1 backfill is the G2 migration for existing rows. No separate migration script needed.

If G1 backfill is delayed, add a one-time SQL migration:
```sql
UPDATE india_news_signals
SET nse_tickers = ARRAY(
  SELECT REGEXP_REPLACE(unnest(nse_tickers), '\.(NS|BO)$', '')
)
WHERE nse_tickers IS NOT NULL AND array_length(nse_tickers, 1) > 0;
```
