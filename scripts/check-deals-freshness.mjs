#!/usr/bin/env node
//
// V2-030 — bulk/block deals freshness alarm (READ-ONLY). Catches a silently-stalled
// collector cron (the V2-018 lesson: backfill masks a dead cron until MAX(deal_date)
// drifts). Designed to be wired to a Railway cron / CI and alerted on a NON-ZERO exit.
//
// Weekend- & holiday-aware (NSE publishes bulk/block deals EOD on trading days only):
//   - Look at the most recent COMPLETED IST weekdays (Mon-Fri, strictly before today).
//   - zerosAtTop = how many of the most recent completed weekdays — consecutively —
//     have ZERO deal rows.
//       zerosAtTop >= 2  -> 🔴 ALERT (exit 1): two trading days with no deals = a
//                           real stall (two back-to-back NSE holidays are rare/known).
//       zerosAtTop == 1  -> 🟡 WARN  (exit 0): could be a single NSE holiday — eyeball it.
//       else             -> 🟢 OK.
//   staleDays (calendar days since MAX(deal_date)) is reported for context but is NOT
//   the trigger, so a normal Fri→Mon gap never false-alarms.
//
// Wire to Railway as a separate cron ~30 min after the collector (≈19:00 IST / 13:30 UTC):
//   start command: node scripts/check-deals-freshness.mjs
//   schedule:      30 13 * * *
//
//   node scripts/check-deals-freshness.mjs
//   node scripts/check-deals-freshness.mjs --max-zero-weekdays=2

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MAX_ZERO_WEEKDAYS = Number(flag('max-zero-weekdays', '2'));
const LOOKBACK_DAYS = 12;

function istDateStr(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function isWeekday(ymd) {
  const d = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return d !== 0 && d !== 6;
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const { rows: [m] } = await pool.query(
    `SELECT max(deal_date)::text AS last_date,
            count(*)::bigint AS total_rows
       FROM india_bulk_block_deals`);
  const { rows: hist } = await pool.query(
    `SELECT deal_date::text AS d, count(*)::int AS n
       FROM india_bulk_block_deals
      WHERE deal_date >= (current_date AT TIME ZONE 'Asia/Kolkata')::date - $1::int
      GROUP BY 1`, [LOOKBACK_DAYS]);
  await pool.end();

  const countByDate = new Map(hist.map((r) => [r.d, r.n]));
  const now = new Date();
  const todayIst = istDateStr(now);
  const staleDays = m.last_date
    ? (now.getTime() - new Date(`${m.last_date}T12:00:00Z`).getTime()) / 864e5
    : Infinity;

  const completedWeekdays = [];
  for (let back = 1; back <= LOOKBACK_DAYS && completedWeekdays.length < 6; back++) {
    const ymd = istDateStr(new Date(now.getTime() - back * 864e5));
    if (ymd >= todayIst) continue;
    if (!isWeekday(ymd)) continue;
    completedWeekdays.push({ ymd, n: countByDate.get(ymd) || 0 });
  }
  let zerosAtTop = 0;
  for (const w of completedWeekdays) { if (w.n === 0) zerosAtTop++; else break; }

  const status = zerosAtTop >= MAX_ZERO_WEEKDAYS ? 'ALERT' : zerosAtTop === 1 ? 'WARN' : 'OK';
  const icon = { ALERT: '🔴', WARN: '🟡', OK: '🟢' }[status];

  console.log('=== india_bulk_block_deals freshness ===');
  console.log(`  latest deal_date: ${m.last_date ?? '(none)'}   (${staleDays.toFixed(0)} calendar days ago)`);
  console.log(`  table rows:       ${Number(m.total_rows || 0).toLocaleString()}`);
  console.log(`  recent weekdays:  ${completedWeekdays.map((w) => `${w.ymd.slice(5)}=${w.n}`).join('  ')}`);
  console.log(`  zero-deal weekdays at top: ${zerosAtTop}  (alert threshold ${MAX_ZERO_WEEKDAYS})`);
  console.log(`  ${icon} ${status}`);

  if (status === 'ALERT') {
    const backfillDays = Math.min(60, Math.ceil(staleDays) + 3);
    console.log('\n  Collector looks STALLED. Remediation:');
    console.log('    1) check the Railway cron logs for seed-india-deals.mjs (last successful run).');
    console.log('    2) smoke-test the collector:  node scripts/seed-india-deals.mjs');
    console.log('    3) backfill the gap (idempotent, safe to re-run):');
    console.log(`         node scripts/backfill-india-deals.mjs ${backfillDays}`);
    console.log('    4) confirm Redis meta refreshed:  seed-meta:india:deals');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Freshness check failed:', e.message); process.exit(2); });
