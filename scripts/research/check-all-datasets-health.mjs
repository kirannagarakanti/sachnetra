#!/usr/bin/env node
//
// SachNetra data-health monitor (READ-ONLY) — one command to confirm every
// dataset's collector is alive and fresh. Built to be run by hand or wired to a
// cron every 1-2 days. Exits 1 if ANY monitored dataset is stalled (ALERT), so
// CI / a Railway cron can alarm on the non-zero exit. SELECTs only — safe on prod
// and safe to run alongside a backfill.
//
//   node scripts/research/check-all-datasets-health.mjs
//   node scripts/research/check-all-datasets-health.mjs --max-zero-weekdays=2
//
// Design notes:
//   - "trading" datasets (NSE/exchange-driven) are weekday-aware: we count how many
//     COMPLETED IST weekdays have elapsed since the latest row. >=2 missed = ALERT,
//     1 = WARN (could be a single NSE holiday), 0 = OK. This mirrors the existing
//     check-announcement-freshness / check-deals-freshness logic.
//   - "continuous" (the 10-min news cron) is measured in hours, not weekdays.
//   - "report" datasets are not-yet-live or derived; shown for visibility, never alarm.
//   - Every query is wrapped: a missing table (42P01) or column (42703) degrades to
//     "n/a", it never crashes the whole monitor.
//   - The feed-health section (answers the "which feeds are silent" audit) compares
//     the india-variant feed roster in server/worldmonitor/news/v1/_feeds.ts against
//     what actually delivered rows. KEEP THE ROSTER BELOW IN SYNC with _feeds.ts.

import pg from 'pg';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MAX_ZERO_WEEKDAYS = Number(flag('max-zero-weekdays', '2'));
const NEWS_WARN_H = 6;
const NEWS_ALERT_H = 24;
const FEED_DARK_H = 48; // a configured feed silent this long = went dark

const ICON = { OK: '🟢', WARN: '🟡', ALERT: '🔴', INFO: '⚪', NA: '⚫' };

// ── datasets ────────────────────────────────────────────────────────────────
const DATASETS = [
  { table: 'india_news_signals',          date: 'scraped_at',  kind: 'continuous', label: 'News signals — 10-min cron' },
  { table: 'india_bourse_announcements',  date: 'announced_at', kind: 'trading',   label: 'NSE announcements (V2-018)' },
  { table: 'india_bulk_block_deals',      date: 'deal_date',   kind: 'trading',    label: 'Bulk/block deals (V2-030)' },
  { table: 'india_institutional_flows',   date: 'flow_date',   kind: 'trading',    label: 'FII/DII flows (V2-017)' },
  { table: 'india_flow_metrics',          date: 'as_of_date',  kind: 'trading',    label: 'Flow absorption (V2-017c)' },
  { table: 'research_prices',             date: 'trade_date',  kind: 'trading',    label: 'Daily prices (G4)' },
  // best-effort / may not be live yet or derived — auto-detect date col, report-only
  { table: 'research_prices_intraday',    date: null, kind: 'report', label: 'Intraday prices' },
  { table: 'india_macro_rates',           date: null, kind: 'report', label: 'RBI macro rates (V2-019)' },
  { table: 'india_electricity_demand',    date: null, kind: 'report', label: 'POSOCO electricity (V2-026)' },
  { table: 'india_fastag_toll_volumes',   date: null, kind: 'report', label: 'NPCI FASTag (V2-027)' },
  { table: 'story_threads',               date: null, kind: 'report', label: 'Story threads (V2-013)' },
  { table: 'entity_timeline',             date: null, kind: 'report', label: 'Entity timeline (V2-014)' },
];

// india-variant feed roster (server/worldmonitor/news/v1/_feeds.ts → VARIANT_FEEDS.india).
// KEEP IN SYNC if feeds are added/removed. bucket is for grouping the report only.
const EXPECTED_FEEDS = [
  ['NDTV','politics'],['The Hindu','politics'],['Indian Express','politics'],['ANI','politics'],['Times of India','politics'],
  ['Hindustan Times','politics'],['India Today','politics'],['New Indian Express','politics'],['ABP Live','politics'],['Zee News','politics'],
  ['News18','politics'],['The Quint','politics'],['Firstpost','politics'],['DNA India','politics'],['The Week','politics'],
  ['Outlook India','politics'],['Frontline','politics'],['LiveLaw','politics'],['The Wire','politics'],['Scroll','politics'],
  ['The Print','politics'],['The News Minute','politics'],['AltNews','politics'],['The Better India','politics'],['Deccan Herald','politics'],
  ['Tribune India','politics'],['Telangana Today','politics'],['Onmanorama','politics'],['Siasat','politics'],['Bangalore Mirror','politics'],
  ['Orissa Post','politics'],['NENews Online','politics'],['Daily Excelsior','politics'],['Greater Kashmir','politics'],['Amarujala','politics'],
  ['Times Now','politics'],['Deccan Chronicle','politics'],
  ['NDTV India','disaster'],['The Hindu Environment','disaster'],
  ['LiveMint','economy'],['Economic Times','economy'],['Business Standard','economy'],['Business Today','economy'],['Financial Express','economy'],
  ['Hindu Business Line','economy'],['Fortune India','economy'],['The Ken','economy'],['IBEF','economy'],['Business Talk Magazine','economy'],
  ['YourStory','technology'],['Inc42','technology'],['Entrackr','technology'],['StartupTalky','technology'],['TechCircle','technology'],
  ['Startup India Magazine','technology'],['Know Startup','technology'],['OfficeChai','technology'],['Indian Startup News','technology'],['Indian Web2','technology'],
  ['The Tech Panda','technology'],['Startup Reporter','technology'],['Forbes India Startups','technology'],['Startup India Gov','technology'],['Business Outreach','technology'],
  ['DD News','government'],['PIB','government'],['MEA','government'],['MHA','government'],['NDMA','government'],
];

// ── IST weekday helpers (mirror the existing freshness scripts) ──────────────
function istDateStr(date) { return new Date(date.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10); }
function isWeekday(ymd) { const d = new Date(`${ymd}T12:00:00Z`).getUTCDay(); return d !== 0 && d !== 6; }
// completed IST weekdays strictly AFTER latestYmd and strictly BEFORE today
function missedWeekdays(latestYmd, now) {
  const today = istDateStr(now);
  let missed = 0;
  for (let back = 1; back <= 20; back++) {
    const ymd = istDateStr(new Date(now.getTime() - back * 864e5));
    if (ymd >= today) continue;
    if (ymd <= latestYmd) break;
    if (isWeekday(ymd)) missed++;
  }
  return missed;
}

async function detectDateCol(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = $1
        AND data_type IN ('date','timestamp with time zone','timestamp without time zone')`, [table]);
  if (rows.length === 0) return null;
  const pref = (c) => /(^|_)(updated|inserted|created|scraped|announced|published|trade|deal|flow|as_of|report)/.test(c.column_name) ? 0 : 1;
  rows.sort((a, b) => pref(a) - pref(b));
  return rows[0].column_name;
}

async function checkDataset(pool, ds, now) {
  let dateCol = ds.date;
  try {
    if (!dateCol) dateCol = await detectDateCol(pool, ds.table);
    if (!dateCol) {
      const { rows: [r] } = await pool.query(`SELECT count(*)::bigint AS n FROM ${ds.table}`);
      return { ...ds, status: 'INFO', detail: `${Number(r.n).toLocaleString()} rows · no date column`, dateCol: '-' };
    }
    const { rows: [r] } = await pool.query(
      `SELECT count(*)::bigint AS n, max(${dateCol}) AS latest FROM ${ds.table}`);
    const rows = Number(r.n).toLocaleString();
    if (!r.latest) return { ...ds, status: ds.kind === 'report' ? 'INFO' : 'ALERT', detail: `EMPTY (${rows} rows)`, dateCol };

    const latest = new Date(r.latest);
    if (ds.kind === 'continuous') {
      const h = (now.getTime() - latest.getTime()) / 3.6e6;
      const status = h > NEWS_ALERT_H ? 'ALERT' : h > NEWS_WARN_H ? 'WARN' : 'OK';
      return { ...ds, status, detail: `${rows} rows · latest ${latest.toISOString().slice(0, 16).replace('T', ' ')}Z (${h.toFixed(1)}h ago)`, dateCol };
    }
    const latestYmd = istDateStr(latest);
    if (ds.kind === 'trading') {
      const missed = missedWeekdays(latestYmd, now);
      const status = missed >= MAX_ZERO_WEEKDAYS ? 'ALERT' : missed === 1 ? 'WARN' : 'OK';
      return { ...ds, status, detail: `${rows} rows · latest ${latestYmd} (${missed} trading weekday(s) missed)`, dateCol };
    }
    // report
    const days = Math.floor((now.getTime() - latest.getTime()) / 864e5);
    return { ...ds, status: 'INFO', detail: `${rows} rows · latest ${latestYmd} (${days}d ago)`, dateCol };
  } catch (e) {
    if (e.code === '42P01') return { ...ds, status: 'NA', detail: 'table does not exist', dateCol: '-' };
    if (e.code === '42703') return { ...ds, status: 'NA', detail: `column ${dateCol} missing`, dateCol: dateCol || '-' };
    return { ...ds, status: 'NA', detail: `query error: ${e.message}`, dateCol: dateCol || '-' };
  }
}

async function checkFeeds(pool, now) {
  const { rows } = await pool.query(
    `SELECT source_name, count(*)::int AS n, max(scraped_at) AS last FROM india_news_signals GROUP BY source_name`);
  const delivered = new Map(rows.map((r) => [r.source_name, { n: r.n, last: new Date(r.last) }]));
  const silent = [], dark = [], ok = [];
  for (const [name, bucket] of EXPECTED_FEEDS) {
    const d = delivered.get(name);
    if (!d) { silent.push({ name, bucket }); continue; }
    const h = (now.getTime() - d.last.getTime()) / 3.6e6;
    if (h > FEED_DARK_H) dark.push({ name, bucket, h, n: d.n });
    else ok.push({ name, bucket });
  }
  const extras = rows.filter((r) => !EXPECTED_FEEDS.some(([n]) => n === r.source_name)).map((r) => r.source_name);
  return { silent, dark, ok, extras, deliveredCount: delivered.size, expectedCount: EXPECTED_FEEDS.length };
}

// Optional alarm push: set ALERT_WEBHOOK_URL (Slack/Discord-compatible JSON webhook,
// or any endpoint accepting {"text": "..."}). Best-effort — never fails the check itself.
async function notifyWebhook(text) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5_000),
    });
    return true;
  } catch (e) {
    console.error(`  (webhook notify failed: ${e.message})`);
    return false;
  }
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const host = (() => { try { return new URL(cs).hostname; } catch { return '?'; } })();
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const now = new Date();

  console.log(`=== SachNetra data-health — ${now.toISOString().slice(0, 16).replace('T', ' ')}Z · target ${host} ===\n`);

  const results = [];
  for (const ds of DATASETS) results.push(await checkDataset(pool, ds, now));

  console.log('DATASET FRESHNESS');
  for (const r of results) {
    console.log(`  ${ICON[r.status]} ${r.status.padEnd(5)} ${r.label.padEnd(34)} ${r.detail}`);
  }

  const feeds = await checkFeeds(pool, now);
  console.log(`\nNEWS FEED HEALTH  (${feeds.deliveredCount} delivering · ${feeds.expectedCount} configured)`);
  console.log(`  ${feeds.silent.length === 0 ? ICON.OK : ICON.WARN} SILENT (configured, never delivered): ${feeds.silent.length === 0 ? 'none' : feeds.silent.map((s) => `${s.name} [${s.bucket}]`).join(', ')}`);
  console.log(`  ${feeds.dark.length === 0 ? ICON.OK : ICON.WARN} WENT DARK (>${FEED_DARK_H}h silent): ${feeds.dark.length === 0 ? 'none' : feeds.dark.map((s) => `${s.name} [${s.bucket}, ${s.h.toFixed(0)}h]`).join(', ')}`);
  const gov = ['DD News', 'PIB', 'MEA', 'MHA', 'NDMA'];
  console.log('  government primary-source feeds:');
  for (const g of gov) {
    const inSilent = feeds.silent.find((s) => s.name === g);
    const inDark = feeds.dark.find((s) => s.name === g);
    const st = inSilent ? `${ICON.WARN} SILENT (0 rows ever)` : inDark ? `${ICON.WARN} dark ${inDark.h.toFixed(0)}h` : `${ICON.OK} active`;
    console.log(`    ${g.padEnd(10)} ${st}`);
  }
  if (feeds.extras.length) console.log(`  note: ${feeds.extras.length} delivering source(s) not in the roster (legacy/renamed): ${feeds.extras.slice(0, 8).join(', ')}${feeds.extras.length > 8 ? '…' : ''}`);

  // roll-up
  const alerts = results.filter((r) => r.status === 'ALERT');
  const warns = results.filter((r) => r.status === 'WARN');
  console.log(`\nVERDICT: ${alerts.length ? `${ICON.ALERT} ${alerts.length} ALERT` : warns.length ? `${ICON.WARN} ${warns.length} WARN` : `${ICON.OK} all monitored datasets fresh`}`);
  if (alerts.length) console.log(`  stalled: ${alerts.map((a) => a.table).join(', ')}`);

  if (alerts.length) {
    const lines = [
      `🔴 SachNetra data-health: ${alerts.length} dataset(s) STALLED`,
      ...alerts.map((a) => `• ${a.label} (${a.table}) — ${a.detail}`),
      ...(warns.length ? [`🟡 ${warns.length} WARN: ${warns.map((w) => w.table).join(', ')}`] : []),
      ...(feeds.dark.length ? [`🟡 ${feeds.dark.length} feed(s) dark >48h: ${feeds.dark.slice(0, 5).map((f) => f.name).join(', ')}${feeds.dark.length > 5 ? '…' : ''}`] : []),
    ];
    const sent = await notifyWebhook(lines.join('\n'));
    console.log(`  alarm push: ${sent ? 'sent via ALERT_WEBHOOK_URL' : 'skipped (set ALERT_WEBHOOK_URL to enable)'}`);
  }

  await pool.end();
  process.exit(alerts.length ? 1 : 0);
}

main().catch((e) => { console.error('Health check failed:', e.message); process.exit(2); });
