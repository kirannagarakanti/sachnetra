#!/usr/bin/env node

// V2-026 — Grid-India / POSOCO daily electricity demand source adapter.
//
// TLS NOTE: Grid-India subdomains (webapi.grid-india.in, webcdn.grid-india.in)
// serve an incomplete certificate chain that Node's native fetch rejects. We
// use a dedicated https.Agent with rejectUnauthorized:false via gridIndiaFetch()
// — applied only to these two hosts. See SECURITY NOTE below.
//
// No cookie warm-up, no Referer, no JS. Plain JSON-POST (file list) + plain
// GET (XLS download). Data target is PostgreSQL; Redis key is status only.

import https from 'node:https';
import xlsx from 'xlsx';

// SECURITY NOTE: Grid-India serves an incomplete TLS chain on
// webapi.grid-india.in and webcdn.grid-india.in. Node's native fetch rejects
// the handshake. We use a dedicated https.Agent with rejectUnauthorized:false
// that is passed ONLY inside gridIndiaFetch() — never globally, never to any
// other host. The goal is surgical relaxation for two known public-data
// subdomains, not for anything else this process ever fetches.
const GRID_INDIA_AGENT = new https.Agent({ rejectUnauthorized: false });

// Thin https.request wrapper for grid-india URLs only.
// Returns a fetch-like object: { ok, status, json(), arrayBuffer(), text() }.
function gridIndiaFetch(url, { method = 'GET', headers = {}, body, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port:     u.port || 443,
        path:     u.pathname + u.search,
        method,
        headers,
        agent: GRID_INDIA_AGENT,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({
            ok:          res.statusCode >= 200 && res.statusCode < 300,
            status:      res.statusCode,
            json:        () => Promise.resolve(JSON.parse(buf.toString('utf8'))),
            arrayBuffer: () => Promise.resolve(buf),
            text:        () => Promise.resolve(buf.toString('utf8')),
          });
        });
        res.on('error', reject);
      },
    );

    const timer = setTimeout(
      () => req.destroy(new Error(`gridIndiaFetch timeout (${timeoutMs}ms): ${url}`)),
      timeoutMs,
    );
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);

    if (body) req.write(body);
    req.end();
  });
}

// External-fragility constants — a Grid-India layout change is a one-line fix here.
const GRID_INDIA_API_BASE  = 'https://webapi.grid-india.in/api/v1';
const GRID_INDIA_CDN_BASE  = 'https://webcdn.grid-india.in';
const PSP_SHEET            = 'MOP_E';
const PSP_REPORTING_CELL   = { row: 2, col: 8 }; // Row 3, Col 9 (0-indexed)
const SECTION_A_HEADER     = /A\.\s*Power Supply Position/i;
const SECTION_C_HEADER     = /C\.\s*Power Supply Position in States/i;
const XLS_FILENAME_REGEX   = /^(\d{2})\.(\d{2})\.(\d{2})_NLDC_PSP_\d+\.xls$/;

const KNOWN_REGIONS = new Set(['NR', 'WR', 'SR', 'ER', 'NER']);

// --- Fiscal year ---

// Apr-pivot: month >= 4 → "YYYY-(YY+1)"; month 1–3 → "(YYYY-1)-YY"
export function fiscalYearFor(date) {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

// --- Numeric helpers ---

function toNumOrNull(v) {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(typeof v === 'string' ? v.trim().replace(/,/g, '') : v);
  return Number.isFinite(n) ? n : null;
}

function parseReportingDate(s) {
  // Parse "DD-MMM-YYYY" → UTC Date (e.g. "24-May-2026")
  const MONTHS = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4,  Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = String(s).trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) throw new Error(`parseReportingDate: unexpected format "${s}"`);
  const key = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  if (MONTHS[key] === undefined) throw new Error(`parseReportingDate: unknown month "${m[2]}"`);
  return new Date(Date.UTC(Number(m[3]), MONTHS[key], Number(m[1])));
}

function subDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// Decision 9: split the OD/UD column into two numeric columns.
// "778/ -819" → { max_od_mw: 778, max_ud_mw: -819 }
// "914"       → { max_od_mw: 914, max_ud_mw: null }
// "-819"      → { max_od_mw: null, max_ud_mw: -819 }
export function parseMaxOdUd(raw) {
  if (raw == null || raw === '' || raw === '-') return { max_od_mw: null, max_ud_mw: null };
  const s = String(raw).trim();
  if (s === '' || s === '-') return { max_od_mw: null, max_ud_mw: null };
  if (s.includes('/')) {
    const [a, b] = s.split('/').map((x) => Number(x.trim()));
    return {
      max_od_mw: Number.isFinite(a) ? a : null,
      max_ud_mw: Number.isFinite(b) ? b : null,
    };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return { max_od_mw: null, max_ud_mw: null };
  return n > 0 ? { max_od_mw: n, max_ud_mw: null } : { max_od_mw: null, max_ud_mw: n };
}

// Decision 10: filter file list by target-date prefix; pick highest revision suffix.
export function pickXlsForDate(files, targetDate) {
  const dd = String(targetDate.getUTCDate()).padStart(2, '0');
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(targetDate.getUTCFullYear()).slice(-2);
  const prefix = `${dd}.${mm}.${yy}_NLDC_PSP_`;

  const matches = files.filter((f) => {
    const name = String(f.FilePath ?? '').split('/').pop();
    return XLS_FILENAME_REGEX.test(name) && name.startsWith(prefix);
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Multiple revisions published for the same day → pick the highest _NNN suffix.
  return matches.sort((a, b) => {
    const numA = Number(a.FilePath.match(/_(\d+)\.xls$/)?.[1] ?? 0);
    const numB = Number(b.FilePath.match(/_(\d+)\.xls$/)?.[1] ?? 0);
    return numB - numA;
  })[0];
}

// --- Section parsers ---

// Section A: regions are COLUMNS (NR=2, WR=3, SR=4, ER=5, NER=6, TOTAL=7);
// metrics occupy specific rows below the header. Row offsets verified against
// scratch/parse_posoco_all_sections.js across all 4 sample XLS files.
function parseSectionA(rows, targetDate) {
  const headerIdx = rows.findIndex(
    (r) => r && typeof r[0] === 'string' && SECTION_A_HEADER.test(r[0]),
  );
  if (headerIdx === -1) return [];

  const BASE = headerIdx + 3; // data rows start 3 below the header

  // Offsets from BASE (verified in scratch/parse_posoco_all_sections.js):
  // BASE+0 : evening-peak demand met (MW)  → peak_demand_met_mw
  // BASE+1 : peak shortage (MW)            → peak_demand_shortage_mw
  // BASE+2 : energy met (MU)               → energy_met_mu
  // BASE+6 : energy shortage (MU)          → energy_shortage_mu
  // BASE+7 : max demand met during day (MW)→ max_demand_met_mw
  const REGION_COLS = [
    { col: 2, rowType: 'region_total',  region: 'NR',        entityName: 'NR'        },
    { col: 3, rowType: 'region_total',  region: 'WR',        entityName: 'WR'        },
    { col: 4, rowType: 'region_total',  region: 'SR',        entityName: 'SR'        },
    { col: 5, rowType: 'region_total',  region: 'ER',        entityName: 'ER'        },
    { col: 6, rowType: 'region_total',  region: 'NER',       entityName: 'NER'       },
    { col: 7, rowType: 'national_total', region: 'All India', entityName: 'All India' },
  ];

  return REGION_COLS.map(({ col, rowType, region, entityName }) => ({
    target_date:             targetDate,
    row_type:                rowType,
    entity_name:             entityName,
    region,
    max_demand_met_mw:       toNumOrNull(rows[BASE + 7]?.[col]),
    peak_demand_met_mw:      toNumOrNull(rows[BASE + 0]?.[col]),
    peak_demand_shortage_mw: toNumOrNull(rows[BASE + 1]?.[col]),
    energy_met_mu:           toNumOrNull(rows[BASE + 2]?.[col]),
    energy_shortage_mu:      toNumOrNull(rows[BASE + 6]?.[col]),
    drawal_schedule_mu:      null,
    od_ud_mu:                null,
    max_od_mw:               null,
    max_ud_mw:               null,
  }));
}

// Section C: states are ROWS. Dynamic header search; iterate until terminator.
// State count drifts (36→38→39 across 2023–2025) — dynamic parsing handles it.
function parseSectionC(rows, targetDate) {
  const headerIdx = rows.findIndex(
    (r) => r && typeof r[0] === 'string' && SECTION_C_HEADER.test(r[0]),
  );
  if (headerIdx === -1) return [];

  const out = [];
  for (let i = headerIdx + 3; i < rows.length; i++) {
    const row = rows[i] || [];
    const regionCode = row[0];
    const entityName = row[1];

    // Terminator: blank row OR next section header ("D." prefix).
    if (!regionCode || !entityName) break;
    if (typeof regionCode === 'string' && /^[A-Z]\./.test(regionCode)) break;

    out.push({
      target_date:             targetDate,
      row_type:                'state',
      entity_name:             String(entityName).trim(),
      region:                  String(regionCode).trim(),
      max_demand_met_mw:       toNumOrNull(row[2]),
      peak_demand_met_mw:      null,              // Section A only
      peak_demand_shortage_mw: toNumOrNull(row[3]),
      energy_met_mu:           toNumOrNull(row[4]),
      energy_shortage_mu:      toNumOrNull(row[8]),
      drawal_schedule_mu:      toNumOrNull(row[5]),
      od_ud_mu:                toNumOrNull(row[6]),
      ...parseMaxOdUd(row[7]),
    });
  }
  return out;
}

// --- Main parser ---

export function parseDailyPsp(buf) {
  const workbook = xlsx.read(buf, { type: 'buffer' });

  if (!workbook.SheetNames.includes(PSP_SHEET)) {
    throw new Error(
      `parseDailyPsp: sheet "${PSP_SHEET}" not found; available: ${workbook.SheetNames.join(', ')}`,
    );
  }

  const sheet = workbook.Sheets[PSP_SHEET];
  const rows  = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Reporting date from fixed cell (Row 3, Col 9 in Excel = row 2, col 8 in 0-indexed).
  const rawDate = rows[PSP_REPORTING_CELL.row]?.[PSP_REPORTING_CELL.col];
  if (!rawDate) {
    throw new Error(
      `parseDailyPsp: reporting-date cell (row=${PSP_REPORTING_CELL.row} col=${PSP_REPORTING_CELL.col}) is empty — sheet layout may have shifted`,
    );
  }

  const reportingDate = parseReportingDate(String(rawDate));
  const targetDateObj = subDays(reportingDate, 1); // Decision 7: target = reporting - 1 day
  const targetDate    = targetDateObj.toISOString().split('T')[0];

  const sectionA = parseSectionA(rows, targetDate);
  const sectionC = parseSectionC(rows, targetDate);

  // Schema sanity check: first Section C leaf must have a known region code in col 0.
  if (sectionC.length > 0 && !KNOWN_REGIONS.has(sectionC[0].region)) {
    throw new Error(
      `parseDailyPsp: column-layout drift suspected — first state row has region "${sectionC[0].region}" which is not in {NR,WR,SR,ER,NER}`,
    );
  }

  return [...sectionA, ...sectionC];
}

// --- API functions ---

// Decision 1: POST to the Grid-India Web API to list files for a fiscal month.
// periodYear is the Indian fiscal year string, e.g. "2025-26".
// month is the calendar month number (1–12).
export async function listFilesForMonth({ periodYear, month }) {
  const body = JSON.stringify({
    _source:   'GRDW',
    _type:     'DAILY_PSP_REPORT',
    _fileDate: periodYear,
    _month:    String(month).padStart(2, '0'),
  });

  const resp = await gridIndiaFetch(`${GRID_INDIA_API_BASE}/file`, {
    method:    'POST',
    headers:   { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
    timeoutMs: 30_000,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`listFilesForMonth HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  // API returns { retData: [...], flagType: 0, retMessage: "..." }
  return Array.isArray(data) ? data : (data?.retData ?? data?.data ?? data?.files ?? []);
}

// Decision 1: GET the raw XLS bytes from the Grid-India CDN.
export async function downloadXls(filePath) {
  const resp = await gridIndiaFetch(`${GRID_INDIA_CDN_BASE}/${filePath}`, {
    timeoutMs: 60_000,
  });

  if (!resp.ok) {
    throw new Error(`downloadXls HTTP ${resp.status} for ${filePath}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}
