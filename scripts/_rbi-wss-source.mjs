#!/usr/bin/env node

// V2-019 — RBI Weekly Statistical Supplement source adapter.
//
// Responsibilities:
//   resolveLatestRelease(date) → fetch detail page → regex the dated XLSX link
//   downloadWorkbook(url)      → fetch binary with WAF-bypass UA (Decision 2)
//   parseWss(buffer)           → SheetJS parse with label-guarded cell reads (Decision 5)
//
// Data target: Railway PostgreSQL (india_rbi_wss). Does NOT touch the news pipeline.
// Consumers: seed-india-rbi-wss.mjs (weekly) + backfill-india-rbi-wss.mjs (one-time).

import * as XLSX from 'xlsx';
import { CHROME_UA } from './_seed-utils.mjs';

// WAF-bypass UA for rbidocs.rbi.org.in binary downloads (Decision 2).
// F5 Advanced WAF blocks browser UAs with a JS challenge; Python-urllib passes.
// Isolated here — one-line fix if F5 rules change.
export const PYTHON_UA = 'Python-urllib/3.13';

const DETAIL_BASE =
  'https://www.rbi.org.in/Scripts/WSSViewDetail.aspx?TYPE=Basic&PARAM1=';

// Matches the full-supplement XLSX link inside the detail page HTML.
// URL shape: https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS<date>_ENC<hex>.XLSX
const XLSX_LINK_RE =
  /https:\/\/rbidocs\.rbi\.org\.in\/rdocs\/Wss\/DOCs\/[^\s"'<>]+\.XLSX/i;

// --- Date helpers -------------------------------------------------------

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Parse RBI date strings: "Apr. 30, 2026", "May 08, 2026", "Apr. 30" (no year).
// Returns ISO YYYY-MM-DD or null.
function parseRbiDate(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/([A-Za-z]{3})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const mon = MONTH_MAP[m[1].toLowerCase()];
  if (!mon) return null;
  return `${m[3]}-${mon}-${String(m[2]).padStart(2, '0')}`;
}

// --- SheetJS cell accessors --------------------------------------------

function cellText(ws, ref) {
  const cell = ws[ref];
  if (!cell) return '';
  return String(cell.v ?? '').trim();
}

function cellNum(ws, ref) {
  const cell = ws[ref];
  if (!cell) return null;
  const n = Number(cell.v);
  return Number.isFinite(n) ? n : null;
}

// --- Public API ---------------------------------------------------------

/**
 * Resolve the XLSX download link for a given Friday release date.
 * Returns the URL string, or null if the detail page has no link yet (Decision 6).
 *
 * @param {Date} fridayDate - UTC midnight of the Friday release date
 * @returns {Promise<string|null>}
 */
export async function resolveLatestRelease(fridayDate) {
  const month = String(fridayDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(fridayDate.getUTCDate()).padStart(2, '0');
  const year = fridayDate.getUTCFullYear();
  const detailUrl = `${DETAIL_BASE}${month}/${day}/${year}`;

  const resp = await fetch(detailUrl, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`WSS detail page HTTP ${resp.status} (${month}/${day}/${year})`);

  const html = await resp.text();
  const match = html.match(XLSX_LINK_RE);
  return match ? match[0] : null;
}

/**
 * Download the XLSX workbook binary using the WAF-bypass UA (Decision 2).
 * Surfaces a clear error on 403 so Lijo's run shows the regression immediately.
 *
 * @param {string} xlsxUrl - from resolveLatestRelease
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadWorkbook(xlsxUrl) {
  const resp = await fetch(xlsxUrl, {
    headers: { 'User-Agent': PYTHON_UA, Accept: '*/*' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    throw new Error(
      `XLSX download HTTP ${resp.status} — WAF blocked? Check PYTHON_UA constant (Decision 2)`,
    );
  }

  const buffer = await resp.arrayBuffer();

  // A WAF JS-challenge response is HTML, not a binary workbook.
  // Detect by magic bytes: '<!DO' (3c21444f) or '<htm' (3c68746d).
  const magic = Buffer.from(buffer).subarray(0, 4).toString('hex');
  if (magic === '3c21444f' || magic === '3c68746d') {
    throw new Error(
      'XLSX download returned HTML challenge page — WAF UA changed, update PYTHON_UA (Decision 2)',
    );
  }

  return buffer;
}

/**
 * Parse the WSS workbook into a normalized release record.
 *
 * Label guards (Decision 5): before reading any value cell, assert the adjacent
 * label cell matches the expected text exactly (full numbered prefix). Mismatch →
 * skip that indicator + log one line. Never writes a mislabelled number.
 *
 * Per-indicator as-on dates (Decision 4): SCB/monetary are fortnightly (T_4/T_7),
 * forex is weekly (T_2). Each stored separately in the returned record.
 *
 * Indicator → cell map (May 15 2026 release; 1-indexed rows, SheetJS A1 refs):
 *   T_4  B32/C32  "7 Bank Credit"              bank_credit        (₹ crore)
 *   T_4  B13/C13  "2.1 Aggregate Deposits"     aggregate_deposits (₹ crore)
 *   T_4  C4       as-on string for scb_as_on
 *   T_7  B9/D9    "Reserve Money"              reserve_money      (₹ crore)
 *   T_7  B11/D11  "1.1 Currency in Circulation" currency_in_circulation (₹ crore)
 *   T_7  C5+D7    year + month-day → monetary_as_on
 *   T_6  B9/D9    "M3"                         m3                 (₹ crore)
 *   T_2  B7/C7    "1 Total Reserves"           forex_reserves_inr_cr (₹ crore)
 *   T_2  B7/D7    "1 Total Reserves"           forex_reserves_usd_mn (USD mn)
 *   T_2  C3       as-on string for forex_as_on
 *
 * @param {ArrayBuffer} buffer - raw XLSX bytes from downloadWorkbook
 * @returns {Object} partial record; missing indicators left undefined (label drift)
 */
export function parseWss(buffer) {
  const wb = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
  const rec = {};

  // --- T_4: Scheduled Commercial Banks -----------------------------------
  const ws4 = wb.Sheets['T_4'];
  if (ws4) {
    // scb_as_on: C4 = "Outstanding as on Apr. 30, 2026"
    const asOnRaw = cellText(ws4, 'C4');
    const asOnM = asOnRaw.match(/Outstanding\s+as\s+on\s+(.+)/i);
    rec.scb_as_on = asOnM ? parseRbiDate(asOnM[1]) : null;

    for (const { key, labelRef, valueRef, label } of [
      { key: 'bank_credit',        labelRef: 'B32', valueRef: 'C32', label: '7 Bank Credit' },
      { key: 'aggregate_deposits', labelRef: 'B13', valueRef: 'C13', label: '2.1 Aggregate Deposits' },
    ]) {
      const lbl = cellText(ws4, labelRef);
      if (lbl !== label) {
        console.log(`[rbiwss] label guard SKIP T_4!${labelRef}: expected "${label}", got "${lbl}"`);
        continue;
      }
      rec[key] = cellNum(ws4, valueRef);
    }
  } else {
    console.log('[rbiwss] worksheet T_4 not found — skipping SCB indicators');
  }

  // --- T_7: Reserve Money ------------------------------------------------
  const ws7 = wb.Sheets['T_7'];
  if (ws7) {
    // monetary_as_on: C5 = year ("2026"), D7 = month-day ("Apr. 30")
    const year7 = cellText(ws7, 'C5');
    const datePart7 = cellText(ws7, 'D7');
    rec.monetary_as_on = parseRbiDate(`${datePart7}, ${year7}`);

    for (const { key, labelRef, valueRef, label } of [
      { key: 'reserve_money',           labelRef: 'B9',  valueRef: 'D9',  label: 'Reserve Money' },
      { key: 'currency_in_circulation', labelRef: 'B11', valueRef: 'D11', label: '1.1 Currency in Circulation' },
    ]) {
      const lbl = cellText(ws7, labelRef);
      if (lbl !== label) {
        console.log(`[rbiwss] label guard SKIP T_7!${labelRef}: expected "${label}", got "${lbl}"`);
        continue;
      }
      rec[key] = cellNum(ws7, valueRef);
    }
  } else {
    console.log('[rbiwss] worksheet T_7 not found — skipping reserve money indicators');
  }

  // --- T_6: Money Stock (M3) — monetary_as_on from T_7; T_6 as fallback --
  const ws6 = wb.Sheets['T_6'];
  if (ws6) {
    if (!rec.monetary_as_on) {
      const year6 = cellText(ws6, 'C5');
      const datePart6 = cellText(ws6, 'D7');
      rec.monetary_as_on = parseRbiDate(`${datePart6}, ${year6}`);
    }
    const lbl6 = cellText(ws6, 'B9');
    if (lbl6 !== 'M3') {
      console.log(`[rbiwss] label guard SKIP T_6!B9: expected "M3", got "${lbl6}"`);
    } else {
      rec.m3 = cellNum(ws6, 'D9');
    }
  } else {
    console.log('[rbiwss] worksheet T_6 not found — skipping M3');
  }

  // --- T_2: Foreign Exchange Reserves ------------------------------------
  const ws2 = wb.Sheets['T_2'];
  if (ws2) {
    // forex_as_on: C3 = "As on May 08, 2026"
    const asOnRaw2 = cellText(ws2, 'C3');
    const asOnM2 = asOnRaw2.match(/As\s+on\s+(.+)/i);
    rec.forex_as_on = asOnM2 ? parseRbiDate(asOnM2[1]) : null;

    // Both INR and USD share the same label guard row (B7)
    const lbl2 = cellText(ws2, 'B7');
    if (lbl2 !== '1 Total Reserves') {
      console.log(`[rbiwss] label guard SKIP T_2!B7: expected "1 Total Reserves", got "${lbl2}"`);
    } else {
      rec.forex_reserves_inr_cr = cellNum(ws2, 'C7');
      rec.forex_reserves_usd_mn = cellNum(ws2, 'D7');
    }
  } else {
    console.log('[rbiwss] worksheet T_2 not found — skipping forex indicators');
  }

  return rec;
}
