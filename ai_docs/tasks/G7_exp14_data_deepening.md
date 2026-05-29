# G7 — Deepen the data behind Exp 14 (smallcap prices + filings history)

**Repo:** SachNetra (this repo) · script lane `scripts/research/`
**Status:** [ ] not started — author/scope first; Lijo/James run any prod write
**Author:** Claude · 2026-05-29
**Unblocks:** a *powered* re-run of Exp 14 — getting the PRIMARY governance-shock units
(`auditor_resignation`, `pledge_increase`) to a testable N≥20
**Gauge:** dashboard "Price Universe" tile + Exp 14 funnel ("priced" and primary-unit N)

---

## Why

G4 (done 2026-05-29) expanded `research_prices` 47 → 194 symbols (Nifty 50 + Midcap 150). The
Exp 14 re-run confirmed G4 fixed the **price** gap — priced governance events rose 9 → 49 — but
the experiment is **still underpowered on the hypothesis that matters**:

- `auditor_resignation` **N=0**, `pledge_increase` **N=1**; only benign `auditor_change` (N=11)
  populated → POST +123 bps, p≈0.30. Verdict was ❌ NULL **on the benign secondary bucket**; the
  primary shock test never ran.
- **676 of 725** governance filings (~93%) still sit on sub-midcap small-caps with no price.
- `india_bourse_announcements` only spans recent months, so genuine shocks haven't accumulated.

So the binding constraint **moved from prices → (a) sub-midcap price coverage and (b) filings
history depth**. This task addresses both. It is the direct continuation of the G4 backlog note
("widen to Nifty 200/500") plus a new gap (filings history, logged here as G7).

> **Survivorship ceiling (read before celebrating breadth).** The worst governance shocks happen
> at companies that later delist/blow up — and Yahoo only serves *currently-listed* names. So even
> a full smallcap price extension has a survivorship ceiling: it raises N and breadth, but the
> nastiest resignation/pledge events may remain unpriceable. This task improves power; it does not
> fully escape survivorship. (See `_data_gaps_backlog.md` §"Survivorship-bias ceiling".)

---

## Context Manifest

**Load:**
- `scripts/research/backfill-midcap-prices.mjs` — the proven G4 backfill this Phase 1 mirrors.
- `scripts/research/check-db-space.mjs` — read-only disk guard; run BEFORE any large write.
- `scripts/_seed-utils.mjs` — `loadEnvFile`, `CHROME_UA`, `sleep`.
- `ai_docs/sachnetra v2/wiki/experiments/Exp14.md` §6–8 — the post-G4 funnel this task is sized against.
- The V2-018 announcement-feed source code (how `india_bourse_announcements` is populated) — Phase 2 recon needs to know the upstream source + how far back it serves.
- This file.

**Don't load:** the dashboard repo, the sentiment/OCR lane, unrelated experiment write-ups.

**Boundary:** Claude authors + runs read-only checks; **Lijo/James run anything that writes to
prod**. Phase 2's data-availability recon is **Gemini/MinMax** (scratch/), per the standing
recon workflow — Claude synthesizes, does not probe the NSE source.

---

## Phase 1 — Extend the price universe to the Nifty Smallcap 250 (runnable now)

A near-exact clone of the G4 path. Writes **only** to `research_prices` (additive, idempotent).

**Deliverable:** reuse `scripts/research/backfill-midcap-prices.mjs` as-is via `--symbols-file`
(it is universe-agnostic — it just needs a list). No new script needed unless we want a clearer
name; a thin `backfill-smallcap-prices.mjs` wrapper is optional, not required.

**Symbol source — do NOT hand-type (G4 lesson):** have **Gemini/MinMax** produce the current
Nifty Smallcap 250 constituents as a JSON array of Yahoo tickers → `shared/nifty-smallcap250.json`
(authoritative source = niftyindices.com `ind_niftysmallcap250list.csv`). Same instruction shape as
`scratch/G4_midcap150_gemini_instructions.md` — clone it, swap 150→250 and the CSV name.

**Run procedure (Lijo/James):**
```bash
# 0. READ-ONLY disk guard first (G4 incident lesson — shared prod volume)
node scripts/research/check-db-space.mjs

# 1. DRY RUN — fetch + parse, writes nothing
node scripts/research/backfill-midcap-prices.mjs --symbols-file=shared/nifty-smallcap250.json

# 2. FULL RUN — writes ~250 symbols to research_prices (idempotent upsert)
node scripts/research/backfill-midcap-prices.mjs --symbols-file=shared/nifty-smallcap250.json --write
```

**Disk sizing:** ~250 symbols × full history ≈ ~140–160 MB added (extrapolating G4's 150 sym ≈
85 MB). Against the 5 GB volume (currently ~214 MB used, ~4%), this is safe — but **run
`check-db-space.mjs` first anyway**; the G4 incident was caused by skipping exactly that check.
Consider `--limit` batches if you want resumability on the longer pull.

**Note the abort guard:** `backfill-midcap-prices.mjs` hard-aborts above 400 symbols. 250 is fine;
do not pass a list that's accidentally the full NSE universe.

---

## Phase 2 — Deepen `india_bourse_announcements` history (recon first, then scope)

This is **not runnable yet** — it depends on whether the upstream source even serves older filings.

**Recon questions (Gemini/MinMax, output to `scratch/`):**
1. What is the upstream source behind the V2-018 announcement feed, and **how far back** does it
   serve filings (months? years? is there a date-range/pagination param)?
2. Do older records carry the same `category` + `subject` text the Exp 14 bucket regexes rely on
   (`/auditor/`, `/pledg|encumbr/` + sub-tags)? If the schema changed historically, a backfill
   won't classify cleanly.
3. Rough volume estimate: how many additional governance filings would, say, 2–3 years of history
   add — enough to plausibly get `auditor_resignation` + `pledge_increase` to N≥20?

**Then (Claude, after recon):** if the data exists, author a Phase-2 backfill task mirroring the
V2-018 ingestion (additive into `india_bourse_announcements`, idempotent on the filing key,
Lijo/James run it). If it does NOT exist (source only serves recent filings), record that as a hard
ceiling: forward-accumulation + monthly Exp 14 re-runs is the only path, and Exp 14 stays
⬜ BLOCKED-on-time until ~N≥20 accrues.

---

## Acceptance / verification (read-only)

```sql
-- Phase 1: price universe should jump toward ~440 (50 + 150 + 250, minus overlap)
SELECT COUNT(DISTINCT symbol) FROM research_prices;

-- The whole point — how many governance filings now land on a priced symbol
SELECT COUNT(*) FILTER (WHERE p.symbol IS NOT NULL) AS priced,
       COUNT(*) AS governance_total
FROM india_bourse_announcements a
LEFT JOIN (SELECT DISTINCT symbol FROM research_prices) p
       ON p.symbol = a.symbol || '.NS'
WHERE (a.category || ' ' || a.subject) ~* 'auditor|pledg|encumbr';
```

**Real success = the Exp 14 re-run after this** shows the PRIMARY units climbing toward N≥20 — not
just a bigger "priced" number. Re-run `exp14-governance-shock-event-study.mjs` and check §7's
`auditor_resignation` / `pledge_increase` N.

---

## Kill / caution conditions

- Run `check-db-space.mjs` before EVERY large write (G4 disk-full incident). Grow the volume, never
  auto-retry/destructive-recover the live DB.
- >20% Yahoo misses on the smallcap list ⇒ wrong-format list, fix the list not the script.
- Do not fold either phase into the live digest cron — manual/periodic backfills only.
- If Phase 2 recon shows the source only serves recent filings, **stop** — don't build a backfill
  for data that doesn't exist; switch to forward-accumulation + monthly re-run.

---

## After this lands

1. Re-run Exp 14 — check whether the primary governance-shock units finally reach a testable N.
2. If still starved, the honest conclusion is the **survivorship ceiling** (the alpha lives on
   names Yahoo won't price) — document it and decide whether the strategy is reachable at all with
   free price data, or needs a paid/delisting-inclusive price source.
3. Independently, the G1 tagging rebuild remains the other open data-foundation task.
