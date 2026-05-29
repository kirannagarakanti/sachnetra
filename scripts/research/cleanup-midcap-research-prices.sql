-- ============================================================================
-- G4 disk-full cleanup — trim research_prices back to the legitimate Nifty-50
-- universe and reclaim the disk the midcap backfill consumed.
-- ============================================================================
--
-- CONTEXT
--   The G4 backfill (scripts/research/backfill-midcap-prices.mjs) wrote 140/150
--   Nifty Midcap 150 symbols (~441,102 bars) into the SHARED prod table
--   research_prices, filling the Railway volume ("No space left on device").
--   Postgres then crashed into a disk-full recovery loop. Incident record: §8 of
--   ai_docs/sachnetra v2/wiki/syntheses/strategy_reset_and_data_foundation_2026-05-29.md
--
-- WHAT THIS DOES
--   Deletes every research_prices row whose symbol is NOT in the original
--   legitimate universe, then VACUUM FULL to return the freed space to the OS.
--   The KEEP set is exactly what scripts/research/backfill-research-prices.mjs
--   loads: '^NSEI' + every taxonomy.nifty50_registry[].ticker from
--   shared/market-taxonomy.json (47 tickers → 48 symbols total).
--   The symbol list below was derived directly from that file — not hand-typed.
--
-- ⚠ ORDER OF OPERATIONS — read before running (see the message to James):
--   1. GROW the Railway volume FIRST. VACUUM FULL rewrites the table into a new
--      copy and needs free headroom (~the size of the KEPT rows) to do it. On a
--      full volume it cannot run. Restore headroom before touching this file.
--   2. Confirm Postgres is healthy and the live seed crons have recovered.
--   3. ONLY THEN run STEP 1 (pre-check) → STEP 2 (delete) → STEP 3 (vacuum) here.
--   4. Re-run backfill-midcap-prices.mjs later if/when G4 is retried with more
--      headroom — do NOT treat this cleanup as the end of G4, just the recovery.
--
-- SAFETY
--   - Touches ONLY research_prices. No india_* / sacred tables.
--   - STEP 1 is read-only. Run it and eyeball the numbers BEFORE STEP 2.
--   - STEP 2 is wrapped in an explicit transaction so you can ROLLBACK if the
--     pre-check numbers look wrong.
-- ============================================================================


-- ── STEP 1 — READ-ONLY PRE-CHECK ───────────────────────────────────────────
-- Run this first. Confirm "would_keep" ≈ your Nifty-50 history (~196K bars,
-- 48 distinct symbols) and "would_delete" ≈ the ~441K midcap bars before STEP 2.

SELECT
  COUNT(*)                                                    AS total_rows,
  COUNT(*) FILTER (WHERE symbol IN (
    '^NSEI',
    'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
    'HINDUNILVR.NS','ITC.NS','SBIN.NS','BAJFINANCE.NS','BAJAJ-AUTO.NS',
    'BHARTIARTL.NS','WIPRO.NS','MARUTI.NS','HCLTECH.NS','TATAMOTORS.NS',
    'TATASTEEL.NS','KOTAKBANK.NS','AXISBANK.NS','ULTRACEMCO.NS','SUNPHARMA.NS',
    'ASIANPAINT.NS','NESTLEIND.NS','POWERGRID.NS','NTPC.NS','ONGC.NS',
    'DIVISLAB.NS','CIPLA.NS','EICHERMOT.NS','GRASIM.NS','HEROMOTOCO.NS',
    'HINDALCO.NS','INDUSINDBK.NS','JSWSTEEL.NS','LT.NS','M&M.NS',
    'TECHM.NS','TITAN.NS','UPL.NS','ADANIPORTS.NS','ADANIENT.NS',
    'DRREDDY.NS','BAJAJFINSV.NS','BRITANNIA.NS','COALINDIA.NS','SBILIFE.NS',
    'HDFCLIFE.NS','APOLLOHOSP.NS'
  ))                                                          AS would_keep,
  COUNT(*) FILTER (WHERE symbol NOT IN (
    '^NSEI',
    'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
    'HINDUNILVR.NS','ITC.NS','SBIN.NS','BAJFINANCE.NS','BAJAJ-AUTO.NS',
    'BHARTIARTL.NS','WIPRO.NS','MARUTI.NS','HCLTECH.NS','TATAMOTORS.NS',
    'TATASTEEL.NS','KOTAKBANK.NS','AXISBANK.NS','ULTRACEMCO.NS','SUNPHARMA.NS',
    'ASIANPAINT.NS','NESTLEIND.NS','POWERGRID.NS','NTPC.NS','ONGC.NS',
    'DIVISLAB.NS','CIPLA.NS','EICHERMOT.NS','GRASIM.NS','HEROMOTOCO.NS',
    'HINDALCO.NS','INDUSINDBK.NS','JSWSTEEL.NS','LT.NS','M&M.NS',
    'TECHM.NS','TITAN.NS','UPL.NS','ADANIPORTS.NS','ADANIENT.NS',
    'DRREDDY.NS','BAJAJFINSV.NS','BRITANNIA.NS','COALINDIA.NS','SBILIFE.NS',
    'HDFCLIFE.NS','APOLLOHOSP.NS'
  ))                                                          AS would_delete
FROM research_prices;

-- Optional: list the distinct symbols that WOULD be deleted (should be only
-- midcap tickers, ≈140 of them). Eyeball that nothing in the KEEP set appears.
SELECT symbol, COUNT(*) AS bars
FROM research_prices
WHERE symbol NOT IN (
  '^NSEI',
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
  'HINDUNILVR.NS','ITC.NS','SBIN.NS','BAJFINANCE.NS','BAJAJ-AUTO.NS',
  'BHARTIARTL.NS','WIPRO.NS','MARUTI.NS','HCLTECH.NS','TATAMOTORS.NS',
  'TATASTEEL.NS','KOTAKBANK.NS','AXISBANK.NS','ULTRACEMCO.NS','SUNPHARMA.NS',
  'ASIANPAINT.NS','NESTLEIND.NS','POWERGRID.NS','NTPC.NS','ONGC.NS',
  'DIVISLAB.NS','CIPLA.NS','EICHERMOT.NS','GRASIM.NS','HEROMOTOCO.NS',
  'HINDALCO.NS','INDUSINDBK.NS','JSWSTEEL.NS','LT.NS','M&M.NS',
  'TECHM.NS','TITAN.NS','UPL.NS','ADANIPORTS.NS','ADANIENT.NS',
  'DRREDDY.NS','BAJAJFINSV.NS','BRITANNIA.NS','COALINDIA.NS','SBILIFE.NS',
  'HDFCLIFE.NS','APOLLOHOSP.NS'
)
GROUP BY symbol
ORDER BY symbol;


-- ── STEP 2 — DELETE THE MIDCAP ROWS (transactional) ────────────────────────
-- Only run after STEP 1 numbers look right. The DELETE row count must equal
-- "would_delete" from STEP 1. If it doesn't — ROLLBACK and stop.

BEGIN;

DELETE FROM research_prices
WHERE symbol NOT IN (
  '^NSEI',
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','INFY.NS','ICICIBANK.NS',
  'HINDUNILVR.NS','ITC.NS','SBIN.NS','BAJFINANCE.NS','BAJAJ-AUTO.NS',
  'BHARTIARTL.NS','WIPRO.NS','MARUTI.NS','HCLTECH.NS','TATAMOTORS.NS',
  'TATASTEEL.NS','KOTAKBANK.NS','AXISBANK.NS','ULTRACEMCO.NS','SUNPHARMA.NS',
  'ASIANPAINT.NS','NESTLEIND.NS','POWERGRID.NS','NTPC.NS','ONGC.NS',
  'DIVISLAB.NS','CIPLA.NS','EICHERMOT.NS','GRASIM.NS','HEROMOTOCO.NS',
  'HINDALCO.NS','INDUSINDBK.NS','JSWSTEEL.NS','LT.NS','M&M.NS',
  'TECHM.NS','TITAN.NS','UPL.NS','ADANIPORTS.NS','ADANIENT.NS',
  'DRREDDY.NS','BAJAJFINSV.NS','BRITANNIA.NS','COALINDIA.NS','SBILIFE.NS',
  'HDFCLIFE.NS','APOLLOHOSP.NS'
);

-- Verify before committing: this should now equal STEP 1 "would_keep".
SELECT COUNT(*) AS remaining_rows, COUNT(DISTINCT symbol) AS remaining_symbols
FROM research_prices;

-- If the numbers are right:
COMMIT;
-- If anything looks wrong instead:
-- ROLLBACK;


-- ── STEP 3 — RECLAIM DISK ──────────────────────────────────────────────────
-- VACUUM FULL cannot run inside a transaction block — run it on its own, after
-- COMMIT. It rewrites the table into a fresh, compact copy and returns the freed
-- pages to the OS (a plain VACUUM would NOT shrink the on-disk file). It needs
-- free space for the new copy, which is why the volume must be grown FIRST.

VACUUM FULL research_prices;

-- Post-cleanup sanity (read-only):
SELECT COUNT(*) AS rows, COUNT(DISTINCT symbol) AS symbols, MAX(trade_date) AS latest
FROM research_prices;
SELECT pg_size_pretty(pg_total_relation_size('research_prices')) AS table_size;
