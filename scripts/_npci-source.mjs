#!/usr/bin/env node

import { CHROME_UA } from './_seed-utils.mjs';

// External-fragility constants — an NPCI CMS migration is a one-line fix here.
const NPCI_API_BASE    = 'https://www.npci.org.in/api/product-statistic/tab/detail';
const NPCI_TAB_MONTHLY = 'netc-fas-tag-statistics';
const NPCI_TAB_DAILY   = 'netc-daily-statistics';
const NPCI_PRODUCT     = 'netc';
const NPCI_LOCALE      = 'en';
const NPCI_HEADERS     = { 'User-Agent': CHROME_UA, Accept: 'application/json' };

// Field-key constants — isolate so a NPCI rename is a one-line fix.
const FIELD = {
  MONTHLY_PERIOD : 'month',
  MONTHLY_BANKS  : 'no_of_banks_live_on_netc',
  MONTHLY_TAGS   : 'tag_issuance_in_nos',
  MONTHLY_VOLUME : 'volume_in_mn',
  MONTHLY_AMOUNT : 'amount_in_cr',
  DAILY_DAY      : 'npci_day',
  DAILY_VOLUME   : 'netc_volume_mn',
  DAILY_AMOUNT   : 'netc_value_crores',
  DAILY_IS_TOTAL : 'isTotal',
};

// Sanity bounds for monthly unit-shift guard (Decision 8 / §Second-Order Impact).
// transaction_count  = volume_in_mn × 1e6  → expect 1 Mn – 1 Bn (1e6 – 1e9).
// transaction_value_inr = amount_in_cr × 1e7 → expect ₹100 Cr – ₹50,000 Cr raw (1e9 – 5e11).
const SANITY_COUNT_MIN = 1e6;
const SANITY_COUNT_MAX = 1e9;
const SANITY_VALUE_MIN = 1e9;
const SANITY_VALUE_MAX = 5e11;

export const MONTH_MAP = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Decision 7: strip Indian/Western commas + non-breaking spaces; null for NA/-/empty.
export function cleanNum(val) {
  if (val == null || val === '' || val === 'NA' || val === '-') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/ /g, '').trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Decision 9: TZ-safe component parse of "March 01, 2026" → "2026-03-01".
// Never uses new Date(string) — avoids UTC-vs-IST day-shift around midnight.
export function parseDailyDate(npciDay) {
  if (!npciDay || String(npciDay).trim().toLowerCase() === 'total') return null;
  const parts = String(npciDay).replace(',', '').split(/\s+/);
  if (parts.length < 3) return null;
  const m = MONTH_MAP[parts[0].toLowerCase()];
  const d = Number.parseInt(parts[1], 10);
  const y = Number.parseInt(parts[2], 10);
  if (m === undefined || Number.isNaN(d) || Number.isNaN(y)) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Decisions 5 + 9: "March-2026" → "2026-03-01" (first-of-month convention for monthly rows).
export function parseMonthlyDate(monthStr) {
  if (!monthStr) return null;
  const parts = String(monthStr).split('-');
  if (parts.length < 2) return null;
  const m = MONTH_MAP[parts[0].toLowerCase()];
  const y = Number.parseInt(parts[1], 10);
  if (m === undefined || Number.isNaN(y)) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

// Apr-pivot fiscal year string: Apr–Dec → "<yyyy>-<yy+1>"; Jan–Mar → "<yyyy-1>-<yy>".
export function fiscalYearRangeFor(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  if (m >= 4) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

// Returns [{year, monthName}, …] inclusive for both endpoints.
// monthIdx is 0-based (0 = January). monthName in results is full English ("June").
export function monthsBetween(startYear, startMonthIdx, endYear, endMonthIdx) {
  const out = [];
  let y = startYear;
  let m = startMonthIdx;
  while (y < endYear || (y === endYear && m <= endMonthIdx)) {
    out.push({ year: y, monthName: MONTH_NAMES[m] });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

// Monthly fetch: one fiscal year string (e.g. "2025-26") → raw JSON (up to 12 rows).
// Plain Node fetch — no warm-up, no cookie, no TLS dispatcher (Decision 2).
export async function fetchMonthly(yearRange) {
  const params = new URLSearchParams({
    product_name: NPCI_PRODUCT,
    tab_name: NPCI_TAB_MONTHLY,
    year_range: yearRange,
    excel_type: 'monthly',
    page_no: '1',
    page_size: '20',
    locale: NPCI_LOCALE,
  });
  const url = `${NPCI_API_BASE}?${params}`;
  const resp = await fetch(url, { headers: NPCI_HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`NPCI monthly HTTP ${resp.status} for ${yearRange}: ${body.slice(0, 200)}`);
  }
  return resp.json();
}

// Daily fetch: one calendar month (year + full monthName like "June") → raw JSON.
// Results include N daily rows + 1 Total footer row (Decision 10 strips it at parse time).
export async function fetchDailyMonth({ year, monthName }) {
  const params = new URLSearchParams({
    product_name: NPCI_PRODUCT,
    tab_name: NPCI_TAB_DAILY,
    year: String(year),
    month: monthName,
    excel_type: 'daily',
    page_no: '1',
    page_size: '50',
    locale: NPCI_LOCALE,
  });
  const url = `${NPCI_API_BASE}?${params}`;
  const resp = await fetch(url, { headers: NPCI_HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`NPCI daily HTTP ${resp.status} for ${year}/${monthName}: ${body.slice(0, 200)}`);
  }
  return resp.json();
}

// Decisions 4, 7, 8, 9, 10: parse daily JSON payload → normalized rows (footer dropped).
export function parseDailyPayload(json) {
  const results = json?.data?.results || [];
  const out = [];
  for (const row of results) {
    const dayLabel = row[FIELD.DAILY_DAY];
    if (!dayLabel) continue;
    if (String(dayLabel).trim().toLowerCase() === 'total') continue; // Decision 10
    if (row[FIELD.DAILY_IS_TOTAL] === true) continue;               // Decision 10

    const target_date = parseDailyDate(dayLabel);                   // Decision 9
    if (!target_date) continue;

    const volumeMn = cleanNum(row[FIELD.DAILY_VOLUME]);             // Decision 7
    const amountCr = cleanNum(row[FIELD.DAILY_AMOUNT]);

    out.push({
      target_date,
      row_type: 'daily_national',
      transaction_count:     volumeMn != null ? Math.round(volumeMn * 1_000_000) : null, // Decision 8
      transaction_value_inr: amountCr != null ? amountCr * 10_000_000 : null,            // Decision 8
      active_tags: null,
      live_banks:  null,
    });
  }
  return out;
}

// Decisions 4, 7, 8, 9: parse monthly JSON payload → normalized rows.
// active_tags + live_banks populated here; null on daily rows (Decision 4).
export function parseMonthlyPayload(json) {
  const results = json?.data?.results || [];
  const out = [];
  for (const row of results) {
    const target_date = parseMonthlyDate(row[FIELD.MONTHLY_PERIOD]); // Decisions 5, 9
    if (!target_date) continue;

    const volumeMn = cleanNum(row[FIELD.MONTHLY_VOLUME]);            // Decision 7
    const amountCr = cleanNum(row[FIELD.MONTHLY_AMOUNT]);
    const tagRaw   = cleanNum(row[FIELD.MONTHLY_TAGS]);
    const bankRaw  = cleanNum(row[FIELD.MONTHLY_BANKS]);

    out.push({
      target_date,
      row_type: 'monthly_national',
      transaction_count:     volumeMn != null ? Math.round(volumeMn * 1_000_000) : null, // Decision 8
      transaction_value_inr: amountCr != null ? amountCr * 10_000_000 : null,            // Decision 8
      active_tags: tagRaw  != null ? Math.round(tagRaw)  : null,
      live_banks:  bankRaw != null ? Math.round(bankRaw) : null,
    });
  }
  return out;
}

// Unit-shift guard (§Second-Order Impact / Decision 8): asserts the most recent
// monthly row's count and value are within expected unit ranges. Returns false
// and logs loudly if NPCI silently changed units — the seed skips the upsert.
export function sanityCheckMonthly(rows) {
  if (!rows.length) return true;
  const latest = rows.reduce((a, b) => (a.target_date > b.target_date ? a : b));
  const { transaction_count: tc, transaction_value_inr: tv } = latest;

  if (tc != null && (tc < SANITY_COUNT_MIN || tc > SANITY_COUNT_MAX)) {
    console.error(
      `SANITY FAIL: transaction_count=${tc} out of expected range ` +
      `[${SANITY_COUNT_MIN}, ${SANITY_COUNT_MAX}]. ` +
      `NPCI may have changed units on ${FIELD.MONTHLY_VOLUME}. Skipping upsert.`
    );
    return false;
  }
  if (tv != null && (tv < SANITY_VALUE_MIN || tv > SANITY_VALUE_MAX)) {
    console.error(
      `SANITY FAIL: transaction_value_inr=${tv} out of expected range ` +
      `[${SANITY_VALUE_MIN}, ${SANITY_VALUE_MAX}]. ` +
      `NPCI may have changed units on ${FIELD.MONTHLY_AMOUNT}. Skipping upsert.`
    );
    return false;
  }
  return true;
}
