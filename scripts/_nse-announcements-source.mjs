#!/usr/bin/env node

// V2-018 — NSE bourse-announcements source adapter.
//
// V1 primary: NSE /api/corporate-announcements JSON behind the standard cookie
// warm-up (Decision 1) — the SAME handshake proven for FII/DII. BSE is a
// stubbed-only future secondary path (Decision 5). The consumers
// (seed-india-announcements.mjs / backfill-india-announcements.mjs) import
// warmUpNSE() + fetchNSEAnnouncements(); they never import the stub in V1.
//
// Unlike _fii-dii-source.mjs there is NO typed "no data" error: an empty NSE
// array is a normal valid response (weekend/holiday/none filed), so the fetch
// just returns [] and the caller logs one line + exits 0 (Decision 7).

import { CHROME_UA } from './_seed-utils.mjs';

const NSE_ORIGIN = 'https://www.nseindia.com/';
const NSE_API = 'https://www.nseindia.com/api/corporate-announcements?index=equities';
// A bare-origin warm-up is sufficient (recon A1), but the canonical Referer for
// the announcements feed is the corporate-filings page — send it on the API call.
const NSE_REFERER = 'https://www.nseindia.com/companies-listing/corporate-filings-announcements';

/**
 * Warm-up handshake (Decision 1). GET the bare origin, collect the Set-Cookie
 * pairs (nsit, nseappid, …) and return them as a single `name=value; …` Cookie
 * string ready to attach to the /api/* call.
 *
 * Uses Headers.getSetCookie() so multiple cookies are parsed correctly — the
 * raw `headers.get('set-cookie')` joins them with commas, which collides with
 * commas inside cookie attributes. We keep only the `name=value` part of each
 * (everything before the first ';'), dropping Path/Domain/Expires attributes.
 *
 * @returns {Promise<string>} Cookie header value (throws on HTTP failure)
 */
export async function warmUpNSE() {
  const resp = await fetch(NSE_ORIGIN, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) {
    throw new Error(`NSE warm-up HTTP ${resp.status}`);
  }

  const setCookies = typeof resp.headers.getSetCookie === 'function'
    ? resp.headers.getSetCookie()
    : [resp.headers.get('set-cookie')].filter(Boolean);

  const cookie = setCookies
    .map((c) => String(c).split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  if (!cookie) {
    throw new Error('NSE warm-up returned no Set-Cookie (bot wall or markup change)');
  }
  return cookie;
}

// NSE sort_date is "YYYY-MM-DD HH:MM:SS" in IST (recon A3). Stamp the +05:30
// offset so PostgreSQL stores the correct instant; guard the shape so a drift
// fails the row (returns null) rather than poisoning the NOT NULL column.
function toIstTimestamp(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return null;
  return `${s.replace(' ', 'T')}+05:30`;
}

// One raw NSE row → normalized announcement row. Field names are exact (recon
// A3: NSE mixes snake_case / camelCase / sm_ prefixes). announcement_id and
// announced_at are required (PK + NOT NULL); a row missing either is skipped.
function mapRow(row) {
  const announcement_id = row?.seq_id != null ? String(row.seq_id).trim() : '';
  const announced_at = toIstTimestamp(row?.sort_date);
  if (!announcement_id || !announced_at) return null;

  return {
    source: 'nse',
    announcement_id,
    symbol: row?.symbol ?? null,
    company_name: row?.sm_name ?? null,
    isin: row?.sm_isin ?? null,
    category: row?.desc ?? null,
    subject: row?.attchmntText ?? null,
    attachment_url: row?.attchmntFile ?? null,
    industry: row?.smIndustry ?? null,
    has_xbrl: typeof row?.hasXbrl === 'boolean' ? row.hasXbrl : null,
    announced_at,
  };
}

/**
 * V1 PRIMARY (Decision 1). GET the corporate-announcements API for a date
 * window with a warmed cookie + Referer, JSON.parse the array, normalize each
 * row. An empty array is a NORMAL response (weekend/holiday/none filed) and
 * returns [] — NOT an error (Decision 7).
 *
 * Date params are DD-MM-YYYY (recon A1). The caller owns the warm-up so a
 * single cookie can be reused across a backfill walk; pass it via `cookie`.
 *
 * @param {object} args
 * @param {string} args.fromDate   from_date, DD-MM-YYYY
 * @param {string} args.toDate     to_date, DD-MM-YYYY
 * @param {string} args.cookie     Cookie header from warmUpNSE()
 * @returns {Promise<Array<object>>} normalized rows (possibly empty)
 * @throws {Error} on HTTP failure (incl. 401/403 cookie wall) or non-array body
 */
export async function fetchNSEAnnouncements({ fromDate, toDate, cookie }) {
  if (!fromDate || !toDate) {
    throw new Error('fetchNSEAnnouncements requires fromDate and toDate (DD-MM-YYYY)');
  }
  if (!cookie) {
    throw new Error('fetchNSEAnnouncements requires a cookie from warmUpNSE()');
  }

  const url = `${NSE_API}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/json, text/plain, */*',
      Referer: NSE_REFERER,
      Cookie: cookie,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    // 401/403 → caller re-warms the cookie once and retries (Decision 1).
    throw new Error(`NSE announcements HTTP ${resp.status}`);
  }

  const text = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`NSE announcements JSON.parse failed (bot wall?): ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('NSE announcements body is not an array (drift or interstitial)');
  }

  return parsed.map(mapRow).filter(Boolean);
}

/**
 * STUB — future secondary path (Decision 5 / V2-018b). BSE announcements API:
 * GET https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w
 * Requires Chrome UA + Referer https://www.bseindia.com/ + Origin
 * https://www.bseindia.com (CORS-blocked otherwise). Recon found it returns 200
 * but an empty {} under every date-param shape tried (YYYYMMDD, YYYY-MM-DD);
 * its query params (strCat, strSearch, strType, …) are undocumented and drift.
 * NSE alone is reliable + complete for V1, so this stays a documented stub.
 */
export async function fetchBSE() {
  throw new Error('BSE adapter: future secondary path, V2-018b');
}
