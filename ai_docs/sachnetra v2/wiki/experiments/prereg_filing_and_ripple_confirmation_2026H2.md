---
tags: [experiment, pre-registration, sachnetra, filings, pead, no-filing-ripple, pairs, frozen, 2026H2]
status: PRE-REGISTERED as **Exp22** (claimed in the registry in the same commit, per registry rules;
  Exp21 was already claimed on-disk by the filing→press latency brief of 2026-06-09 — collision caught and
  resolved BEFORE commit this time). BINDING as of the commit timestamp. ONE evaluation at the end of the
  window; nothing here may change after commit.
experiment_id: Exp22
authored_date: 2026-06-12
window: 2026-06-13 → 2026-11-30 (held-out; data accumulates after this doc exists — the point)
evaluation_date: first week of December 2026, ONE run
source: P1a + P1f probes + the 6-round fresh-eyes review (Kimi/MiniMax/Sarvam) —
  problem-solving/2026-06-12_fresh-eyes-brief-news-brain.md; results notes 2026-06-12_p1a-*, 2026-06-12_p1f-*
---

# Pre-registration — the two H2-2026 confirmations (filing drift + no-filing ripple)

> Everything below is FROZEN at commit time. The probes that motivated this were exploratory
> (probe-grade, multiple cuts); this document is the one-shot, never-tuned-against confirmation that
> decides whether either signal graduates. Per the v0.2 report-card discipline: a re-run requires a fresh
> window and an incremented, logged trial count. **Kimi's closing line is the operating rule: "the
> pre-registration is everything now."**

## H-A — Own-name post-filing drift (the P1f confirmation)

**Hypothesis:** results-type filings on illiquid NSE names, with day-0 |market-adjusted move| in the
1.5–4% band, show incremental signed drift over a magnitude-matched placebo at the +3d horizon of
**> +0.25% with t > 2.5** (primary), and the 1.5–4% bucket specifically **> +0.40% with t > 2.0**
(secondary). BOTH must hold.

**Frozen definitions:**
- Universe: symbols in `research_prices` with ≥250 bars as of 2026-06-12; illiquid = below the ADV median
  computed on data through 2026-06-12. **No additions, no reclassification during the window.**
- Results-type: classified by announcement category per the Reg-30/Reg-33 mapping (board-meeting outcome +
  financial-results categories); **newspaper-publication copies excluded**. The exact category list is
  locked in the harness at commit (verify against SEBI LODR — Sarvam's Reg-32 claim was wrong; do not
  trust model memory for the mapping).
- Sign rule: day-0 close-to-close direction (unchanged from the probe — frozen, including its known
  noisiness). Day-0 = filing IST date (pre-open/market-hours) or next session (post-close).
- Placebo: magnitude-matched (±25–33%, widen once to ±50–100%, ≥15 bars away), seed and machinery as in
  `p1f-smallcap-filing-edge.mjs --matched` at commit hash.
- **Circuit-band slice (reported, not gating):** events with day-0 |move| within 0.25pp of 5/10/20% are
  flagged band-pinned; the signal must be present in the NON-pinned subset for the result to count as
  extractable (Kimi condition 2).

**Kill condition:** primary incremental ≤ 0, or the >4% bucket's matched placebo ≥ its real drift →
filings demoted to log-only context.

## H-B — The no-filing ripple (the inverted interaction, the bigger claim)

**Hypothesis:** when a frozen-pair HEAD moves ≥3% (market-adjusted) with **NO filing** in [d−3, d], the
LINKED name shows incremental signed drift vs a magnitude-matched placebo at the +5d horizon of
**> +0.8% with t > 2.0**; and the same-window **filing-backed** events show LESS drift than the no-filing
events (the inversion must replicate, two-sided test honestly reported).

**Frozen definitions:**
- **The pair list is FROZEN as the 19 P1a pairs as constituted on 2026-06-12** (incl. the failures —
  no swaps, no additions; the hindsight-selection guard). A separate, non-binding exploratory track may
  score NEW pairs from the unfamous-pair generator, but they cannot enter H-B.
- No-filing: zero announcements of ANY category for the head with IST date in [d−3, d]. The exclusion is
  total (not category-filtered) — frozen exactly as the probe ran.
- **Contaminant sub-slices (reported, not gating, data in hand):** events where the head had (a) a
  bulk/block deal in [d−3, d] (`india_bulk_block_deals`), (b) a pledge-related announcement in [d−10, d] —
  reported separately so the "unexplained-move mix" (Kimi round 6) is visible.
- Trigger threshold 3%, gap ≥6 trading days, benchmark ^NSEI, machinery as in `p1a-pair-drift-gate.mjs` +
  `p1a-filing-interaction.mjs` at commit hash.

**Kill condition:** no-filing drift ≤ 0, or filing-backed ≥ no-filing → the conditioned-pairs endpoint is
dead; the ripple lane reverts to research-only.

## Process freezes (both hypotheses)
1. ONE evaluation, first week of Dec 2026. No monthly peeking, no stopping at first significance.
2. The harness scripts at the commit hash are the evaluation code; bug fixes allowed only for crashes, with
   a logged diff and no parameter changes.
3. Costs reported at 2.5% AND 4% round-trip (information verdict is gross; tradability verdict is net).
4. Trial count: this is **trial #1** for both hypotheses. Any future re-registration increments it and says
   so (DSR honesty).
5. Outcome recorded in the registry + a results note whatever it is. Kimi's standing forecast ("6 months
   flat-to-negative; one good month; one block-deal ambush") is the named alternative to beat.

## What passing buys (and doesn't)
Passing H-A graduates the results-filing stream into the Mind's confirmed inputs. Passing H-B makes
**"3–5 pairs · no-filing trigger · structural link · illiquid linked name"** the program's first candidate
*strategy* (capacity ≈ ₹50L-class — own-capital scale, per positioning). Passing neither still leaves the
Mind's dataset-of-record value intact. **Nothing trades real money on a pass alone** — `positioning_v2`
Gate-1 conditions (paper window, regime change, executor) remain on top.
