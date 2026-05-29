# G4 — Expand `research_prices` to the Nifty Midcap 150

**Repo:** SachNetra (this repo) · script lane `scripts/research/`
**Status:** [ ] code written (not run) — awaiting Lijo/James prod run
**Author:** Claude (autonomous) · 2026-05-29
**Unblocks:** re-run of Exp 14 (mid-cap governance-shock event study) — the #1 strategy
**Gauge:** dashboard "Price Universe" tile (47 → ~200) and "Latest Price" tile

---

## Why

`research_prices` currently holds **Nifty-50 only** (≈47 symbols + `^NSEI`), loaded by
`scripts/research/backfill-research-prices.mjs` from Yahoo Finance. Because 96% of corporate filings
are for mid/small-caps we can't price, every event study starves — Exp 14 found only **2** of 712
filings landed on a priced symbol. Adding the **Nifty Midcap 150** is the single highest-leverage
data fix: it directly revives the #1 strategy and needs none of the hard tagging work.

This is a **manual backfill**, same boundary as the Nifty-50 one: Claude authors, **Lijo/James run it
against prod**. It writes **only** to `research_prices` (additive, idempotent upsert).

---

## Context Manifest

**Load:**
- `scripts/research/backfill-research-prices.mjs` — the proven Yahoo→`research_prices` pattern this mirrors.
- `scripts/_seed-utils.mjs` — `loadEnvFile`, `CHROME_UA`, `sleep` helpers.
- `scripts/research/backfill-midcap-prices.mjs` — the NEW script (this task's deliverable).
- This file.

**Don't load:** the dashboard repo, the experiment write-ups, the sentiment/OCR lane.

---

## The deliverable (already written this session)

`scripts/research/backfill-midcap-prices.mjs` — self-contained, mirrors the Nifty-50 backfill exactly
(same Yahoo v8 chart fetch with 429 backoff, same `parseHistory` + log-return computation, same chunked
`ON CONFLICT (symbol, trade_date)` upsert, same `research_prices` DDL guard). Differences:
- The **universe** is the Nifty Midcap 150 instead of `nifty50_registry`.
- Two ways to supply that universe (see below).
- Same flags: `--from=`, `--limit=N`, `--symbol=X`, plus the OPS-001 safety flags `--write`
  (writes are opt-in; default is a dry run) and `--max-symbols=N` (abort guard, default 400).

### Getting the Midcap 150 list — do NOT hand-type tickers

Hallucinated/incorrect ticker symbols silently poison `research_prices`. Use an authoritative source:

- **Option A (default):** the script fetches the official NSE index-constituents CSV
  (`ind_niftymidcap150list.csv` from niftyindices.com), reads the `Symbol` column, and appends `.NS`
  for Yahoo. **Verify** the URL still resolves; niftyindices occasionally blocks non-browser requests.
- **Option B (recommended fallback, fits the standing recon workflow):** have **Gemini/MinMax** produce
  the current 150 constituents as a JSON array of Yahoo tickers (e.g. `["LICHSGFIN.NS","BHARATFORG.NS",…]`)
  and save to `shared/nifty-midcap150.json`, then run with `--symbols-file=shared/nifty-midcap150.json`.

Either way the script prints the symbol count before fetching, and the **default run is a dry run**
(no `--write`) that writes nothing — so the universe can be eyeballed before any prod write.

---

## Run procedure (Lijo / James)

```bash
# 0. ensure .env.local has DATABASE_PUBLIC_URL (same as the other backfills)

# 1. DRY RUN (default — no --write) — fetches + parses, prints per-symbol bar counts, writes NOTHING
node scripts/research/backfill-midcap-prices.mjs

#    (if the NSE CSV is blocked, supply the list from Gemini/MinMax:)
node scripts/research/backfill-midcap-prices.mjs --symbols-file=shared/nifty-midcap150.json

# 2. Smoke test a single symbol end-to-end (writes 1 symbol):
node scripts/research/backfill-midcap-prices.mjs --symbol=BHARATFORG.NS --from=2015-01-01 --write

# 3. FULL RUN — writes all ~150 symbols to research_prices (idempotent)
node scripts/research/backfill-midcap-prices.mjs --write
```

Pace note: ~150 symbols × ~400ms politeness delay ≈ a couple of minutes plus Yahoo response time.

---

## Acceptance / verification (read-only, after the run)

```sql
-- Price Universe should jump toward ~200 (50 + 150)
SELECT COUNT(DISTINCT symbol) FROM research_prices;

-- Freshness
SELECT MAX(trade_date) FROM research_prices;

-- How many filings now land on a priced symbol (the whole point) —
-- compare before/after; expect a large jump from the Exp 14 baseline of ~2
SELECT COUNT(DISTINCT a.symbol)
FROM india_bourse_announcements a
JOIN research_prices p ON p.symbol = a.symbol || '.NS'
WHERE a.announced_at >= NOW() - INTERVAL '60 days';
```

The dashboard **Price Universe** tile should turn amber/green and **Latest Price** go current.

> Note on the join: `india_bourse_announcements.symbol` is the bare NSE symbol (e.g. `BHARATFORG`);
> `research_prices.symbol` is the Yahoo form (`BHARATFORG.NS`). Confirm this join shape against real
> rows before relying on the count — it's the same symbol-format seam Exp 14 has to handle.

---

## Kill / caution conditions

- If Yahoo lacks history for a midcap symbol, it's logged as a miss and skipped — fine, not fatal.
- If `> ~20%` of symbols miss, the symbol list is probably wrong-format (e.g. missing `.NS`, or BSE
  codes) — fix the list, don't widen the script.
- Do **not** fold this into the live digest cron. It's a manual/periodic backfill, like the Nifty-50 one.

---

## After this lands

1. Re-run `scripts/research/exp14-governance-shock-event-study.mjs` — first honest test of the #1 strategy.
2. Then author the **G1** tagging-rebuild task (precision-first). Gauges already on the dashboard.
