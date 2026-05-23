#!/usr/bin/env node

// V2-030 — NSE bulk & block deals source adapter.
//
// Fetches EOD bulk and block deal disclosures from NSE's CSV endpoint.
// CSV is mandatory — the JSON variant is hard-capped at 70 rows and a single
// busy day can exceed that (Decision 1). Warm-up: two-hop plain fetch
// (homepage → report page), same plain-fetch approach as V2-018 (Decision 1b).
// BSE and short-selling are documented stubs, deferred (Decision 7).

import { createHash } from 'node:crypto';
import { CHROME_UA } from './_seed-utils.mjs';

// -- Warm-up URLs (fragile external constants — isolate here per V2-024 lesson)
const NSE_ORIGIN      = 'https://www.nseindia.com/';
const NSE_REPORT_PAGE = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals';
const NSE_DEALS_API   = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals';
const NSE_REFERER     = NSE_REPORT_PAGE;

// Month abbreviation → zero-padded number (Decision 8: DD-MON-YYYY parsing)
const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * Two-hop plain-fetch warm-up (Decision 1b).
 * Hop 1: GET NSE homepage (sets bm_sz cookie).
 * Hop 2: GET the bulk/block report page (sets bm_sv cookie).
 * Merges both Set-Cookie headers — hop-2 values win on name collision.
 *
 * @returns {Promise<string>} merged cookie string ready for data calls
 * @throws {Error} on HTTP failure or no cookies returned
 */
export async function warmUpNSE() {
  const resp1 = await fetch(NSE_ORIGIN, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp1.ok) throw new Error(`NSE warm-up hop 1 HTTP ${resp1.status}`);
  const cookies1 = extractCookies(resp1.headers);

  const resp2 = await fetch(NSE_REPORT_PAGE, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookies1,
      Referer: NSE_ORIGIN,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp2.ok) throw new Error(`NSE warm-up hop 2 HTTP ${resp2.status}`);
  const cookies2 = extractCookies(resp2.headers);

  const merged = mergeCookies(cookies1, cookies2);
  if (!merged) throw new Error('NSE warm-up returned no Set-Cookie (bot wall or markup change)');
  return merged;
}

function extractCookies(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean);
  return setCookies
    .map((c) => String(c).split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function mergeCookies(base, override) {
  const map = new Map();
  for (const pair of [...base.split('; '), ...override.split('; ')]) {
    const eq = pair.indexOf('=');
    const name = eq >= 0 ? pair.slice(0, eq).trim() : pair.trim();
    if (name) map.set(name, pair.trim());
  }
  return [...map.values()].filter(Boolean).join('; ');
}

/**
 * Fetch bulk or block deals as CSV for a date window (Decision 1: &csv=true).
 * Returns raw CSV text. 401/403 → throw so caller can re-warm and retry.
 *
 * @param {object} args
 * @param {'bulk_deals'|'block_deals'} args.dealType
 * @param {string} args.fromDate  DD-MM-YYYY
 * @param {string} args.toDate    DD-MM-YYYY
 * @param {string} args.cookie    from warmUpNSE()
 * @returns {Promise<string>} raw CSV text
 */
export async function fetchDeals({ dealType, fromDate, toDate, cookie }) {
  if (!dealType || !fromDate || !toDate) {
    throw new Error('fetchDeals: dealType, fromDate, toDate required');
  }
  if (!cookie) {
    throw new Error('fetchDeals: cookie required — call warmUpNSE() first');
  }

  const url =
    `${NSE_DEALS_API}` +
    `?optionType=${encodeURIComponent(dealType)}` +
    `&from=${encodeURIComponent(fromDate)}` +
    `&to=${encodeURIComponent(toDate)}` +
    `&csv=true`;

  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/csv,text/plain,*/*',
      Referer: NSE_REFERER,
      Cookie: cookie,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    throw new Error(`NSE deals HTTP ${resp.status} (dealType=${dealType})`);
  }

  return resp.text();
}

/**
 * Parse NSE bulk/block deals CSV (Decision 8).
 * - Double-quoted fields (quoted-field-aware parse)
 * - Headers have trailing spaces → trimmed
 * - Quantity/price use Indian commas ("10,51,916") → stripped before parse
 * - Date is DD-MON-YYYY ("15-MAY-2026", IST) → ISO "YYYY-MM-DD"
 * - Header-only or empty CSV → returns [] (Decision 6: holiday/weekend)
 *
 * @param {string} text       raw CSV text from fetchDeals()
 * @param {'bulk'|'block'} dealType  discriminator column value
 * @returns {Array<object>} normalized rows ready for upsert
 */
export function parseDealsCsv(text, dealType) {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((h) => h.trim());

  const get = (row, header) => {
    const idx = headers.indexOf(header);
    return idx >= 0 ? (row[idx] ?? '').trim() : '';
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    if (cells.length === 0) continue;

    const rawDate    = get(cells, 'Date');
    const rawQty     = get(cells, 'Quantity Traded');
    const rawPrice   = get(cells, 'Trade Price / Wght. Avg. Price');

    const deal_date = parseDdMonYyyy(rawDate);
    if (!deal_date) continue;

    const quantity = rawQty    ? parseInt(rawQty.replace(/,/g, ''), 10)    : null;
    const price    = rawPrice  ? parseFloat(rawPrice.replace(/,/g, ''))    : null;

    rows.push({
      deal_type:     dealType,
      deal_date,
      symbol:        get(cells, 'Symbol') || null,
      security_name: get(cells, 'Security Name') || null,
      client_name:   get(cells, 'Client Name') || null,
      buy_sell:      get(cells, 'Buy / Sell') || null,
      quantity:      Number.isFinite(quantity) ? quantity : null,
      price:         Number.isFinite(price)    ? price    : null,
      remarks:       get(cells, 'Remarks') || null,
    });
  }

  return rows;
}

function parseCsvRow(line) {
  const cells = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseDdMonYyyy(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  const m = s.match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
  if (!m) return null;
  const mm = MONTHS[m[2]];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1]}`;
}

/**
 * Compute the MD5 composite deal_id PK (Decision 4).
 * Key: MD5(deal_type|deal_date|symbol|client_name|buy_sell|quantity|price).
 * Normalized values: quantity as integer string, price as 2-decimal string,
 * null fields as empty string — stable regardless of CSV vs JSON source format.
 *
 * @param {object} row  normalized row from parseDealsCsv()
 * @returns {string} hex MD5
 */
export function computeDealId(row) {
  const parts = [
    String(row.deal_type    ?? ''),
    String(row.deal_date    ?? ''),
    String(row.symbol       ?? ''),
    String(row.client_name  ?? ''),
    String(row.buy_sell     ?? ''),
    row.quantity != null ? String(Math.round(row.quantity)) : '',
    row.price    != null ? Number(row.price).toFixed(2)     : '',
  ];
  return createHash('md5').update(parts.join('|')).digest('hex');
}

/**
 * STUB — future secondary path (Decision 7 / V2-030b). BSE bulk/block deals
 * feed deferred; NSE alone is reliable and complete for V1.
 */
export async function fetchBSE() {
  throw new Error('BSE deals: future secondary path, V2-030b');
}

// Short-selling note (Decision 7): the same NSE endpoint supports
// optionType=short_selling but uses different SS_* field names. Out of scope
// for V2-030; extend this adapter + the DDL when building V2-030b.
