---
tags: [synthesis, sachnetra, strategy, decision-log, dashboard, data-foundation, session-record]
source: [[research_state_summary]], [[india_proven_strategies_landscape]], [[positioning_v2]], [[latency_vs_value_tradeoff]]
audience: Lijo (operator) + future Claude/James sessions
created: 2026-05-29
status: living decision record — update as the plan executes
---

# Strategy Reset + Data Foundation — 2026-05-29

> **What this doc is:** the full record of the 2026-05-29 working session where we stopped the
> experiment treadmill, reframed the whole effort, built the first dashboard view, and set the
> forward plan. Written so a future Lijo (or a fresh Claude/James session) can land here and
> understand *what we decided and why* in 15 minutes — without re-deriving it.
>
> **If you read only one section, read §3 (The Decisions) and §6 (How To Proceed).**

---

## 1. Where we started (the feeling that kicked this off)

Lijo's words, paraphrased: *"I'm building this app but feel like I'm going nowhere. I keep running
experiments and updating code. I don't understand what I'm missing. Am I missing the strategies?
The tickers have flaws. Be honest about our current state — don't say things to please me."*

That feeling was **correct**, and this session was about naming why and fixing the direction.

Important standing context (does not change):
- Lijo is **new to trading**. Plain-English explanations required; the math/terminology gets
  delegated to Gemini/MinMax. (See §5 roles.)
- **SachNetra is a news-aggregation + data-collection platform.** It gathers news, filings, flows,
  and macro data into Railway PostgreSQL. The database is the asset.
- Positioning (from [[positioning_v2]], 2026-05-23): **"be your own first customer"** — prove
  signals on own capital via paper-trade → live trade. NOT B2B/SaaS/consumer. 2-person shop.

---

## 2. The honest diagnosis

### 2.1 The scoreboard after 14 experiments

From [[research_state_summary]] and the Exp 12/13/14 changelog:

- **One thing is real:** SachNetra's filing feed beats Indian newswires by ~13 min on large-caps
  (Exp 4). It's a *speed* edge, not a *prediction* edge.
- **Almost everything else is dead or blocked:**
  - FII flow → next-day direction: **dead** (Exp 1).
  - FII flow → volatility (beyond normal clustering): **dead** (Exp 7, confirmed Exp 9).
  - News sentiment → next-day direction: coincident only, scorer 88% positive-biased (Exp 3).
  - Pairs/cointegration: promising in-sample, **not tradeable out-of-sample** (Exp 12).
  - Hurst/regime: Nifty just trends; **no mean-reversion edge to harvest** at index level (Exp 13).
  - Governance-shock event study (the #1 recommended strategy): **BLOCKED by data starvation** —
    of 712 filings in the window, only **2** landed on a company we had prices for (Exp 14).

### 2.2 The two walls everything keeps dying on

Three different experiments all dead-ended on the **same two data gaps**:

- **G4 — price universe.** `research_prices` only covers the **Nifty 50** (≈47 symbols + ^NSEI).
  96% of filings are for companies we can't price, so any event study starves.
- **G1 — news→ticker tagging.** Coverage is ~4% (gate is ≥20%) **and** it's full of junk — it tags
  cricket ("IPL"), politicians ("MAMATA"), and common words ("TAKE") as if they were stock tickers.

**The core realization:** Lijo wasn't missing strategies. He was running *experiments* (cheap, feel
like progress) when the binding constraint was *data plumbing* (the actual wall). More experiments
return "BLOCKED — data starvation" until the plumbing is fixed.

### 2.3 The latency-vs-value squeeze (the deeper trap)

From [[latency_vs_value_tradeoff]] (Exp 10): on large-caps, high-impact events have *short* news
leads (the wire is fast); low-impact events have *long* leads but *no* price move. So you're fast
exactly where it doesn't pay, and you have no data exactly where it would. **The escape hatch is the
mid/small-cap universe** — where the wire is slow and the price reaction is real — which is precisely
what G4 + G1 unlock.

---

## 3. The decisions (this is the important part)

1. **Stop trying to invent an edge.** Use strategies already proven to work in India and feed them
   better data. We change/improve **datasets**, not invent strategies. *(Lijo's call; correct given
   the experiment record.)*

2. **Aim at ONE strategy, not eleven:** **mid-cap corporate-event / governance-shock arbitrage** —
   "catch bad news at smaller companies before it spreads." It is the #1 pick in
   [[india_proven_strategies_landscape]] and the only strong idea that survives our own experiments
   (most "green" strategies in the Gemini doc were already weakened/killed by Exp 1/7/9/12/13).

3. **The job now = data foundation + visibility, not strategy hunting.**

4. **Park the sentiment/NLP/OCR lane** (the `research/` folder MinMax produced; the postponed OCR
   app). It's a separate, slower project. Don't split focus. *(Consistent with the prior V2-015 OCR
   decision.)*

5. **Roles / division of labor:**
   - **Gemini + MinMax** (in browser) → strategy research from existing/open-source work, and
     explaining the scary math. Also data-source recon (per standing workflow).
   - **Claude (this repo)** → turns research into task files + writes the scripts + reviews.
   - **James + Lijo** → implement pipeline/crons and run scripts against the real database.
   - One agent edits one place at a time (Cursor/Antigravity for the dashboard repo or drafting;
     Claude for the SachNetra repo) — never two agents in the same files at once.

6. **Build order** (decided by Lijo's action of pulling the dashboard repo):
   **(a) Dashboard "Data Health" view first** [DONE this session] → **(b) G4 prices** → **(c) G1
   tagging rebuild** → **(d) re-run Exp 14**. Dashboard first because it makes the invisible data
   problems *visible and watchable* — it's the gauge before the surgery.

7. **The dashboard is a live web app, not a `.md` file.** It already exists in a separate repo
   (`sachnetra-dashboard`, Next.js → Railway). It reads the database live; data refreshes itself via
   crons + saved calculations. Nothing is hand-updated. We extend that repo. Language = whatever it
   already uses (Next.js/React/Tailwind) — don't start a new stack.

---

## 4. What we built this session

### 4.1 Dashboard "Data Health" board (`sachnetra-dashboard` repo) — DONE, verified live

Task spec: `ai_docs/tasks/DASH-001_data_health_view.md`. Three files:
- `app/api/data-health/route.js` (new) — the SQL queries.
- `app/components/DataHealth.jsx` (new) — six-tile board.
- `app/page.jsx` (edited) — fetch + render at top.

Six tiles, each answering a plain-English question: Price Universe, Latest Price, Tagging Coverage 7d,
Tagging Noise 7d, Filings Feed, FII/DII Flows. Built so any single tile degrades to "unavailable"
rather than crashing the page. `npm run build` passed.

**The board immediately proved the diagnosis (readings on 2026-05-29):**

| Tile | Reading | Meaning |
|---|---|---|
| Price Universe | **47** (red) | G4 — only the big 50 priced. Target ≥150. |
| Latest Price | 2026-05-22 | price cron not yet run (James will); will catch up. |
| Tagging Coverage 7d | **4.47%** (red) | G1 — gate is 20%. 990/22,153 tagged. |
| Tagging Noise 7d | **19.29%** (red) | G1 — 191/990 tagged rows hit a known-junk tag. |
| Filings Feed | 22,824 · latest 2026-05-28 | healthy. |
| FII/DII Flows | latest 2026-05-27 | healthy. |

### 4.2 Bug fix — "Today's News" / "Market Moving" showed near-zero

Root cause: the `stats` API computed "today" as the IST calendar date but compared it against a
`TIMESTAMPTZ` column under a UTC database session, shifting the window +5h30 and chopping off the
early-IST hours. Fixed all three "today" cards (`app/api/stats/route.js`) to compare IST calendar
dates on both sides:
`WHERE (published_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`.

### 4.3 Known-but-deferred (not bugs, or cosmetic)

- **Price data ~1 week stale** — the daily price cron hasn't run yet; James will. Not a code bug.
- **Volume bar chart groups days by UTC**, not IST — bars shifted ~5h30. Cosmetic; same one-line TZ
  fix would align it. Low priority.

### 4.4 Built autonomously after Lijo went to sleep (this session, not yet run)

- **G4 task file:** `ai_docs/tasks/G4_midcap_price_universe.md`.
- **G4 backfill script:** `scripts/research/backfill-midcap-prices.mjs` — written, **NOT run**.
  Reuses the exact Yahoo→`research_prices` logic, over the Nifty Midcap 150 universe.
- This document.
- Memory updates (see MEMORY.md).

---

## 5. Why G4 is next (and why prices before tagging)

The target strategy's first real test (re-running Exp 14) is blocked by **prices only**. The filings
already carry the company name — they live in `india_bourse_announcements` (22,824 rows). The missing
piece is a price series to measure "what happened after the filing." Fixing prices (G4):
- directly unblocks the #1 strategy's experiment,
- moves the Price Universe tile from 47 → ~200,
- does **not** require solving the hard tagging-precision problem first.

Tagging (G1) matters for the *news* angle and dashboard cleanliness, but is **not** needed for the
first event study — so it comes second.

This is **not more research.** Gemini already produced the strategy map. This is building the
foundation that map points to.

---

## 6. How to proceed (runbook for when Lijo is back)

### Step 0 — confirm the bug fix landed
Refresh the dashboard. "Today's News" should be a real number (dozens+), "Market Moving" non-zero.

### Step 1 — G4: expand the price universe (the next real move)
Read `ai_docs/tasks/G4_midcap_price_universe.md`. In short:
1. Get the **Nifty Midcap 150** constituent list (authoritative source — see task; do NOT hand-type
   tickers, hallucinated symbols poison the data). Either the script's built-in NSE-CSV fetch, or
   have Gemini/MinMax produce the list and pass it via `--symbols-file`.
2. Dry-run the backfill: `node scripts/research/backfill-midcap-prices.mjs --dry-run`
   (read-only, fetches + parses, writes nothing — safe to eyeball counts).
3. When it looks right, **Lijo/James run it for real** against prod (writes only to `research_prices`).
4. Watch the **Price Universe** tile climb from 47 → ~200, and **Latest Price** go current.

### Step 2 — re-run Exp 14 (mid-cap governance-shock event study)
Once mid-cap prices exist, re-run `scripts/research/exp14-governance-shock-event-study.mjs`. Many more
filings will now land on priced symbols. This is the first honest test of the #1 strategy.

### Step 3 — G1: rebuild news→ticker tagging (precision first, then coverage)
The harder one. Goal: stop tagging cricket/politicians (precision ≥90%), then push coverage past the
20% gate. The Tagging Coverage + Noise tiles are its gauges. Recon already exists in
`scripts/research/output/v2-031/`. Author as its own task when G4 + Exp 14 are done.

### Standing guardrails
- Claude writes code + read-only checks; **Lijo/James run anything that writes to prod.**
- Never paste the Railway connection string into chats, committed files, or this repo.
- Don't touch sacred files (`src/config/variants/full|tech|finance.ts`, `scripts/seed-insights.mjs`).

---

## 7. The one-sentence state of the business (honest)

> *We have a real, accumulating data asset and one credible strategy to aim at, but **zero strategies
> we'd put real money on today.** The win condition is not more experiments or more data sources — it's
> getting **one** strategy, end to end, that's good enough to paper-trade and then risk capital on.
> Everything that doesn't move toward that is motion, not progress.*

---

## 8. INCIDENT — Railway disk full during G4 backfill (2026-05-29)

Running the G4 backfill (`backfill-midcap-prices.mjs`, full run) wrote **140/150 symbols (441,102 bars)**
then the next symbol failed with PostgreSQL:
`could not write to file "pg_wal/xlogtemp...": No space left on device`. The following 9 symbols
cascaded into connection errors. A subsequent **read-only** diagnostic could not even connect
(`ECONNRESET`) — the DB is unhealthy from the full volume.

**Root cause:** Railway Postgres volume is at/over capacity. `research_prices` roughly tripled
(~196K → ~637K bars) and likely tipped an already-near-full volume over the edge (plus WAL).

**Blast radius:** this is the **shared production database** — the live news-seed cron writes here too,
so its writes may also be failing until space is restored. This is infra/billing, not a code bug.

**State left:** 140 of 150 midcap symbols are in `research_prices` (idempotent — the 10 misses
re-run cleanly once space exists). No corruption; no sacred tables touched. All DB activity stopped.

**Railway logs confirm (2026-05-29):** disk-full crash loop, not corruption. WAL redo *completes*
(`redo done at 0/84FFFF30`); the FATAL is only when writing a new post-recovery WAL segment
(`pg_wal/xlogtemp...: No space left on device`). So growing the volume should let startup finish and
the DB recover. The `HINT: ...use the last backup` is Postgres's generic unclean-restart boilerplate —
**not** real corruption; do not restore from backup first. Recovery handoff + cleanup SQL:
`ai_docs/tasks/G4_incident_recovery_handoff.md` + `scripts/research/cleanup-midcap-research-prices.sql`.

**Remediation (James/Lijo — do NOT let an agent do destructive recovery on the live DB):**
1. Check Railway → Postgres metrics: confirm volume is full; check whether it went read-only/crashed.
2. Confirm the **live seed cron** isn't silently failing (Railway logs for the seed service).
3. Fix space — either **grow the Railway volume** (cleanest) or reclaim space (VACUUM/cleanup needs
   headroom, so likely grow first, then vacuum). The 441K midcap rows can be deleted to recover space
   if needed, but DELETE+VACUUM FULL needs temp space — grow the volume first.
4. Once healthy: re-run `backfill-midcap-prices.mjs` (fills the 10 missing) and verify the dashboard
   Price Universe tile (~187 now, ~197 after the re-run).

**Lesson:** before a large additive write to a shared prod DB, check free disk first. I framed the
backfill as "harmless additive" — it was additive, but the *volume headroom* was the unchecked risk.

### ✅ RESOLVED — 2026-05-29

Recovered cleanly, no data loss to the legitimate Nifty-50 universe.
- **Volume grown:** moved Postgres to the Railway **hobby plan** + resized the volume. WAL recovery
  finished and the DB came back **Online** — no backup restore needed (the corruption HINT was
  boilerplate, exactly as predicted above).
- **Crons recovered:** `seed-india-announcements`, `seed-india-flows`, and the news `Cron` all green
  before cleanup.
- **Cleanup ran** via `scripts/research/cleanup-midcap-research-prices.mjs` (Node runner — psql not
  installed), three gated stages: pre-check (632,244 total · keep 196,724/47 symbols · delete
  435,520/139 symbols) → `--delete` (deleted 435,520 == pre-check, COMMITTED) → `--vacuum`
  (`research_prices` **107 MB → 29 MB**; DB total **213 MB → 135 MB**, ~78 MB returned to OS).
- **Final state:** `research_prices` = 196,724 rows · 47 symbols · latest 2026-05-27.
- **Residual:** `TATAMOTORS.NS` is the one KEEP symbol with 0 rows (table is 47, not 48) — a
  pre-existing Yahoo fetch gap, not caused by the incident. Optional re-backfill:
  `backfill-research-prices.mjs --symbol=TATAMOTORS.NS`.
- **G4 retry:** failed only on disk, not logic — now viable on the larger volume, but a separate
  budget/scope decision (re-check headroom; consider `--limit` batches). Full handoff:
  `ai_docs/tasks/G4_incident_recovery_handoff.md` (Resolution log).

## Changelog
| Date | Change |
|------|--------|
| 2026-05-29 | Created during the strategy-reset session. Records the diagnosis, the 7 decisions, the Data Health dashboard build + stats bug fix, and the G4→Exp14→G1 forward plan. |
| 2026-05-29 (later) | §8 added — Railway disk-full incident during the G4 backfill (140/150 written, then volume full). Remediation steps for James/Lijo. |
| 2026-05-29 (resolved) | §8 RESOLVED — hobby-plan resize recovered the DB; cleanup trimmed `research_prices` back to 47 Nifty-50 symbols / 196,724 rows (107 MB → 29 MB). No data loss. |
