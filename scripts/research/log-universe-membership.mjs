#!/usr/bin/env node
//
// Phase-0 survivorship fix, step 1 (LOCAL FILE WRITES ONLY — no DB, no network) —
// an append-only log of NSE universe membership changes, built by diffing
// shared/nse-equity-master.json between runs. Every disappearance (delisting,
// suspension, rename) and appearance (listing, rename) gets a dated row, so
// future backtests can reconstruct "which symbols existed as of date X" instead
// of silently testing only survivors (the bias that dropped 13,910 events in Exp18).
//
//   node scripts/research/log-universe-membership.mjs
//
// First run writes the baseline snapshot. Each later run appends added/removed
// events to the JSONL log and refreshes the snapshot.
//
// ⚠ Cadence caveat: the equity master only changes when build-equity-master.mjs
//   is re-run against a fresh NSE EQUITY_L.csv. To make this log meaningful, run
//   BOTH on the same (weekly) cron: rebuild master → run this differ.
// ⚠ A "removed" row is not always a delisting — renames/mergers appear as a
//   removed+added pair on the same date. The log records facts; interpretation
//   happens at backtest time.

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_PATH = join(__dirname, '..', '..', 'shared', 'nse-equity-master.json');
const OUT_DIR = join(__dirname, 'output', 'universe-log');
const SNAPSHOT_PATH = join(OUT_DIR, 'snapshot-latest.json');
const LOG_PATH = join(OUT_DIR, 'universe-membership-log.jsonl');

function todayUtc() { return new Date().toISOString().slice(0, 10); }

function main() {
  const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
  const current = new Map(master.map((e) => [e.ticker, e.name]));
  const date = todayUtc();
  mkdirSync(OUT_DIR, { recursive: true });

  if (!existsSync(SNAPSHOT_PATH)) {
    // First run — establish the baseline.
    writeFileSync(SNAPSHOT_PATH, JSON.stringify({ as_of: date, count: current.size, tickers: Object.fromEntries(current) }, null, 0));
    appendFileSync(LOG_PATH, `${JSON.stringify({ date, event: 'baseline', count: current.size })}\n`);
    console.log(`Baseline established: ${current.size} tickers as of ${date}`);
    console.log(`  snapshot: ${SNAPSHOT_PATH}`);
    console.log(`  log:      ${LOG_PATH}`);
    console.log('\nNext: re-run after every equity-master rebuild (wire both into one weekly cron).');
    return;
  }

  const prev = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const previous = new Map(Object.entries(prev.tickers));

  const added = [...current.keys()].filter((t) => !previous.has(t));
  const removed = [...previous.keys()].filter((t) => !current.has(t));

  if (added.length === 0 && removed.length === 0) {
    console.log(`No membership changes since ${prev.as_of} (${current.size} tickers). Log untouched.`);
    return;
  }

  const lines = [
    ...removed.map((t) => ({ date, event: 'removed', ticker: t, name: previous.get(t), last_seen: prev.as_of })),
    ...added.map((t) => ({ date, event: 'added', ticker: t, name: current.get(t) })),
  ];
  appendFileSync(LOG_PATH, `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`);
  writeFileSync(SNAPSHOT_PATH, JSON.stringify({ as_of: date, count: current.size, tickers: Object.fromEntries(current) }, null, 0));

  console.log(`Membership changes since ${prev.as_of} → ${date}:`);
  console.log(`  removed (delist/suspend/rename): ${removed.length}${removed.length ? ` — ${removed.slice(0, 10).join(', ')}${removed.length > 10 ? '…' : ''}` : ''}`);
  console.log(`  added   (list/rename):           ${added.length}${added.length ? ` — ${added.slice(0, 10).join(', ')}${added.length > 10 ? '…' : ''}` : ''}`);
  console.log(`  universe: ${previous.size} → ${current.size} · events appended to ${LOG_PATH}`);
}

main();
