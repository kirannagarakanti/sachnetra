#!/usr/bin/env node

// V2-017 — FII/DII institutional-flows source adapters.
//
// V1 primary: Moneycontrol __NEXT_DATA__ parse (Decision 1). NSE/BSE are
// stubbed-only — the future superseding path (Decision 4 / V2-017b). The
// consumer (seed-india-flows.mjs / backfill-india-flows.mjs) imports
// fetchMoneycontrol() and the NoFlowDataError signal; it never imports the
// stubs in V1.

import { CHROME_UA } from './_seed-utils.mjs';

const MONEYCONTROL_URL = 'https://www.moneycontrol.com/markets/fii-dii-data/cash/';

// Typed "no data" signal. Decision 5: a holiday / pre-publish run is NOT an
// error — the caller catches THIS specific class, logs one line, exits 0.
// Any other thrown error is a real failure (bot wall, prop drift) and bubbles.
export class NoFlowDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NoFlowDataError';
  }
}

// Moneycontrol values are comma-grouped strings, negatives prefixed '-'
// (e.g. "17,222.18", "-587.80"). Empty / "-" / null → null (nullable column).
function parseAmount(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Moneycontrol date is already ISO YYYY-MM-DD (Research Appendix). Guard the
// shape so a format drift fails loudly rather than poisoning the date column.
function normalizeDate(raw) {
  const d = String(raw ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

// One Moneycontrol row → two normalized rows (FII + DII). Field names match
// the Research Appendix exactly — note the `fiiSales` (s) vs `diiSale` (no s)
// asymmetry. net is NOT NULL in the schema; fall back to buy − sell only when
// the explicit net is absent but both legs are present.
function mapRow(row) {
  const flowDate = normalizeDate(row?.date);
  if (!flowDate) return [];

  const build = (type, buyRaw, sellRaw, netRaw) => {
    const gross_buy = parseAmount(buyRaw);
    const gross_sell = parseAmount(sellRaw);
    let net = parseAmount(netRaw);
    if (net == null && gross_buy != null && gross_sell != null) {
      net = +(gross_buy - gross_sell).toFixed(2);
    }
    if (net == null) return null; // cannot satisfy NOT NULL — skip this leg
    return {
      flow_date: flowDate,
      investor_type: type,
      gross_buy,
      gross_sell,
      net,
    };
  };

  return [
    build('FII', row?.fiiPurchase, row?.fiiSales, row?.fiiNet),
    build('DII', row?.diiPurchase, row?.diiSale, row?.diiNet),
  ].filter(Boolean);
}

/**
 * V1 PRIMARY (Decision 1). One headless GET → parse the inline
 * `<script id="__NEXT_DATA__">` blob → props.pageProps.FiiDiiData.fiiDiiData[].
 * NEVER hit /_next/data/<buildId>/FiiDii.json — buildId rotates and 404s.
 *
 * @returns {Promise<Array<{flow_date,investor_type,gross_buy,gross_sell,net}>>}
 *   normalized rows (2 per trading day, newest-first as Moneycontrol serves).
 * @throws {NoFlowDataError} when the array is absent/empty (holiday / pre-publish)
 * @throws {Error} on HTTP failure, missing script tag, or prop-path drift
 */
export async function fetchMoneycontrol() {
  const resp = await fetch(MONEYCONTROL_URL, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) {
    throw new Error(`Moneycontrol HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error('No __NEXT_DATA__ script found (bot wall or markup change)');
  }

  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`__NEXT_DATA__ JSON.parse failed: ${err.message}`);
  }

  const arr = parsed?.props?.pageProps?.FiiDiiData?.fiiDiiData;
  if (!Array.isArray(arr)) {
    throw new Error('prop path props.pageProps.FiiDiiData.fiiDiiData not an array (drift)');
  }
  if (arr.length === 0) {
    throw new NoFlowDataError('fiiDiiData array empty (holiday or not yet published)');
  }

  const rows = arr.flatMap(mapRow);
  if (rows.length === 0) {
    throw new NoFlowDataError('no parseable rows in fiiDiiData (holiday or not yet published)');
  }
  return rows;
}

/**
 * STUB — future superseding path (Decision 4 / V2-017b). NSE warm-up handshake:
 * GET https://www.nseindia.com/ → captures set-cookie (nsit, nseappid, …),
 * then GET https://www.nseindia.com/api/fiidiiTradeReact with that Cookie +
 * Referer. Returns current day ONLY (array length 2, 1 date — zero backfill).
 * Fields: category ('DII' | 'FII/FPI'), date (DD-MMM-YYYY), buyValue,
 * sellValue, netValue. Note label is 'FII/FPI', not 'FII'. Not implemented.
 */
export async function fetchNSE() {
  throw new Error('NSE adapter: future superseding path, V2-017b');
}

/**
 * STUB — future superseding path (Decision 4 / V2-017b). BSE per-date API:
 * GET https://api.bseindia.com/BseIndiaAPI/api/StockpricesearchData/w
 *   ?MonthDate={DD/MM/YYYY}&Scode=&Seg=C&YearDate={DD/MM/YYYY}&pageType=1&rbType=D
 * (date in BOTH params). Requires Chrome UA + Referer
 * https://www.bseindia.com/markets/equity/EQReports/categorywise_turnover +
 * Origin https://www.bseindia.com (CORS-blocked otherwise). Response
 * CatStockData[] — DII-only (*_DII_BSENSE); FII/FPI NOT exposed. Cannot
 * supersede FII. Not implemented.
 */
export async function fetchBSE() {
  throw new Error('BSE adapter: future superseding path, V2-017b');
}
