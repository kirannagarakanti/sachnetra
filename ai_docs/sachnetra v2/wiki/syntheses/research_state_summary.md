# Research State Summary — Plain English

**Audience:** Lijo (and anyone who needs to understand what the experiments have actually concluded without reading nine 200-line markdown docs).
**Last refresh:** 2026-05-24 (after Exp 1–10, including Exp 10's Gemini backfill and re-run)
**Purpose:** Translate the quant research layer into one document a non-quant operator can read in 15 minutes and walk away knowing the edge thesis.

If you only read 30 seconds of this doc, read §1.

---

## 1. The 30-Second Version

**One signal works as advertised. Everything else is either coincident, killed by a standard control, or blocked by data age.**

The signal that works: **SachNetra's NSE filing pipeline beats Indian newswires by ~13 minutes on large-cap names** (Exp 4). That is a *latency* edge — being first to a fact — not a *forecasting* edge.

The signal we wanted: **FII flow predicting next-day market moves** — does NOT work for direction (Exp 1) and does NOT work for volatility once you account for the fact that volatility clusters naturally (Exp 7, now **confirmed on a validated estimator by Exp 9**).

The honest edge thesis we can defend today: *"We are early to corporate facts. Translating that earliness into a tradable edge is the next problem to solve."*

Everything else (sentiment time series, announcement category effects, tail/EVT studies) is **blocked by data age**, not by negative results. They become testable as the cron keeps running.

---

## 2. The Story Arc — How We Got Here

We ran ten experiments in three days (2026-05-22 → 24). The agent who ran them organized them as a sequence of falsifiable claims, killing the wrong ones until something survived.

**Round 1 — Test the folk wisdom (Exp 1).** Everyone in Indian markets says "FII selling drives the market down." We tested it on 17 years of data. **It is false at any tradable horizon.** FII flow correlates 0.035 with same-day returns — significant only because n≈4000, but only ~0.1% of the variance. FII flow *reacts*, doesn't lead. Direction is coincident.

**Round 2 — Try announcements (Exp 2).** Maybe corporate filings move prices. They do — same-day, +0.48%, t=3.08. But the per-category question (which we care about) is **untestable today** because NSE only serves a rolling 30-day window of filings, and 96% of those filings are for stocks we don't have price data for. *Untestable, not negative* — comes back to life as the database accumulates.

**Round 3 — Try news sentiment (Exp 3).** Daily-mean sentiment correlates +0.56 with same-day returns (with n=16, p=0.03 — fragile). Doesn't lead next-day at all. Also: 14 of 16 days are positive — there's a **positivity bias** in the scorer that needs calibrating before sentiment is useful as a model input.

**Round 4 — Try latency, not prediction (Exp 4). This one hit.** Don't ask "does our data predict price." Ask "does our data beat the newswire on time." It does — for large-caps, by a median ~13 minutes (sign-test p=0.002, n=239). **First true leading signal in the program**, but it leads *the wire*, not *price* — and only on names where the wire is already fast. The valuable case (mid/small-caps, where the lead should be *hours*) is blocked by the fact that only ~1.7% of news is ticker-tagged, all large-cap. Tagging coverage is the gate.

**Round 5 — Defer the impossible (Exp 5).** EVT (extreme-value theory, tail studies) needs a *lot* of data — by definition, "tail" means rare. Sentiment had 16 days. So this was consciously *not run* until sentiment matures (~Aug 2026). The discipline of deferring is the point.

**Round 6 — Try a different question on FII flow (Exp 6).** Exp 1 asked "does flow direction predict price direction?" — no. Exp 6 asked "does flow *size* predict price *swing size*?" — yes, apparently. Outflow days precede +24% higher next-day volatility than inflow days, t=6.6, p<0.001, holds out-of-sample. This was the most exciting result for ~6 hours.

**Round 7 — Kill the exciting result properly (Exp 7).** Volatility *clusters* — turbulent days follow turbulent days, regardless of any external driver. The proper test is GARCH-X: include FII flow IN the volatility model, see if it adds anything *beyond* the clustering. It does not. γ≈0, LR p=0.38, BIC worse. **Exp 6's volatility signal is mostly just persistence; FII flow adds nothing once you model that.** The agent flagged that the self-test had a flaw (couldn't identify γ even when it existed), which led to —

**Round 8 — But check the leverage angle (Exp 8).** The "outflow → vol" effect *could* just be the leverage effect (down days raise next-day vol; outflow days are slightly more often down days). Exp 8 controls for own returns and finds **the outflow-sign asymmetry is NOT a leverage artifact** — it survives even when you adjust for the market's own move that day. So: the *magnitude* signal in Exp 6 is dead (Exp 7), but the *sign asymmetry* is not just leverage (Exp 8). These don't contradict — they test different controls.

**Round 9 — Re-run Exp 7 with a validated tool (Exp 9, executed 2026-05-23).** Exp 7's machinery couldn't be trusted because its self-test was broken. Exp 9 rebuilt the self-test (γ recovered cleanly, LR p=4.2e-5) and re-ran the same question on prod. Result: **same null, now defensible** — γ=−0.0019, LR=0.77 (p=0.379), BIC worse, OOS gain negligible; outflow-only and post-2012 subsamples both reproduce the null. Exp 9's numbers match Exp 7's to three significant figures — a textbook replication. The validated estimator finds the same null on the same data, so the null is the *estimator's verdict*, not an identification artifact. **The GARCH-X verdict on FII flow is now closed: |FII flow| does not add incremental next-day vol-forecast power over GARCH(1,1) persistence within the symmetric-Gaussian model class.**

---

## 3. One Paragraph Per Experiment (Quick Reference)

| # | Question | Verdict | Plain-English Result |
|---|----------|---------|----------------------|
| **Exp 1** | Does FII flow predict next-day Nifty direction? | ❌ DEAD | The folk wisdom is wrong. Today's FII net flow tells you nothing about tomorrow's market. Hit-rate 51% = coin flip. FII reacts to the market, doesn't lead it. |
| **Exp 2** | Do corporate filings produce abnormal returns? | ⬜ INCONCLUSIVE | Same-day pop of +0.48% across 205 events. Per-category questions need months more data. The data window is one month rolling — *cannot be backfilled*, must accumulate. |
| **Exp 3** | Does news sentiment lead the market? | ⬜ INCONCLUSIVE | Coincident, not leading. Same-day correlation ~+0.56, but n=16 days. Also: sentiment scorer is positively biased (88% of days positive) — needs calibration. |
| **Exp 4** | Does our filing feed beat the newswire? | 🟡 YES, BUT | First true leading signal. ~13 min median lead on large-caps, p=0.002, n=239. Mid/small-cap version (where the value is) blocked by news ticker-tagging at only 1.7%. |
| **Exp 5** | Do sentiment + flow tails align with market crashes? | ⏸ DEFERRED | Not run. EVT needs many tail events; sentiment had 16 days total. Revisit ~Aug 2026 with 60-90 daily sentiment points. |
| **Exp 6** | Does FII flow magnitude predict next-day volatility? | 🟡 SUPPORTED, but ⚠ | Outflow days precede +24% higher next-day vol (t=6.6, p<0.001). Survives out-of-sample. **But:** Exp 7 reinterprets this as vol-clustering, not real flow incremental value. |
| **Exp 7** | Does FII flow add value *beyond* a GARCH vol model? | ❌ NULL | No. γ≈0, LR p=0.38, BIC worse. The Exp 6 signal was mostly just the volatility-clustering Exp 6 couldn't control for. **Confirmed by Exp 9 on a validated estimator.** |
| **Exp 8** | Is the Exp 6 outflow asymmetry just the leverage effect? | 🟡 NO | The outflow-sign asymmetry survives controlling for own returns (t 6.99 → 5.83, shrinks 18%). Holds inside both up- and down-day strata. Real, but doesn't contradict Exp 7 — different control. |
| **Exp 9** | Re-run Exp 7 with a validated estimator. | ❌ NULL CONFIRMED | Self-test recovers γ cleanly (LR p=4.2e-5). Prod run reproduced Exp 7 to three sig figs: γ=−0.0019, LR=0.77 (p=0.38), BIC worse, OOS Δ negligible. Outflow-only and post-2012 subsamples both reproduce the null. The GARCH-X / flow→variance question is closed for the symmetric-Gaussian GARCH(1,1) class. |
| **Exp 10** | Do tagged-large-cap NSE filings move the price (intraday)? | ⬜ INCONCLUSIVE + 🚩 SUSPECT | Headline t+60min abnormal return (+95.2 bps, p=0.015, hit=73%) is driven by a single day's multi-filings (GRASIM 2026-05-20). Real distinct-event N is ~8, not 26. Pre-registration rules prevent a false positive. Do NOT trade; fix three method bugs (de-dup, near-close filter, direction extraction) and re-run monthly. Gemini news backfill verified that Q4 results have short wires leads (5-60 min) but small events have infinite leads (no news coverage). |

---

## 4. Current State of Edge Knowledge

### 4.1 What we know works

- **Latency edge on large-cap filings (Exp 4).** SachNetra collects a filing ~13 min before the news appears. This is statistically real and survives multiple robustness checks. It is the only leading signal in the program.

### 4.2 What we know doesn't work

- **FII flow → next-day direction (Exp 1).** Dead. Coin flip.
- **News sentiment → next-day direction (Exp 3).** Coincident only at current data depth. May change with more data.
- **FII flow magnitude → next-day vol *as incremental forecast over GARCH* (Exp 7 + Exp 9).** Killed once persistence is modeled. **Confirmed 2026-05-23 by Exp 9 on a validated estimator** — numbers match Exp 7 to three sig figs. Closed.

### 4.3 What we don't know yet (data-age blocked)

- **Per-category announcement effects** (Exp 2). 1 month of data is not enough to distinguish "auditor change → alpha" from noise. Needs months.
- **Sentiment time-series structure** (Exp 3 / Exp 5). Need 60-90+ daily points before ADF, ARIMA, or EVT mean anything. ~Aug 2026.
- **Mid/small-cap filing latency** (Exp 4). Probably hours of lead, but tagging coverage is at 1.7%. Gated by James fixing the NER on the news pipeline (Gap G1).
- **GARCH-X with outflow sign term** (the unified Exp 7/Exp 8 test). The clean test of whether the outflow asymmetry survives full vol persistence — open question.
- **Single-stock event studies** (Exp 2 follow-up). Currently 96% of filings have no price data. Gated by widening `research_prices` beyond Nifty-50 (Gap G4).

### 4.4 What we have ruled out as confounds

- The Exp 6 outflow asymmetry is **not** the leverage effect (Exp 8 confirmed).
- The Exp 6 outflow asymmetry's **magnitude** signal is mostly volatility clustering (Exp 7, **confirmed by Exp 9** on a validated estimator). The **sign** signal is a separate open question — see the GARCH-X-with-outflow-sign test below.

---

## 5. Candidate Gate 2 Sentences (Pick One, Modify Yours)

Each sentence is defensible in its current form. Pick the one whose burden of proof matches what the experiments actually show.

### Option A — "Honest current state" (safest)
> *"SachNetra's only confirmed leading signal is filing-vs-newswire latency on large-caps (~13 min, p=0.002). Every other tested signal is coincident, killed by a standard control, or blocked by data age — not by negative results. The next 3–6 months of disciplined collection unlock the announcement category and sentiment time-series tests."*

**Brandon test:** passes. It's exactly what the experiments show. He might say "OK, but is a 13-min lead tradable?" — fair question.
**Skeptic test:** passes. It doesn't oversell.

### Option B — "Forward-looking thesis to validate" (most product-shaped)
> *"SachNetra's edge is informational latency on Indian equity events — being earliest to the fact, then synthesizing news/flow/entity context around it — translating into short-horizon directional opportunities the wire and discretionary investors cannot react to in time. Current proof: 13-min lead on large-cap filings. Outstanding proof: mid/small-cap lead (expected hours, tagging-gated), and translation of latency into price action."*

**Brandon test:** passes IF you accept it's a thesis-to-validate, not a thesis-proven. Be honest about which.
**Skeptic test:** passes if framed as forward-looking, fails if oversold as established.

### Option C — "Most-aggressive defensible" (gated on Gap G1; Exp 9 condition now resolved)
> *"SachNetra owns the fastest path from Indian regulatory filings to a structured, machine-readable, ticker-tagged signal — measured ~13 min ahead of the newswire on large-caps and expected hours ahead on mid/small-caps. Combined with the FII flow context (Exp 6/8 outflow-sign asymmetry, which survives leverage controls), this latency-plus-context structure is the basis of a directional risk-overlay strategy on liquid Indian names."*

**Brandon test:** still wobbly — only Gap G1 (mid/small-cap tagging) remains as the load-bearing missing proof. Exp 9 has landed but confirmed Exp 7's null, so the *magnitude* arm of "FII flow context" (Exp 6) is dead; Option C's parenthetical leans only on the *sign* arm (H6-asym + H8), which is still alive. Don't write this yet.
**Skeptic test:** would push hard on "directional risk-overlay" — what does that mean operationally?

### Recommendation
Write **Option A** as your current Gate 2 sentence. Hold **Option B** as your *aspirational* sentence — the thing you're building toward. Don't write **Option C** until the experiments back it.

You can update the Gate 2 sentence as evidence accumulates. The point of Gate 2 isn't to lock in a final story; it's to know which one you're operating under *right now*.

---

## 6. What To Do Next (Research Priorities)

Ranked by what unlocks the most:

1. ~~Run Exp 9 against prod~~ **DONE 2026-05-23** — null confirmed; GARCH-X / flow→variance question closed for the symmetric-Gaussian GARCH(1,1) class.
2. **Fix Gap G1 — news ticker tagging coverage** (James). This is the gate on the most valuable Exp 4 follow-up: the mid/small-cap latency edge. Widening NER from 1.7% to anything >30% unlocks the lead-the-newswire result on the names where the wire is *slow*.
3. **Build the unified GARCH-X-with-outflow-sign test** (future Exp 10 or 11). The clean test of whether the Exp 8 asymmetry survives full GARCH persistence — settles the open Exp 7/8 boundary. This is the *only* place a flow→variance link can still hide after Exp 9.
4. **Keep collectors running** (already happening via the autonomous pipeline). Every day the cron runs is a day closer to the announcement-category and sentiment time-series tests being live.
5. **Calibrate the sentiment scorer** (Gap G6). Before sentiment is used as a feature, fix the 88%-positive bias.

The data-gaps backlog (`_data_gaps_backlog.md`) has the full list of upstream collection items the research has surfaced. It is the staging ground for a bundled task Lijo will author when he has 4-5 more experiment-driven gap requests.

---

## 7. Cross-Reference

| If you want… | Read |
|--------------|------|
| The full hypothesis register and method philosophy (canonical verdict ledger, H1–H9 logged) | `sachnetra_research_playbook.md` |
| The collection-side roadmap (data sources still to build) | `sachnetra_quant_roadmap.md` |
| Each experiment in full statistical detail | `wiki/experiments/Exp1.md` … `Exp10.md` |
| The upstream data-gap backlog | `wiki/experiments/_data_gaps_backlog.md` |
| The positioning decision (be-your-own-first-customer) | `wiki/syntheses/positioning_v2.md` |
| **The strategic finding from the Exp 10 session — why the latency edge and price impact are inversely related, and which universe pivot escapes the squeeze** | **`wiki/syntheses/latency_vs_value_tradeoff.md`** |
| Plain-English jargon explanations | `wiki/glossary.md` |

---

## 8. How To Keep This Doc Honest

Re-write this summary whenever:
- A new experiment lands with a verdict
- An existing experiment is overturned by a follow-up
- The data-gap backlog gets actioned (something becomes testable that wasn't)
- The Gate 2 sentence changes

The point of the doc is to be the *one place* a future Lijo (or future Claude) can land on and know, in 15 minutes, what the research has actually proved. If it stops doing that, fix it.

---

## Changelog
| Date | Change |
|------|--------|
| 2026-05-23 | Initial creation. Summarises Exp 1–9 in plain English. Surfaces three candidate Gate 2 sentences, with the recommendation to pick Option A as current and Option B as aspirational. Lists the five highest-leverage next-steps. |
| 2026-05-23 (later) | **Exp 9 prod run executed** at Lijo's explicit ask. Updated §1, §2 round 9, §3 Exp 7/9 rows, §4.2/§4.4, and §6 to reflect ❌ NULL CONFIRMED on a validated estimator. Numbers match Exp 7 to three sig figs. Gate 2 sentence (positioning_v2.md) **unchanged** — Option A's update-rule fired in the "expected" branch, no rewrite needed. |
| 2026-05-23 (later still) | **H9 row formally logged** in `sachnetra_research_playbook.md`'s Hypothesis Register (the canonical verdict ledger, now H1–H9). Refined §5 Option C's gating note: Exp 9's null kills the *magnitude* arm of its "FII flow context" parenthetical, so Option C now leans only on the *sign* arm (H6-asym + H8) and is gated only on Gap G1 (mid/small-cap tagging). §7 cross-reference updated to note the playbook holds H1–H9. No other content shifts — the doc's plain-English conclusions don't change once the playbook row exists, since the synthesis already reflected the verdict. |
| 2026-05-24 | **Exp 10 event study run and news backfill completed.** Logged H10 in playbook Hypothesis Register. Verdict is ⬜ inconclusive + 🚩 suspect. Added Exp 10 row to summary table and updated state summary. |
