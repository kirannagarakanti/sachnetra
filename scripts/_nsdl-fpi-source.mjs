#!/usr/bin/env node
// NSDL FPI Monitor adapter — handshake + fetch + parse for V2-017b backfill.
// Exports: fetchHandshake(), fetchMonthData(handshake, dateStr)
// dateStr format: DD-MMM-YYYY  e.g. "31-Jan-1999"

import { CHROME_UA } from './_seed-utils.mjs';

const ARCHIVE_URL = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';

// Investment routes — cells whose first column is a route, not a Debt/Equity category
const ROUTE_CELLS = new Set([
  'Stock Exchange', 'Primary market & others', 'Sub-total',
  'Equity schemes', 'Debt schemes', 'Hybrid schemes',
  'Solution oriented schemes', 'Other schemes',
]);

const DATE_RE = /^\d{2}-[A-Z][a-z]{2}-\d{4}$/;

const MONTH_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

// Step 1 of the ASP.NET handshake — GET Archive.aspx, collect cookies + hidden fields.
export async function fetchHandshake() {
  const resp = await fetch(ARCHIVE_URL, {
    headers: { 'User-Agent': CHROME_UA },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`NSDL handshake GET failed: HTTP ${resp.status}`);
  const html = await resp.text();
  const cookies = (resp.headers.getSetCookie?.() ?? [])
    .map(c => c.split(';')[0].trim())
    .filter(c => c && !c.endsWith('='))
    .join('; ');
  return {
    cookies,
    viewState: extractInput(html, '__VIEWSTATE'),
    viewStateGen: extractInput(html, '__VIEWSTATEGENERATOR'),
    eventValidation: extractInput(html, '__EVENTVALIDATION'),
  };
}

// Step 2 — POST Archive.aspx for a given date. Returns parsed daily FPI equity rows
// (₹ crore, Equity segment Sub-total only) or [] if no data for that month.
export async function fetchMonthData(handshake, dateStr) {
  const body = new URLSearchParams({
    __EVENTTARGET: 'btnSubmit1',
    __EVENTARGUMENT: '',
    __VIEWSTATE: handshake.viewState,
    __VIEWSTATEGENERATOR: handshake.viewStateGen,
    __EVENTVALIDATION: handshake.eventValidation,
    txtDate: dateStr,
    hdnDate: dateStr,
    hdnFlag: '',
  });
  const resp = await fetch(ARCHIVE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': CHROME_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': ARCHIVE_URL,
      'Origin': 'https://www.fpi.nsdl.co.in',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': handshake.cookies,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`NSDL POST failed: HTTP ${resp.status}`);
  const html = await resp.text();
  // Success markers per Decision 1
  if (!html.includes('dvArchiveData') || !html.includes('Reporting Date')) return [];
  return parseNsdlHtml(html);
}

// Parse the 2nd <table> (index 1) from the POST response.
// Table structure (rowspan causes cells to shift per row):
//   8-cell row: [date, debtEquity, route, buy_rs, sell_rs, net_rs, net_usd, conversion] — new date
//   6-cell row: [debtEquity, route, buy_rs, sell_rs, net_rs, net_usd]                   — new category
//   5-cell row: [route, buy_rs, sell_rs, net_rs, net_usd]                               — same category
// We emit one row per date where debtEquity="Equity" and route="Sub-total".
function parseNsdlHtml(html) {
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
  if (tables.length < 2) return [];
  const tableContent = tables[1][1];

  const rows = [];
  for (const trMatch of tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [];
    for (const cm of trMatch[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)) {
      cells.push(cm[1].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' '));
    }
    if (cells.length >= 2) rows.push(cells);
  }

  const results = [];
  let currentDate = null;
  let currentCategory = null;

  for (const cells of rows) {
    const first = cells[0];

    if (DATE_RE.test(first)) {
      // New date row: cells[0]=date, cells[1]=Debt/Equity, cells[2]=route, cells[3..]=values
      currentDate = first;
      currentCategory = cells[1] ?? null;
      continue;
    }

    if (first === 'Sub-total') {
      if (currentCategory === 'Equity' && currentDate && cells.length >= 4) {
        results.push({
          flow_date: nsdlDateToIso(currentDate),
          gross_buy: parseNsdlNumber(cells[1]),
          gross_sell: parseNsdlNumber(cells[2]),
          net: parseNsdlNumber(cells[3]),
        });
      }
      continue;
    }

    // Update current Debt/Equity category when a non-route, non-date cell appears
    if (currentDate && !ROUTE_CELLS.has(first)) {
      currentCategory = first;
    }
  }

  return results;
}

function parseNsdlNumber(str) {
  if (!str) return 0;
  const s = str.trim();
  // Parentheses = negative value: (8024.14) → -8024.14
  if (s.startsWith('(') && s.endsWith(')')) return -(parseFloat(s.slice(1, -1)) || 0);
  return parseFloat(s) || 0;
}

function nsdlDateToIso(dateStr) {
  // "04-May-2026" → "2026-05-04"
  const [day, mon, year] = dateStr.split('-');
  return `${year}-${MONTH_MAP[mon]}-${day.padStart(2, '0')}`;
}

function extractInput(html, name) {
  const re = new RegExp(`<input[^>]+name\\s*=\\s*["']${name}["'][^>]*>`, 'i');
  const tag = re.exec(html)?.[0] ?? '';
  return /value\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
}
