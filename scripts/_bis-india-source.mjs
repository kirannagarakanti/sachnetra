#!/usr/bin/env node

import { CHROME_UA } from './_seed-utils.mjs';

export const BIS_BASE = 'https://stats.bis.org/api/v1/data';

// 8 core India macro series (Decision 5). Fully-qualified SDMX keys → one series per request.
// Add new series here as a one-line entry; no schema change needed (tall table, Decision 4).
export const SERIES = [
  { series_code: 'WS_CBPOL.M.IN',            dataset: 'WS_CBPOL',      key: 'M.IN',             label: 'RBI policy rate',                   unit: '%',       frequency: 'M', revises: false },
  { series_code: 'WS_EER.M.R.B.IN',           dataset: 'WS_EER',        key: 'M.R.B.IN',         label: 'Real effective exchange rate',       unit: 'index',   frequency: 'M', revises: true  },
  { series_code: 'WS_EER.M.N.B.IN',           dataset: 'WS_EER',        key: 'M.N.B.IN',         label: 'Nominal effective exchange rate',    unit: 'index',   frequency: 'M', revises: true  },
  { series_code: 'WS_XRU.M.IN.INR.A',         dataset: 'WS_XRU',        key: 'M.IN.INR.A',       label: 'USD-INR exchange rate (period avg)', unit: 'INR/USD', frequency: 'M', revises: false },
  { series_code: 'WS_TC.Q.IN.P.A.M.770.A',    dataset: 'WS_TC',         key: 'Q.IN.P.A.M.770.A', label: 'Credit to private non-fin sector',  unit: '% GDP',   frequency: 'Q', revises: true  },
  { series_code: 'WS_CREDIT_GAP.Q.IN.P.A.C',  dataset: 'WS_CREDIT_GAP', key: 'Q.IN.P.A.C',       label: 'Credit-to-GDP gap (Basel)',          unit: 'ppt',     frequency: 'Q', revises: true  },
  { series_code: 'WS_DSR.Q.IN.P',             dataset: 'WS_DSR',        key: 'Q.IN.P',           label: 'Debt service ratio (private)',       unit: '%',       frequency: 'Q', revises: true  },
  { series_code: 'WS_LONG_CPI.M.IN.771',      dataset: 'WS_LONG_CPI',   key: 'M.IN.771',         label: 'CPI inflation (YoY)',                unit: '%',       frequency: 'M', revises: false },
];

// Re-implemented from seed-bis-data.mjs shape (not imported — Decision 8, failure isolation).
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parseBisNumber(val) {
  if (!val || val === '.' || val.trim() === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

// Reads only TIME_PERIOD + OBS_VALUE by header name. Fully-qualified keys return one
// series, so all other dimension columns are constant and can be ignored (Decision 2).
function parseBisCSV(csv) {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const tIdx = headers.indexOf('TIME_PERIOD');
  const vIdx = headers.indexOf('OBS_VALUE');
  if (tIdx === -1 || vIdx === -1) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCSVLine(line);
    const time_period = vals[tIdx] || '';
    const obs_value = parseBisNumber(vals[vIdx]);
    if (!time_period || obs_value === null) continue;
    rows.push({ time_period, obs_value });
  }
  return rows;
}

// Fetch one series. Omit startPeriod for full history (backfill use-case).
export async function fetchSeries({ dataset, key, startPeriod }) {
  const params = new URLSearchParams({ detail: 'dataonly', format: 'csv' });
  if (startPeriod) params.set('startPeriod', startPeriod);
  const url = `${BIS_BASE}/${dataset}/${key}?${params}`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': CHROME_UA, Accept: 'text/csv' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`BIS HTTP ${resp.status} for ${dataset}/${key}`);
  return parseBisCSV(await resp.text());
}

// Fetch all 8 series. Per-series failures log + skip (Decision 9); only all-fail throws.
export async function fetchAllSeries({ startPeriod } = {}) {
  const rows = [];
  let okCount = 0;
  let failCount = 0;
  for (const s of SERIES) {
    try {
      const obs = await fetchSeries({ dataset: s.dataset, key: s.key, startPeriod });
      for (const o of obs) rows.push({ series_code: s.series_code, ...o });
      console.log(`  ${s.series_code}: ${obs.length} observations`);
      okCount++;
    } catch (err) {
      console.error(`  SKIP ${s.series_code}: ${err.message}`);
      failCount++;
    }
  }
  return { rows, okCount, failCount };
}
