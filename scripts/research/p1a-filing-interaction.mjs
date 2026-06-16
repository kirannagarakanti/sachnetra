#!/usr/bin/env node
//
// P1a × P1f interaction cut (READ-ONLY) — Kimi's parting hypothesis (fresh-eyes Round 5):
// "the pairs may only work when the trigger move is filing-associated; pair drift without
// filing backing is placebo; endpoint = 6-8 filing-conditioned pairs."
//
//   node scripts/research/p1a-filing-interaction.mjs
//
// METHOD: take the P1a pair events (output/p1a/p1a_events.csv — head-shock events with the
// linked name's SIGNED post CARs already computed), restrict to the announcements-coverage
// window (>= 2024-06-01 — earlier "no filing" would just mean "no data"), and split the
// linked-name drift by whether the HEAD had a filing with IST date in [event_date-3, event_date]
// (weekend-safe). Two cuts: ANY filing (loose — big heads file routinely, expect weak contrast)
// and RESULTS-like filing (sharp — the P1f-validated information carrier).
// Kimi's bar: filing-backed ≈ 2x the drift of unbacked → supports the conditioned-pairs endpoint.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = join(__dirname, 'output', 'p1a', 'p1a_events.csv');
const SINCE = '2024-06-01';

function stats(vals) {
  const n = vals.length;
  if (n === 0) return { n: 0, mean: NaN, t: NaN, hit: NaN };
  const mean = vals.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  return { n, mean, t: sd > 0 ? mean / (sd / Math.sqrt(n)) : NaN, hit: vals.filter((x) => x > 0).length / n };
}
const pct = (x) => `${(x * 100).toFixed(2)}%`;
const fmt = (s) => s.n ? `n=${String(s.n).padStart(4)}  mean=${pct(s.mean).padStart(7)}  t=${s.t.toFixed(2).padStart(6)}  hit=${(s.hit * 100).toFixed(0)}%` : 'n=0   (empty)';

function daysBack(ymd, k) {
  const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - k);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }

  // P1a events
  const lines = readFileSync(CSV, 'utf8').trim().split('\n').slice(1);
  const events = lines.map((l) => {
    const [pair, type, attention, date, headAbn0, linkedDay0, car5, car10, car20] = l.split(',');
    return { pair, head: pair.split('→')[0], type, attention, date, car5: +car5, car10: +car10, car20: +car20 };
  }).filter((e) => e.date >= SINCE);
  const heads = [...new Set(events.map((e) => e.head))];
  console.log(`P1a events in announcements window (>=${SINCE}): ${events.length} across ${heads.length} heads`);

  // filings for those heads
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query(
    `SELECT upper(symbol) AS sym,
            to_char(announced_at AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS ymd,
            bool_or(category ~* 'result|financial|earning' OR subject ~* 'result|financial|earning|quarterly|audited') AS is_results
       FROM india_bourse_announcements
      WHERE upper(symbol) = ANY($1) AND announced_at >= ($2::date - interval '5 days')
      GROUP BY 1, 2`, [heads, SINCE]);
  await pool.end();
  const anyFiling = new Set(); const resFiling = new Set();
  for (const r of rows) { anyFiling.add(`${r.sym}|${r.ymd}`); if (r.is_results) resFiling.add(`${r.sym}|${r.ymd}`); }
  console.log(`head filings loaded: ${rows.length} (symbol,day) rows · ${resFiling.size} results-like`);

  const backed = (e, set) => { for (let k = 0; k <= 3; k++) if (set.has(`${e.head}|${daysBack(e.date, k)}`)) return true; return false; };
  for (const e of events) { e.any = backed(e, anyFiling); e.res = backed(e, resFiling); }

  const show = (label, evs) => {
    console.log(`\n${label}`);
    for (const w of [5, 10, 20]) console.log(`  CAR +1..+${String(w).padEnd(2)}  ${fmt(stats(evs.map((e) => e[`car${w}`])))}`);
  };

  console.log(`\n=== KIMI INTERACTION CUT — pair drift by head-filing backing (events >= ${SINCE}) ===`);
  console.log(`backed rates: any-filing ${events.filter((e) => e.any).length}/${events.length} · results-like ${events.filter((e) => e.res).length}/${events.length}`);

  show('CUT 1 — head had ANY filing in [d-3,d] (loose; big heads file routinely):', events.filter((e) => e.any));
  show('         no filing:', events.filter((e) => !e.any));
  show('CUT 2 — head had RESULTS-like filing in [d-3,d] (the sharp cut):', events.filter((e) => e.res));
  show('         no results filing:', events.filter((e) => !e.res));

  const low = events.filter((e) => e.attention === 'low');
  show('CUT 2 on LOW-attention sleeve — results-backed:', low.filter((e) => e.res));
  show('         low-attention, no results filing:', low.filter((e) => !e.res));

  console.log('\nREADING (Kimi bar): conditioned-pairs endpoint supported if results-backed drift ≈ 2x unbacked;');
  console.log('"pair drift without filing backing is placebo" supported if unbacked ≈ 0 while backed stays positive.');
  console.log(`CAVEAT: ${SINCE}+ window only (~${events.length} events) — recency-clean but lower power than the full P1a sample.`);
}

main().catch((e) => { console.error('Interaction cut failed:', e.message); process.exit(2); });
