---
tags: [experiment, sachnetra, research, quant-finance, PEAD, event-study, mid-cap, long-only, pre-registered, null]
source: [[sachnetra_research_playbook]], [[exp16_brief]], [[Exp2]], [[Exp4]], [[Exp14]], [[Exp15]]
experiment_id: Exp16
status: COMPLETE — ❌ NULL (long-only mid-cap PEAD via EAR proxy; no tradable edge net of cost; 2024–2026 only, N=105)
authored_date: 2026-06-04 (brief) · run_date: 2026-06-05
verdict: ❌ NULL — H16a/b NOT SUPPORTED; H16c UNTESTABLE (announcement history only spans 2024-05→2026-05, so recency slice == full sample). Gross post-event drift ≈ +0.4–0.66% but statistically insignificant (p 0.36–0.56) and does not survive a 100–250 bps cost floor.
audience: Lijo, James, future Claude Code sessions
---

# Experiment 16 — Long-Only Mid-Cap PEAD via Day-0 Price-Reaction (EAR) proxy

> **Pre-registration:** [[exp16_brief]] (hypotheses §2, method §3, gates §4, and the §5b extreme-move
> amendment locked *before* stats). This file is the **post-run record** — data reality (§A), results
> (§B), and the decision-grade interpretation (§C). The brief is unedited except for the §5b amendment and
> the status stamp.
>
> Built on the page-verified PEAD evidence (`learning/research-notes/2026-06-04_pead-*`) and the corrected
> data premise (`learning/research-notes/2026-06-05_g4-already-done-correction.md` — G4 is DONE).

---

## 0. One-paragraph verdict

A long-only book that buys liquid Nifty-Midcap-150 names after a **top-quintile day-0 Earnings-Announcement
Return (EAR)** on a results filing, holds 5–15 days, and is filtered by a 50-DMA trend guard shows **a faint
positive gross drift (~+0.4–0.66% over the window) that is statistically indistinguishable from zero**
(p = 0.36–0.56) and **does not clear even a 100 bps round-trip cost floor**, let alone 250 bps. Every
pre-registered acceptance gate fails (DSR 0.000, Theil's U 1.34, ADF/KPSS both reject stationarity of a
flat/declining net-CAR curve). The robustness (winsorized) variant agrees. **H16a/b are not supported.**
A second, structural finding: `india_bourse_announcements` only covers **2024-05 → 2026-05**, so the test is
confined to ~2 years / 105 events and **H16c (recency-vs-full) is degenerate and untestable** — the recency
slice *is* the full sample.

---

## A. Data reality (run 2026-06-05, read-only)

Script: `scripts/research/exp16-midcap-pead.mjs` (Claude authored; run end-to-end as a validation).
Universe `shared/nifty-midcap150.json` · liquidity = **Amihud-median** (default) · benchmark = **equal-weight
Midcap-150** (default) · §5b primary = exclude `|EAR| > 25%`.

```text
  Liquid universe: 75/150 names (Amihud illiquidity below universe median)

  Announcements scanned: 321,010  ·  results-classified: 27,133  (non-results 293,877)
  Dropped — illiquid/unpriced: 26,244  ·  insufficient bars: 111  ·  bad-bar (§5b): 0
  Raw results-events on liquid names with full window: 778

  Event span: 2024-05-31 → 2026-05-06 (1.9y)  ·  recency cutoff 2023-06-05
  ⚠ ALL events fall inside the recency window → H16c DEGENERATE (full sample == recent slice).

  EXCLUDE variant: top-20% EAR cutoff = 1.66%; 778 considered → 105 selected after 50-DMA filter
  capacity: ~54 events/yr
```

**Read the funnel honestly.** Prices go back to 2009, but `india_bourse_announcements` (the V2-018 collector)
only spans **~2 years**, so every testable event is 2024–2026. The 2009→2024 price history is used only for
the Amihud filter, the 50-DMA, and the benchmark — not for events. The §5b exclude rule removed 0 events at
the raw stage (the extreme split/relisting artifacts the spot-check found are mostly on illiquid or
pre-window bars), but the cap still guards the EAR ranking. The top-quintile EAR cutoff is only **+1.66%** —
results-day reactions cluster near zero, so "strong positive reaction" is a weak signal at this depth.

## B. Results

Net market-adjusted CAR[+1..+H], cross-sectional, net of round-trip cost. `***` = p<0.01 (two-sided).
**Note: the `***` rows are significantly NEGATIVE — that is the fixed cost swamping a ~zero gross edge, NOT a
finding.** Back out the cost (net@100bps + 1.00%) for the near-gross drift.

| Variant | H | cost (bps) | N | net CAR | t | p | ≈ gross CAR |
|---|---|---|---|---|---|---|---|
| EXCLUDE | 5 | 100 | 105 | −0.34% | −0.82 | 0.412 | +0.66% |
| EXCLUDE | 5 | 250 | 105 | −1.84% | −4.47 | 0.000 *** | +0.66% |
| EXCLUDE | 10 | 100 | 105 | −0.35% | −0.58 | 0.560 | +0.65% |
| EXCLUDE | 10 | 250 | 105 | −1.85% | −3.09 | 0.002 *** | +0.65% |
| EXCLUDE | 15 | 100 | 105 | −0.60% | −0.91 | 0.364 | +0.40% |
| EXCLUDE | 15 | 250 | 105 | −2.10% | −3.18 | 0.001 *** | +0.40% |
| WINSOR | 10 | 250 | 105 | −2.04% | −4.11 | 0.000 *** | (agrees) |
| WINSOR | 15 | 250 | 105 | −2.23% | −3.79 | 0.000 *** | (agrees) |

**Concentration check** (EXCLUDE, 250 bps — drop top-3 events AND top-3 event-days): base is negative at
every H and gets *more* negative when the top events are dropped → there is **no positive base edge** for the
concentration test to erode. (The check is designed to catch a fragile *positive* edge; here it confirms
absence.)

**Daily-series gates** (EXCLUDE, H=10, 250 bps; 267 active portfolio-days):

| Gate | Value | Threshold | |
|---|---|---|---|
| Ann. Sharpe | −2.39 | — | |
| Deflated Sharpe Ratio | **0.000** | ≥ 0.95 | ❌ (N=12 trials; skew −0.61, kurt 11.81) |
| Theil's U vs benchmark | **1.344** | < 1.0 | ❌ |
| ADF (net-CAR curve) | t = −1.24 (lag 0) | < −2.86 | ❌ |
| KPSS (net-CAR curve) | 4.308 | < 0.463 | ❌ |

## C. Interpretation (decision-grade)

**Verdict: ❌ NULL — long-only mid-cap PEAD via an EAR proxy is not a tradable edge on the 2024–2026 NSE
midcap universe.**

- **H16a (drift exists, long-only):** ❌ not supported. The gross post-event drift (~+0.4–0.66%) carries the
  *right sign* (a faint PEAD shadow) but is **statistically insignificant** (p 0.36–0.56 at the near-gross
  100 bps scenario) at N=105. We cannot distinguish it from zero.
- **H16b (net of cost):** ❌ refuted. The drift does not clear a **100 bps** round-trip floor, never mind the
  conservative **250 bps** acceptance scenario. DSR 0.000 and Theil's U 1.34 confirm the net series neither
  beats the multiple-trials null nor the naive benchmark.
- **H16c (recency / anti-decay):** ❌ **untestable.** Because the announcement history is only ~2 years, the
  "last 36 months" slice equals the full sample. There is no full-vs-recent contrast to test the fading-size
  -anomaly hypothesis. This is a **data limitation, not a result.**

**Why this is a clean null, not a bug.** The plumbing validated: 75/150 liquid names, sane EAR distribution,
correct cost arithmetic (net@250 = gross − 2.5%), the winsor robustness variant agreeing with the exclude
primary, and the §5b/spot-check guards firing. The market absorbs the results-day reaction at/near Day 0 and
leaves no multi-day drift large enough to trade after realistic midcap costs — the same efficiency verdict
[[Exp14]] reached for governance shocks and [[Exp10]] foreshadowed (the latency-vs-value squeeze).

**The binding constraint is announcement-history depth, not prices.** G4 (midcap prices) is done and clean;
what caps Exp16 is that `india_bourse_announcements` starts in 2024-05. A **historical announcements backfill**
(the lever [[Exp14]] used via `backfill-announcements-historical.mjs`) would (a) raise N well past 105, and
(b) make H16c genuinely testable across the fading-anomaly period. Until then, Exp16 is underpowered by
construction.

### Caveats (all pre-registered, all pointing the same way: underpowered)
- **Survivorship** — `nifty-midcap150.json` is *today's* membership applied back over 2024–2026; demoted/
  delisted names are absent. Biases toward survivors.
- **EAR-only proxy** — no SUE/consensus; we capture the price *reaction*, not the fundamental *surprise*.
  EAR can be overreaction (mean-reverting), the opposite of drift. A real (not fixable-here) limitation.
- **In-sample quintile cutoff** — the top-20% EAR threshold is computed in-sample (characterization, not a
  live-tradable rule). At N=105 this is a mild look-ahead that, if anything, *flatters* the result — and it
  still failed.
- **Entry at T+1 close** (not the brief's T+1 open) — our store holds only RAW open, which mixes adjustment
  bases with adj_close; T+1 close is the adj-consistent choice. Documented deviation.

### Next step
- **Record the null** (this file + registry + playbook). Do **not** advance to Gate-1 paper-trading (§4 hard
  rule — the verdict stands on the EXCLUDE primary spec, which failed; the winsor variant is not a second
  chance).
- **Park, with a clear unblock:** a historical `india_bourse_announcements` backfill (≥5–7 years) is the one
  change that could revive Exp16 — it would lift N and make H16c testable. Re-run then.
- **Move on** per the program: the open gate is **G1 alias-normalization** (Pillar A) — see
  `learning/research-notes/2026-06-04_g1-tagging-gap-diagnosis.md`.

---

## D. Artifacts
- `scripts/research/exp16-midcap-pead.mjs` — the event study (read-only).
- `scripts/research/exp16-quality-spotcheck.mjs` — the read-only data-quality gate run first (PASSED).
- `scripts/research/output/exp16/exp16_summary.csv` — per (variant × horizon × cost) stats.
- `scripts/research/output/exp16/exp16_selected_events.csv` — the selected events per variant.

## E. Changelog
| Date | Change |
|---|---|
| 2026-06-04 | Pre-registered as [[exp16_brief]] (H16a/b/c, EAR proxy, gates §4). Claimed Exp16. |
| 2026-06-05 | G4 confirmed DONE (correction note); data-quality spot-check authored + run → **structurally clean** (weekend bars = real NSE special sessions; 2 ancient OHLC glitches; extreme-move artifacts flagged). |
| 2026-06-05 | §5b pre-registration amendment added (exclude `|EAR|>25%` primary + winsor robustness, before stats). |
| 2026-06-05 | **`exp16-midcap-pead.mjs` authored + run (validation). Verdict ❌ NULL.** 778 events → 105 selected; gross drift ~+0.5% insignificant (p 0.36–0.56); fails all §4 gates net of cost; H16c degenerate (announcements only 2024-05→2026-05). Status/frontmatter filled; registry + playbook updated. |

## F. H16 Hypothesis Register row (for the playbook)
```
| H16 | 2026-06-05 | Long-only top-quintile-EAR mid-cap PEAD → positive net CAR[+1..+H] | india_bourse_announcements (results) + research_prices (Midcap-150, adj_close) | market-adjusted long-only event study; Amihud-liquid 75; 50-DMA filter; exclude |EAR|>25% (§5b); {5,10,15}d × {100,250}bps; DSR/Theil/ADF/KPSS | gross ≈+0.4–0.66% (ns, p 0.36–0.56), net<0 at 100 & 250 bps; DSR 0.000, Theil 1.34; N=105 | 2024–2026 only (announcement-history-capped); EAR-only; survivorship | ❌ NULL — not tradable net of cost; H16c untestable | Park; unblock = historical announcements backfill, then re-run. Move to G1. |
```
