---
date: 2026-06-05
problem: A whole-project review of SachNetra — read the architecture, the V2 quant pivot, the research ledger, and the live frontier (Exp16 / G1) — then reflect honestly on what is strong, what is drifting, and the highest-leverage improvements. Grounded with external web checks on the two things the whole bet rests on (PEAD durability and the SEBI execution regime).
status: review — reflection / opinion, evidence-cited. Not a task file. Promote individual items to ai_docs/tasks/ as they're picked up.
lane: Lijo (strategy) + James (build)
tags: [research-note, review, reflection, strategy, architecture, PEAD, exp16, g1, sebi, tech-debt, process]
sources_consulted: [
  "Internal (read this session): CLAUDE.md, ARCHITECTURE.md, package.json, V2_roadmap.md, midcap-event-arbitrage-dossier.md, exp16_brief.md, research_state_summary.md, _data_gaps_backlog.md, g1-tagging-gap-diagnosis.md, g4-already-done-correction.md, positioning_v2.md, sachnetra-dashboard/*",
  "External (page-verified 2026-06-05): UCLA Anderson Review — 'Is PEAD a Thing? Again?' (2025 reversal of Martineau 2022); ScienceDirect S0148619524000584 (trading frictions & PEAD); SEBI Feb-04-2025 circular 'Safer participation of retail investors in Algorithmic trading' + Sep-2025 extension; QuantInsti / broker explainers on the Algo-ID regime (10 OPS threshold, April-2026 mandatory)"
]
---

# Whole-Project Review: SachNetra — what's strong, what's drifting, what to fix

> A reflection, not a task. Written cold after reading the architecture + the full quant research thread.
> Opinions are flagged as opinions; every factual claim cites a file or a page-verified source. The goal
> is to be *useful and honest*, not flattering. Companion to `research_state_summary.md` (the what-we-know
> doc) and `midcap-event-arbitrage-dossier.md` (the one-bet doc) — this is the *how-we're-doing* doc.

> ⚠️ **SELF-CORRECTION (same session, 2026-06-05).** My first draft's headline recommendation — *"run Exp16
> now, no blocker remains"* — was **stale on arrival.** I wrote it from a memory pointer ("exp16 running")
> without checking the live record first. The live record (`2026-06-05_earnings-announcement-data-sourcing.md`
> §6–7) shows **Exp16 already RAN → NULL**, **Exp17 already RAN → Layer-2 (intraday capture) RED**, and the
> **V2-018 announcement feed has been DEAD since ~2026-05-30, unnoticed for a week.** I committed the exact
> failure mode this review flags in §3/§6 (building on an unverified premise). I've rewritten §3, §7, §8, §9
> below to the real state and left this banner as evidence that the "re-verify the load-bearing claim against
> the live system *before* writing the plan" rule (§6) is non-optional — it just caught its own author.
> **The strategic/architecture findings (§1, §2.2 SEBI, §4 drift, §5 tech, §6 process) stand — they did not
> depend on the stale premise.**

---

## 0. What SachNetra actually is (three layers, one asset)

1. **V1 — the news app** (`src/`, a WorldMonitor AGPL fork): Vite/Preact SPA, Vercel edge functions,
   Tauri desktop, dual-map engine, 435+ feeds. Public face at sachnetra.com.
2. **V2 — the collection engine** (`scripts/seed-india-*.mjs` on Railway cron → Railway PostgreSQL):
   ~14 India data collectors live (news signals, FII/DII flows, NSDL FPI history, NSE announcements/deals/
   options, RBI WSS, BIS macro, FASTag, electricity). **The database is the asset.**
3. **The research lane** (`scripts/research/*`, `ai_docs/.../wiki/experiments/`, `research-notes/`):
   16 pre-registered experiments, a hypothesis register, and the current live bet — **long-only mid-cap
   PEAD (Exp16)** plus **Pillar A latency (gated on G1 tagging)**.

The honest one-liner from the research itself: *"We are early to corporate facts (Exp 4: ~13-min lead on
large-caps). Turning that into tradeable alpha is the unsolved problem."* (`research_state_summary.md` §1.)

---

## 1. What is genuinely strong (don't lose these)

- **Research discipline is the crown jewel.** Pre-registration before looking at data, Deflated-Sharpe
  anti-overfit gates, concentration drops, recency slices, walk-forward-by-default, and a culture of
  *killing* exciting results (Exp 6 → Exp 7 → Exp 9 is a textbook self-falsification arc). Most retail
  quant efforts never reach this. The `exp16_brief.md` §4 acceptance table and §5b pre-stats amendment are
  better than a lot of professional shops.
- **The "be your own first customer" positioning** (`positioning_v2.md`) is the right call for a 2-person
  shop — no GTM, no SEBI gate, the dataset compounds regardless. It's intellectually honest about what it
  is *not*.
- **The collection engine is real and broad.** ~14 independent India sources, idempotent backfills,
  `seed-meta` freshness tracking, health endpoint. This is the part that's hardest to replicate and the
  thing that quietly deepens the moat every day.
- **Self-correction works.** `g4-already-done-correction.md` — a stale "blocked on G4" premise was caught
  by a 2-command live DB check and the whole thread was re-pointed. That's the system functioning.

I want to be clear that the critiques below are *against a high bar* — this is a well-run program.

---

## 2. External reality-check on the core bet (the two things everything rests on)

### 2.1 Is PEAD still real enough to trade? — the literature is actively split (relevant to Exp16)
The dossier leans on Harshita 2018 + Brandt 2008 + a Rockstead replication. The **current** (2025) academic
state is more contested than the dossier conveys, and it cuts *toward* the brief's own caution:
- Martineau (2022) argued PEAD had largely vanished in modern US data. **Two 2025 papers reverse this** and
  claim PEAD is alive — but the UCLA Anderson Review write-up is explicit that *the disagreement is mostly a
  research-design artifact*: *whether you include microcaps, and how you measure the surprise.* PEAD's
  apparent life concentrates in the smallest, least-liquid names — **exactly the tail Exp16's liquidity
  filter deliberately drops** (`exp16_brief.md` §3.1).
- A 2024 ScienceDirect study on **trading frictions** finds the drift itself survives frictions but
  *strategies to exploit it are materially less profitable* once costs bite — which is precisely the H16b
  net-of-250bps gate. Good: the brief already encodes this. The risk is that the *tradeable* (liquid) half
  of Midcap-150 is the half where the literature says the drift is *weakest*.
- **Implication — and this is now confirmed, not predicted:** Exp16 ran and returned **NULL** (top-quintile
  EAR drift ≈ **+0.5%, insignificant**, doesn't clear the 100–250 bps floor). Exp17's intraday gate found
  reactions are **large but fully priced by the session close** (next-session drift −0.34% to −0.05% ≈ zero).
  So the honest outcome landed exactly where the literature warned: **the drift isn't capturable in the
  liquid names after cost, and the fast-capture window is already arbitraged on a public feed.** The team's
  own read (`...data-sourcing.md` §6): *"the miss is the signal, not the sample"* — more history won't rescue
  a ~0.5% gross edge. The external 2025 split (PEAD lives in microcaps/measurement) and this internal null
  agree: **EAR is not the leg.** The remaining cheap shot is the **SUE leg from XBRL** (§7).

### 2.2 The SEBI execution regime changed under the plan's feet (relevant to Gate 3 / going live)
`positioning_v2.md` Gate 3 picks Zerodha Kite Connect and says "don't subscribe yet." **What that doc does
not yet reflect: SEBI's Feb-04-2025 retail-algo framework became mandatory ~April 1 2026** (extended once in
Sep 2025). Page-verified specifics:
- Every algo order must carry an exchange-assigned **Algo-ID**; retail algos route through a
  broker-registered, exchange-approved system; algos must be **hosted on Indian servers**.
- **The threshold that matters for SachNetra: registration is required only above ~10 orders/second.**
  Below 10 OPS, no algo registration is needed.
- **Good news, stated plainly:** a long-only daily-rebalance PEAD book places a *handful* of orders a day —
  orders of magnitude under 10 OPS. So the new regime most likely **does not block** the own-capital path,
  and may simplify it. **But two things must be confirmed before any live rupee** (don't take my word):
  (a) Zerodha's specific post-April-2026 stance on Kite Connect "self-algo" / own-account API orders and
  whether they require the Algo-ID tagging even below threshold; (b) the "Indian servers" clause vs the
  current architecture (Railway/Vercel/Upstash regions — the *signal* compute can live anywhere, but the
  *order-placement* process should sit on an India-region host to be safe).
- **Action:** add a "Regulatory regime (2026)" subsection to `positioning_v2.md` §5 so Gate 3 isn't
  planned against a 2025 understanding of the rules. This is cheap and prevents a nasty surprise at the
  live-money gate.

---

## 3. The real risk (corrected): the cheap versions of the one bet are exhausting — and the asset isn't monitored

My first draft guessed the risk was *analysis-paralysis* (never shipping a trade). The live record
**refutes that**: Exp16 and Exp17 were both *designed and run the same day* — this team executes on research
fast. The reason "Tier 0: nothing paper-traded" (`positioning_v2.md` §6) is still literally true is **not**
hesitation; it's that **no signal has survived to paper-trade.** That's a more honest and more serious framing.

**The actual risk has two parts:**

1. **The one bet is running out of cheap shots.** There are now **three efficiency nulls in a row** on
   NSE mid-cap events: **Exp14** (governance shock, data-starved), **Exp16** (EAR drift ≈+0.5%, null),
   **Exp17** (intraday capture, reactions big but fully priced by close → RED). The team's own synthesis:
   the slow-drift and fast-capture versions of the mid-cap bet are *both* exhausted on the public feed. What
   remains cheap is **exactly one thread — the SUE leg from XBRL we already store** — described by the team
   itself as *"one shot, long shot."* After that, the only open lane is **G1 tagging** (Pillar A). **This
   matters because `positioning_v2.md` §7 has an explicit kill-signal** (6 months, no signal clears
   Sharpe 1.0 OOS → revisit positioning, fall back to "dataset-of-record"). The program should now *name how
   many more shots* it's giving the one bet before that kill-signal fires — that's a Lijo decision, and it's
   closer than the upbeat dossier tone implies.

2. **The asset has no monitoring — and it already cost a week of data silently.** The V2-018 announcement
   cron — *a core alpha source* — **died ~2026-05-30 and nobody noticed for ~7 days** (~3,000–5,000 missing
   filings; `...data-sourcing.md` §4). There is **no freshness alarm.** For a program whose entire thesis is
   *"the database is the asset,"* a load-bearing collector dying unobserved is the single most damaging
   operational fact in the whole review. You cannot "be your own first customer" — or trust any backtest —
   on a feed that can flatline for a week in silence.

> The corrected hard rule isn't "ship before researching" (they ship fine). It's two things: **(a) every
> collector that feeds a signal needs a freshness alarm before the next experiment runs** — Layer 0 is the
> precondition for everything; and **(b) before re-running or designing anything, re-verify the live state**
> (this review's own stale-premise stumble is Exhibit A).

---

## 4. Strategic / roadmap drift (cheap to fix, currently confusing)

1. **`CLAUDE.md` roadmap contradicts `positioning_v2.md`.** The roadmap still lists V2-004 (feedback),
   V2-007 (Hindi), V2-008 (WhatsApp), V2-010 (landing) as "not started" — as if pending. `positioning_v2.md`
   §3.1 **explicitly killed/parked all four** as consumer-product remnants. A cold-starting session reading
   `CLAUDE.md` first would mis-prioritize. **Fix:** mark those four `[PARKED — see positioning_v2 §3.1]` in
   `CLAUDE.md` so the two source-of-truth docs agree.
2. **The two missing capabilities `positioning_v2.md` §3.3 says are *mandatory* aren't in the V2 task
   list:** the **paper-trade platform** and the **backtesting harness**. These are the load-bearing items
   for the whole positioning, yet the only thing with momentum is *more collectors* (V2-019/020/024/026/027
   filed, awaiting James). **Opinion:** the marginal 9th data source is worth less than the *first* paper
   harness. Re-weight James's queue: one foundational backtest/paper-trade task should jump ahead of the
   Tier-2 collector backlog.
3. **The SUE leg is now the *whole* near-term thread, not a parallel hedge.** Exp16 (EAR) is done and null;
   the page-verified thread always said **SUE is the durable leg, EAR decayed/reverses**
   (`ear-proxy-risk-for-exp16.md`, `pead-recon-results.md`). The team has found the cheap path: **54% of
   stored results filings are XBRL** (`has_xbrl=true`, 14,532/27,127) → machine-readable quarterly EPS, **no
   OCR, no paid consensus feed** → time-series SUE (Bernard–Thomas seasonal random walk). This is the only
   remaining low-cost shot at the one bet — build it, run PEAD on top-SUE (or top-SUE ∩ top-EAR), and treat
   the result as **decisive**: if SUE is also null after honest cost, the mid-cap event-arb bet is spent and
   the kill-signal conversation (§3) is live.

---

## 5. Technical / architecture observations

1. **The fork's surface area vastly exceeds the mission.** The app carries Tauri desktop (Rust + Node
   sidecar), 92 protos / 22 services, globe.gl + deck.gl dual-map, 5 site variants, 21 languages, ONNX
   in-browser ML — almost none of which serves "collect India signals into Postgres and trade them."
   Under the `positioning_v2.md` framing (V1 = "free news ingestion pipeline, maintain at minimum cost"),
   this is a large, ongoing **maintenance tax on a 2-person shop** — every dependency bump, CSP sync, and
   desktop build is time not spent on the harness. **Opinion / decision to surface to Lijo+James:** is the
   full WorldMonitor fork still the right substrate, or should the India collection engine be carved into a
   small standalone service (just the seeds + Postgres + a thin digest reader) that doesn't drag the desktop/
   globe/proto machinery? Not a now-task, but a question worth a deliberate answer rather than drift.
2. **`sachnetra-dashboard` is a *separate* Next.js 14 app** with its own `pg` access, its own `.git`, and
   `instructions/*.md` (add-ai-columns, fix-market-moving-bug). This is a second codebase reading the same
   Railway DB. Risks: schema drift (two places encode column knowledge), credential sprawl (a second
   `DATABASE_URL` consumer), and divergent "market-moving" logic (there's literally a
   `fix-market-moving-bug.md` — implying the dashboard re-implements classification the pipeline already
   does). **Fix:** make the dashboard a *pure read* over views the pipeline owns; never let it re-derive
   signal logic. Document the schema contract in one place (`sachnetra_db_schema.md` exists — make the
   dashboard cite it).
3. **The asset rests on fragile free-tier inputs.** Prices = Yahoo Finance (survivorship-biased,
   silently renames tickers — see G5/`TATAMOTORS.NS` 404; the Exp16 split/relisting adj_close artifacts in
   §5b are the same class of problem). Sentiment = free HuggingFace FinBERT (rate-limited, and the scorer
   has a known **88%-positive bias**, G6, still uncalibrated). For a program whose entire thesis is "the
   data is the moat," the moat is currently built on two un-SLA'd free APIs and an uncalibrated scorer.
   **Fix priority:** (a) a **point-in-time universe** is the real survivorship fix and keeps biting Exp16's
   validity — even a crude delisting log would help; (b) **calibrate the sentiment scorer (G6)** before
   sentiment is ever used as a model feature, not after.
4. **Single-region / single-DB durability.** The asset is one Railway PostgreSQL. There's idempotent
   backfill but I saw no mention of an **off-Railway backup / point-in-time-restore** policy. The dossier
   notes the G4 backfill *crashed prod once on disk-full*. For "the database is the asset," a tested,
   off-platform backup is cheap insurance that should exist before live trading, not after the first
   incident. (If it already exists, document it in ARCHITECTURE.md — I couldn't find it.)

---

## 6. Process / documentation hygiene (the meta-layer)

The wiki/research-notes system is excellent but is starting to show the cost of an **append-only,
never-delete** culture:
- **Stale premises propagate before they're caught.** The "Nifty-50-only / blocked on G4" error lived
  across *every* 2026-06-04 note and was only corrected on 06-05. The fix (a live DB check) was 2 commands.
  **Suggestion:** make "re-verify the load-bearing data claim against the live system" a *pre-registration
  checklist item*, not a lesson re-learned (Hard Rule 11 exists — promote it to a checkbox in the brief
  template so it can't be skipped).
- **The doc graph is getting heavy to onboard.** A cold session must read CLAUDE.md → positioning_v2 →
  research_state_summary → the dossier → exp16_brief → 6 dated notes to know the live state. That's ~2,000
  lines to learn "run Exp16 next." The `_index.md` "next action" pointer is the antidote — **keep exactly
  one authoritative `NEXT` line** and make every other doc defer to it rather than restating (and risking
  contradicting) the live state.
- **Opinion:** the ratio of meta-docs (dossiers about the strategy, corrections, reviews — including *this
  one*) to executable artifacts (scripts that produce an equity curve) should bend back toward execution.
  This review is itself a meta-doc; its only justification is if it changes what gets *run* next.

---

## 7. The single highest-leverage sequence (my recommendation)

Corrected to the **live** state (Exp16 null, Exp17 RED, feed dead). In priority order — this matches the
team's own Layer 0→1→2 synthesis (`...data-sourcing.md` §6), which I endorse:

1. **Layer 0 — resurrect and *alarm* the dead feed (today, ops, Lijo/James).** Restart the V2-018
   `seed-india-announcements.mjs` cron, backfill the 2026-05-30→now hole with
   `backfill-india-announcements.mjs`, **and add a freshness alarm** (alert if `max(announced_at)` > 36h
   behind on a trading week). The alarm is the real deliverable — extend it to *every* signal-bearing
   collector, not just this one. **Nothing else on this list is trustworthy until this is done.**
2. **Layer 1 — the SUE leg from XBRL (the last cheap shot at the one bet).** Parse quarterly EPS from the
   XBRL filings already stored (54% of results rows) → build the EPS panel → compute time-series SUE →
   re-run PEAD on top-SUE (and top-SUE ∩ top-EAR). Treat the verdict as decisive for the mid-cap bet.
   (Claude authors the `scripts/research/` script; Lijo runs.)
3. **Stand up the paper-trade harness regardless** (the `positioning_v2.md` §3.3 mandatory-but-un-tasked
   capability). Even with no surviving signal yet, the harness + honest 250bps cost model is the artifact
   that makes any *future* "this works" claim real — and building it now de-risks the moment a signal does
   survive. (James.)
4. **G1 alias-form normalization** — the other open lane (Pillar A latency), and cheap: deterministic
   collapse of initial-spacing, `&`↔and, HTML-entity decode, Ltd/Limited fold. Proven by "AB Cotspin"≠"A B
   Cotspin". (James; `g1-tagging-gap-diagnosis.md` has the exact spec.)
5. **Name the kill-signal budget (Lijo, strategy).** Three efficiency nulls in; `positioning_v2.md` §7 says
   6 months / Sharpe-1.0-OOS or revisit. Decide *explicitly* how many more shots (SUE, G1) the one bet gets
   before the fallback-to-dataset-of-record conversation. Don't let it arrive by drift.
6. **Cheap hygiene (any session):** (a) reconcile `CLAUDE.md` roadmap with `positioning_v2.md` (mark
   V2-004/007/008/010 PARKED); (b) add a **SEBI-2026 regulatory subsection** to `positioning_v2.md` §5 +
   confirm Zerodha's self-algo stance before any live rupee; (c) calibrate the sentiment scorer (G6) and
   start a crude delisting/point-in-time log before sentiment or mid-cap backtests are trusted; (d) confirm
   an **off-Railway DB backup** exists (the asset has no documented one).

---

## 8. Risk register (the honest "what might not work about the whole program")

| Risk | Severity | Mitigation already present? | Gap |
|---|---|---|---|
| **Asset has no monitoring — collector died 1 week unnoticed** | **Highest (confirmed, not hypothetical)** | No — `seed-meta` exists but nothing alerts on it | Add freshness alarms on *every* signal collector; this is Layer 0, gates everything |
| One bet exhausting — 3 efficiency nulls (Exp14/16/17), SUE is the last cheap shot | High | Honest nulls, pre-registered | Name the kill-signal budget (positioning §7) explicitly before drift decides it |
| EAR proxy captured reaction not drift | Resolved | Tested → null, as the thread predicted | Closed — EAR is not the leg; SUE is the only remaining test |
| PEAD not capturable in liquid names after cost | Confirmed (Exp16/17) | Liquidity + intraday gates were honest | Accept; pivot to SUE, then to kill-signal conversation if SUE fails too |
| SEBI 2026 algo regime blocks/limits the live path | Med | No — Gate 3 predates the rule | Confirm <10 OPS exemption + Zerodha self-algo stance + India-server clause |
| Survivorship bias invalidates backtests | Med | Acknowledged as a "ceiling" | Keeps biting; needs a point-in-time universe, not just acknowledgment |
| Free-tier inputs break (Yahoo rename, HF limit) + no DB backup | Med | Idempotent backfill, fallback chain | No off-Railway backup; uncalibrated scorer (G6); no price-source redundancy |
| Maintenance tax of the WorldMonitor fork starves the mission | Med-Low | "maintain at minimum cost" framing | No decision on whether to carve out a lean collection service |
| Doc drift / stale premises propagate | **Med (this review proved it)** | Self-correction culture works *eventually* | Make live-data re-verification a pre-write checklist item — it caught this review's own author |

---

## 9. One-paragraph verdict

SachNetra is **doing the hard part right** — the research discipline is professional-grade, the team executes
on experiments fast (Exp16 + Exp17 designed and run in a day), the collection engine is a genuine compounding
asset, and the "be-your-own-first-customer" positioning is honest. But the live state is sobering and the
upbeat dossier tone under-weights it: **the one bet has taken three efficiency nulls in a row (Exp14/16/17)**
— EAR drift is dead and intraday capture is arbitraged — leaving **exactly one cheap shot (the SUE leg from
XBRL we already hold)** before `positioning_v2.md`'s own kill-signal becomes the live conversation. And the
single worst operational fact is not a research flaw at all: **a core alpha collector died for a week with no
alarm.** So the corrected priorities are unglamorous and ordered: **(1) resurrect + *alarm* the feed (Layer
0 gates everything); (2) take the one remaining cheap shot — SUE from XBRL — and treat its verdict as
decisive; (3) build the paper harness so a surviving signal can be proven; (4) in parallel, G1 for Pillar A;
(5) Lijo names the kill-budget before drift does.** The discipline that makes this program's nulls
*trustworthy* is its real moat — the task now is to spend the last cheap shots deliberately and keep the
asset alive while doing it.

---
*Reflection: I went in expecting to find a program whose main risk was over-thoroughness, wrote that, and
then the live record corrected me mid-review — Exp16/17 had already run to null/red and a core feed had been
dead for a week. That stumble is the most honest thing in this document: it proves the §6 rule (re-verify the
load-bearing claim against the live system before writing the plan) the hard way, on its own author. The
corrected takeaway: this team ships verdicts fine; what it lacks is **monitoring on the asset** and a
**named budget for how many more cheap shots the one bet gets.** Spend the last cheap shot (SUE/XBRL)
deliberately, alarm every collector, and decide the kill-budget on purpose. Sources for the two external
claims (PEAD-2025 split; SEBI-2026 algo regime) are in the frontmatter and cited inline in §2.*

## Sources (external, page-verified 2026-06-05)
- UCLA Anderson Review — *Is Post-Earnings Announcement Drift a Thing? Again?* (2025; PEAD-alive vs Martineau-2022, microcap/measurement caveat)
- ScienceDirect S0148619524000584 — *Trading frictions and the Post-earnings-announcement drift* (2024; drift survives frictions, strategies less profitable)
- SEBI circular SEBI/HO/MIRSD/MIRSD-PoD/P/2025/0000013 (04-Feb-2025) *Safer participation of retail investors in Algorithmic trading* + Sep-2025 extension; broker explainers (QuantInsti, AlgoBulls, ICICIdirect) on the Algo-ID regime, 10-OPS threshold, India-server hosting, April-2026 mandatory date.
