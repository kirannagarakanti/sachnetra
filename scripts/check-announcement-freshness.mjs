#!/usr/bin/env node
//
// V2-018 — announcements freshness alarm (READ-ONLY). Catches a silently-stalled
// collector cron (what happened ~2026-05-30: seed-india-announcements stopped and
// nobody noticed for ~6 days). Designed to be wired to a Railway cron / CI / a
// laptop loop and alerted on a NON-ZERO exit.
//
// Weekend- & holiday-aware (NSE files only on trading days, in the hundreds/day):
//   - Look at the most recent COMPLETED IST weekdays (Mon-Fri, strictly before today).
//   - zerosAtTop = how many of the most recent completed weekdays — consecutively —
//     have ZERO filings.
//       zerosAtTop >= 2  -> 🔴 ALERT (exit 1): two trading days with no filings = a
//                           real stall (two back-to-back NSE holidays are rare/known).
//       zerosAtTop == 1  -> 🟡 WARN  (exit 0): could be a single NSE holiday — eyeball it.
//       else             -> 🟢 OK.
//   staleHours (wall-clock since the newest filing) is reported for context but is NOT
//   the trigger, so a normal Fri-eve→Mon-morning gap never false-alarms.
//
//   node scripts/check-announcement-freshness.mjs            # exit 1 if stalled
//   node scripts/check-announcement-freshness.mjs --max-zero-weekdays=2

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MAX_ZERO_WEEKDAYS = Number(flag('max-zero-weekdays', '2')); // alert when >= this many consecutive zero weekdays
const LOOKBACK_DAYS = 12;

// IST calendar date (YYYY-MM-DD) for a Date.
function istDateStr(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
// Mon-Fri test for a 'YYYY-MM-DD' string (noon-UTC anchor avoids TZ edges).
function isWeekday(ymd) { const d = new Date(`${ymd}T12:00:00Z`).getUTCDay(); return d !== 0 && d !== 6; }

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const { rows: [m] } = await pool.query(
    `SELECT max(announced_at) AS last_ts,
            to_char(max(announced_at) AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD HH24:MI') AS last_ist
       FROM india_bourse_announcements`);
  const { rows: hist } = await pool.query(
    `SELECT to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d, count(*)::int AS n
       FROM india_bourse_announcements
      WHERE announced_at >= now() - ($1 || ' days')::interval
      GROUP BY 1`, [String(LOOKBACK_DAYS)]);
  await pool.end();

  const countByDate = new Map(hist.map((r) => [r.d, r.n]));
  const now = new Date();
  const todayIst = istDateStr(now);
  const staleHours = m.last_ts ? (now.getTime() - new Date(m.last_ts).getTime()) / 3.6e6 : Infinity;

  // Walk back from yesterday collecting completed IST weekdays; count leading zeros.
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

  console.log('=== india_bourse_announcements freshness ===');
  console.log(`  latest filing:    ${m.last_ist ?? '(none)'} IST   (${staleHours.toFixed(1)}h ago)`);
  console.log(`  recent weekdays:  ${completedWeekdays.map((w) => `${w.ymd.slice(5)}=${w.n}`).join('  ')}`);
  console.log(`  zero-filing weekdays at top: ${zerosAtTop}  (alert threshold ${MAX_ZERO_WEEKDAYS})`);
  console.log(`  ${icon} ${status}`);

  if (status === 'ALERT') {
    const lastDate = m.last_ist ? m.last_ist.slice(0, 10) : null;
    console.log('\n  Collector looks STALLED. Remediation:');
    console.log('    1) check the Railway cron logs for seed-india-announcements.mjs (last successful run).');
    console.log(`    2) backfill the gap (idempotent, safe to re-run):`);
    console.log(`         node scripts/backfill-india-announcements.mjs --days=${Math.min(60, Math.ceil(staleHours / 24) + 2)}`);
    if (lastDate) console.log(`       (or precisely:  node scripts/backfill-india-announcements.mjs --from=<DD-MM-YYYY of ${lastDate}> --to=<today DD-MM-YYYY>)`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => { console.error('Freshness check failed:', e.message); process.exit(2); });
