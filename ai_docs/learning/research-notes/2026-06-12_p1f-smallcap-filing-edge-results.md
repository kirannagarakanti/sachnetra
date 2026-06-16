---
date: 2026-06-12
problem: >
  P1f — the small-cap filing edge probe, ordered by BOTH fresh-eyes reviewers as the highest-priority cheap
  test ("go run the small-cap filing test; everything else waits on that number"). Question: filings arrive
  company-keyed + we hold daily prices, so without any news tagging — (1) do filings move small/illiquid
  names (day-0), and (2) is anything LEFT after day 0 (signed post-filing drift = the capturable window)?
status: REAL RUN COMPLETE 2026-06-12 (selftest PASS) — **PLACEBO RUN IN FLIGHT** at time of writing; the
  headline cell is PROVISIONAL until the placebo lands. This note exists so the result survives any session
  boundary; append the placebo verdict on completion.
lane: Lijo + Claude (read-only research lane)
tags: [p1f, gate, filings, pead, small-cap, illiquid, drift, placebo-pending, phase-1]
artifacts: [
  "scripts/research/p1f-smallcap-filing-edge.mjs (selftest + placebo modes)",
  "scripts/research/output/p1f/p1f_events.csv (140,257 events)",
  "scripts/research/output/p1f_real_run.txt · output/p1f/p1f_placebo_run.txt (pending)"
]
---

# P1f results — small-cap filing edge (REAL RUN; placebo pending)

## Setup (as run)
**2,172 priced symbols** (research_prices is far deeper than the assumed ~400 — Exp18-era expansion), ADV
median split into illiquid/liquid halves. Filings = `india_bourse_announcements` for priced names,
2024-06-01 → 2026-05-15, deduped per (symbol, IST day), 3-day declustered → **140,257 filing event-days**.
Day-0 = filing date (pre-open/market-hours) or next session (post-close). Measures: day-0 |abnormal| and
signed drift CAR(+1..+{3,5,10}) signed by day-0 direction, market-adjusted vs ^NSEI. Selftest: recovered
injected 4% day-0 + ~1.5% drift (t=4.1); null read as zero. ✅

## Real-run numbers (2026-06-12)

| Slice | N | day-0 \|abn\| | drift +3 | drift +5 | drift +10 |
|---|---|---|---|---|---|
| ALL filings, all names | 140,257 | 2.05% | +0.06% (t=0.5) | −0.05% (t=−0.4) | +0.03% (t=0.2) |
| Illiquid half (all filings) | 55,693 | 2.31% | +0.17% (t=0.6) | −0.06% (t=−0.2) | +0.18% (t=0.5) |
| Liquid half (all filings) | 84,564 | 1.87% | −0.01% (t=−1.0) | −0.05% (t=−2.4) | −0.07% (t=−2.5) |
| **ILLIQUID × RESULTS-like filings** | **10,464** | **2.92%** | **+0.49% (t=8.9)** | **+0.49% (t=6.9)** | **+0.54% (t=4.6)** |

Time-of-day (illiquid, all filings, drift+5): pre n=430 +0.64% (t=1.7) · mkt n=23,133 −0.49% (t=−0.9) ·
post n=32,130 +0.23% (t=0.7).

## Provisional reading (STRICTLY pending placebo)
1. **Filings in general carry no drift** — flat everywhere; the liquid half even shows faint reversal. Most
   filings are administrative noise; the market treats them as such.
2. **The headline cell: illiquid × results-like filings — +0.49%/3d at t=8.9 (n=10,464)** — the classic
   PEAD signature, in exactly the segment the literature predicts (small/illiquid) and exactly where Exp16
   could not look (Exp16 = liquid Midcap-150 half, 105 events; this = 5× wider universe, 100× more events,
   recency-clean window 2024-06→2026-05).
3. **Why the placebo is decisive here:** illiquid small caps can show mechanical continuation after ANY big
   move (stale quotes, bid-ask bounce, slow discovery). The placebo applies the identical
   sign-by-day-0-direction machinery to random non-filing days. If generic post-move continuation in these
   names produces ≈+0.5%, the headline cell is microstructure, not information. (P1a's placebo caught
   exactly such a mirage at the week horizon.)

## Pre-registered-style reading rules (written BEFORE the placebo lands)
- **ALIVE** if placebo's matching cell (illiquid, signed drift +3/+5) is < ~+0.15% or t<2 while the real
  cell stands → genuine post-filing drift; promotes the results-filing stream into the Mind's highest-value
  inputs and revives the PEAD thesis on the small/illiquid universe.
- **MIRAGE** if placebo shows ≳+0.3% in the same cell → continuation artifact; the filing adds little
  beyond "a big move happened"; the cell is then a microstructure note, not a signal.
- Either way: gross-not-net (2.5–4% cost wall still applies; +0.5%/3d is information, not yet a trade);
  survivorship (priced universe = survivors) softened by the 2024+ window; per-filing-category and
  day-0-magnitude conditioning are the obvious v2 cuts.

## Caveats (independent of placebo)
Daily bars only (no intraday capture measurable — Exp17 covered that for large caps); results-classification
is regex-based (category/subject ~ result|financial|earning|quarterly|audited); the time-of-day buckets are
all-filings (not results-only) and noisy; multiple slices examined (probe-grade, mints no Exp ID — a
pre-registered confirmation on a fresh window is the graduation path, per the v0.2 report-card discipline).

## PLACEBO VERDICT (run completed 2026-06-12 ~12:17 IST; first attempt hung on a stalled DB connection,
killed + relaunched)

**Placebo numbers, matching cell (illiquid × results-like symbols, random non-filing days, n=10,665):**
+3d **+0.12% (t=2.1)** · +5d **+0.25% (t=3.2)** · +10d **+0.33% (t=3.1)**. Day-0 |abn| baseline for the
same symbols: **2.25%** (vs **2.92%** on real results days → filings genuinely move these names ~+0.7%
more than a random day).

**Applying the §-pre-registered rules window by window (no re-interpretation):**

| Window | Real | Placebo | Incremental | Pre-registered call |
|---|---|---|---|---|
| +3d | +0.49% (t=8.9) | +0.12% (t=2.1) | **+0.37%** | **ALIVE** (placebo <0.15%) |
| +5d | +0.49% (t=6.9) | +0.25% (t=3.2) | +0.24% | **GRAY** (between the 0.15 ALIVE and 0.30 MIRAGE bars) |
| +10d | +0.54% (t=4.6) | +0.33% (t=3.1) | +0.21% | **MIRAGE-side** (placebo ≥0.30) |

**Honest verdict: ALIVE AT THE 3-DAY HORIZON, MODEST AND EARLY-CONCENTRATED.** Illiquid small caps carry a
*generic* signed continuation after any sizable move (+0.12→0.33% rising with horizon — the same animal
P1a's placebo caught at the week horizon). On top of that baseline, results-like filings add **≈+0.37%
of genuine information drift in the first 3 trading days**, decaying toward the generic level by day 10.
The diffusion is real, fast-ish, and small. Filings also produce a measurably larger day-0 reaction
(+0.67% absolute vs baseline) — they are informative events, not noise, in this segment.

**What this is and isn't:** it is the program's second placebo-surviving post-publication signal (after
P1a's month-horizon pair drift), in the exact segment the PEAD literature predicts and where Exp16 couldn't
look. It is NOT a trade: +0.37%/3d gross vs a 2.5–4% cost wall. Its value is as (a) a confirmed information
stream for the Mind (results-filing events on illiquid names → short-horizon drift context), (b) the
substrate for conditioning (day-0 magnitude, filing category, novelty, the P1a link-graph — the obvious v2
cuts), and (c) evidence the small/illiquid universe is where slow diffusion lives, consistent with P1a's
sleeve pattern. Graduation path unchanged: pre-registered confirmation on a fresh window under the v0.2
report-card discipline (one-shot, never tuned against).

**Ops footnote:** the first placebo attempt hung on a stalled Railway-proxy connection (CPU frozen across
samples — the diagnostic that matters); killed + relaunched cleanly. v2 of these harnesses should set a pg
statement/connection timeout instead of relying on the operator noticing.

---

## KIMI REVIEW OF THE VERDICT (fresh-eyes follow-up, 2026-06-12) + THE MATCHED CONTROL

Kimi's attack on the +3d cell — **converged independently with our own suspicion**:
1. **Magnitude-conditioned continuation (the main artifact candidate):** our placebo is random days
   (mostly ~0.5% moves); filing days average 2.92%. Big moves in illiquid names have different
   microstructure — gap to a new level + a noisy thin close → days 1–3 "drift" is the close catching up to
   the gap, not information diffusion. *The placebo conditions on symbol but not on day-0 magnitude → wrong
   baseline.*
2. **Sign-by-close noise:** day-0 close-to-close direction is noisy in illiquid names; part of the "drift"
   may be reversion-to-gap. (Gap-sign variant = a v2 option; daily bars carry open.)
3. **Regex classification mixes stale (audited) with fresh (preliminary) results** — dilution both ways.

**Kimi's prescribed first cut (adopted, run as P1f-v2 `--matched`):** within illiquid × results, fixed
day-0 |move| buckets **<1.5% / 1.5–4% / >4%**, with a **magnitude-matched placebo** (random non-event days
whose |day-0 move| matches the real event's, ±25–33%, ≥15 bars away). Predictions on record: <1.5% bucket
≈ zero incremental; >4% bucket = high raw drift but high matched-placebo too (momentum dressed as filing
reaction); **1.5–4% middle bucket = the cleanest signal if information is real** — because information
should survive magnitude control, microstructure shouldn't.

**Kimi's forecast revision:** endpoint shifts from "pairs + filings" to **"pairs, with filings as a weak
prior that rarely changes the trade."** Still predicts 6mo paper flat-to-negative.

**Kimi's pre-registration design (to be drafted AFTER the matched run, then git-committed before the
window's data exists):** window Jun–Nov 2026, one test at the end; freeze the regex, the ADV cutoff +
symbol list as of 2026-06-01, the sign rule, placebo machinery + seed. Pass = BOTH: primary incremental
>+0.25% t>2.5 AND middle-tercile >+0.50% t>2.0. Kill = negative primary, or top bucket placebo>real →
demote filings to log-only.

**Kimi's amplification-trap warning (logged verbatim-ish, keep forever):** *"orthogonal filters in illiquid
Indian equities are not orthogonal — they all measure the same thing: something happened, the market
noticed slowly, and you were there. Your filters don't multiply; they select for the same 200 events a
year."* And the hold-period math: capturing ~0.6% in 1–3 days against 2.5% costs is day-trading illiquid
names — the confirmation test exists to prove this wrong, and Kimi bets it won't.

**Matched-control run (completed 2026-06-12): THE SIGNAL SURVIVES KIMI'S CONTROL.**

Control validity: matched day-0 |abn| 2.73% vs real 2.92% — valid baseline. Illiquid × results:

| Window | Real | Magnitude-matched placebo | Incremental |
|---|---|---|---|
| +3d | +0.49% (t=8.9) | +0.18% (t=3.1) | **+0.31%** |
| +5d | +0.49% (t=6.9) | +0.18% (t=2.3) | **+0.31%** |
| +10d | +0.54% (t=4.6) | +0.66% (t=1.6) | ≈0 (dissolves) |

**Kimi's bucket predictions vs reality (drift +3d, real vs matched):**
- **<1.5% bucket:** predicted zero → **correct**: +0.04% vs +0.06%. No surprise → no drift. ✔ information-consistent
- **1.5–4% middle bucket:** predicted "cleanest signal if information is real" → **+0.53% (t=6.0) vs
  +0.07% (t=0.7) = +0.46% incremental on a ~ZERO generic baseline.** By Kimi's own pre-stated criterion
  ("middle bucket positive with tight variance = you've found something") — **found something.**
- **>4% bucket:** predicted momentum-dressed → **half right**: matched baseline IS elevated (+0.57%, t=3.7 —
  generic big-move continuation, likely incl. circuit-band deferred discovery per Sarvam's mechanism), but
  real = +1.17% (t=8.3) → still **+0.60% incremental**.

**FINAL P1f VERDICT: genuine post-filing information diffusion in illiquid small caps, ≈+0.3–0.5% over
3–5 days, cleanest in the 1.5–4% day-0 surprise band where the generic baseline is zero; horizon ~a week,
gone by day 10. Kimi's microstructure bet is REFUTED on its own test design — the middle bucket separated
information from microstructure exactly as it specified, and information won.** Still gross-not-net
(≪ cost wall); still probe-grade. Graduation = the Jun–Nov 2026 pre-registered confirmation (Kimi's freeze
list + Reg-33/30-based classification + band-pinned slice), to be drafted and git-committed before the
window's data accumulates.
