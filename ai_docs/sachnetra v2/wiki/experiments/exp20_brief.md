---
tags: [experiment, sachnetra, research, quant-finance, sentiment, calibration, finbert, g6, ensemble-feeder, ablation, pre-design-brief]
source: [[sachnetra_research_playbook]], [[exp19_brief]], [[Exp19]], [[Exp3]], [[2026-06-06_edge-hunt-where-alpha-could-still-live]]
experiment_id: Exp20
status: BRIEF — pre-registration design phase · Part A1 RUN 2026-06-08 (see §1.1) · the load-bearing FEEDER for [[Exp19]] (does SachNetra's unique sentiment data add cross-sectional IC beyond momentum?)
authored_date: 2026-06-07
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Pre-register G6 — (A) calibrate the news-sentiment scorer (the 88%-positive bias, [[Exp3]]) for RANK quality, and (B) plug calibrated PER-TICKER sentiment into the Exp19 panel and run the v1↔v2 ablation. This is the decisive test of whether SachNetra's unique data lifts the ensemble beyond plain momentum.
registry_note: "Claims Exp20 (next free per _index.md). _index.md row + 'next free ID → Exp21' updated in the same change."
---

# Experiment 20 — Brief: Sentiment calibration (G6) + the per-ticker sentiment feeder for Exp19

## 1. Why this experiment, why now

[[Exp19]] v1 was decisive in one respect: the cross-sectional blend has a weak positive IC (+0.043) but it is
**entirely price-momentum** — `ear_drift` and `bulkdeal_intensity` add ≈nothing. The whole edge-hunt §3
ensemble thesis now rests on whether SachNetra's **unique** data adds cross-sectional alpha *beyond a textbook
factor*. **Per-ticker news sentiment is the most likely such column** (it is plausibly momentum-independent),
so it is the load-bearing feeder — but it is currently untrustworthy: [[Exp3]] found the scorer is **~88%
positive** (G6). This experiment fixes what needs fixing, then runs the honest ablation.

**The key reframe (do not over-fix the bias).** The scorer's positivity bias hurts a *time-series level* read,
but **Exp19's daily cross-sectional z-score already removes any uniform offset.** So for the ensemble, the
calibration that matters is **ordering / discrimination** — does the scorer rank *ticker A's* news above
*ticker B's* in a way that tracks reality? — **not** absolute centering. G6 is therefore re-scoped from "make
the mean zero" to "make the **ranking** trustworthy."

---

## 1.1 Part A1 results (run 2026-06-08, read-only — `check-sentiment-calibration.mjs`)

The cheap read-only diagnosis ran against prod `india_news_signals` (65,985 rows; **2,784 carry a sentiment
label/score, 4.2%**). **It overturns the brief's starting premise and the [[Exp3]] "~88% positive" figure:**

| Q | Finding |
|---|---|
| **Q1 — confirm the bias** | The split is **pos 35.2% · neu 37.8% · neg 27.0%** (n=2,784) — a *mild* positive lean, **not 88%**. Per model: `finbert-hf` 35/37/28 (n=2,573, the bulk); `groq-v2` skews **neutral** (56%, n=165); `groq-llama` skews positive (52%, n=46) but is a tiny sample. **No model is anywhere near 88% positive.** |
| **Q2 — attribute it** | Tagged-vs-untagged positive-share gap is only **3.9 pts** (38.6% vs 34.6%) → the modest bias that exists looks **model-driven, not selection-driven** — and small enough not to matter for a rank. |
| **Q3 — ordering sanity** | Tagged-row score **dispersion sd = 0.77**, 177 distinct values, clean **bimodal** shape (piles at −1 / 0 / +1 — classic FinBERT). **Ample spread for a per-day z-score to rank on.** |
| **Coverage (the real blocker)** | Only **402 rows are both ticker-tagged AND scored**, essentially all from **2026-05/06**. `nse_tickers` coverage is **4.4%**; **`nse_tickers_v2` is 0% in prod** (V2-031b/c backfill not yet deployed). |

**What A1 settles (the [[exp19_brief]] §4 guard, satisfied honestly):** the §3 A4(iii) re-ordering case is
**not triggered** — the bias is a small, roughly-uniform offset over a well-dispersed score, so **G6 is NOT the
ensemble blocker.** Per the pre-registered guard, the honest conclusion is *"run Part B on RAW scores"* — the
gold-set / transform work (A2–A4) is **deferred, not required**, unless Part B later shows the *raw* sentiment
column mis-orders.

**The blocker A1 surfaced instead is COVERAGE (couples to G1):** with only ~400 tagged+scored rows confined to
two months, there is **no per-day cross-section and no history** for the Exp19 panel. Part B therefore reads as
**untestable-yet**, not null, until G1 widens tagging *and* the sentiment scorer runs over more of the firehose
(only 4.2% of rows are scored at all today).

> **Caveat on the 88% discrepancy.** Where [[Exp3]]'s 88% came from is unresolved — likely a different
> denominator (e.g. a market-moving / older snapshot, or `pos/(pos+neg)` excluding neutrals — which is still
> only ~57% here, not 88%). Either way it does not describe today's `india_news_signals`. Worth a one-line
> reconcile against the [[Exp3]] method before citing 88% again anywhere.

Output: `scripts/research/output/exp20/sentiment_calibration.json`.

---

## 2. Core hypotheses (written before looking)

- **H20a (calibration — ordering quality):** Against a hand/LLM-labeled gold set of Indian financial
  headlines, the production scorer's **rank/discrimination** (Spearman of score vs gold label; AUC of
  positive-vs-negative) is measurable, and a chosen calibration transform (or model swap) **materially
  improves** it over the raw stored scores.
- **H20b (the feeder earns its column — the decisive test):** Adding calibrated **per-ticker** sentiment to
  the Exp19 panel **lifts OOS composite IC and net top-decile spread above the v1 baseline**, *and* sentiment's
  **drop-one-out contribution is positive on walk-forward** (the §3.7 ablation). I.e. SachNetra's sentiment
  adds cross-sectional alpha **beyond momentum**.

### Pre-registered success thresholds
| Outcome | Trigger |
|---|---|
| ✅ SUPPORTED | H20a: calibrated ordering beats raw on the held-out gold slice **AND** H20b: v2 (with sentiment) beats v1 on **both** OOS IC and net spread **AND** sentiment drop-one-out contribution > 0 |
| 🟡 PROMISING | Calibration improves ordering, and sentiment lifts OOS IC but not net-of-cost (or lift is concentration/period-fragile) |
| ❌ NULL | Sentiment adds no OOS IC over the v1 momentum baseline (drop-one-out ≈ 0 or negative) — SachNetra sentiment is not a cross-sectional alpha source |
| 🚩 SUSPECT | Any lift driven by one period / lookahead in the sentiment timestamp / gold-label leakage |

---

## 3. Method

### Part A — Calibrate the scorer (research lane; read-only on prod scores)

**A1. Diagnose the bias (read-only). — ✅ DONE 2026-06-08, see §1.1.** Pulled the distribution of
`india_news_signals.sentiment_score`: overall histogram, split **by model** (`finbert-hf` / `finbert-railway`
/ `groq-llama` / `groq-v2`) and **by tagged-vs-untagged**. Result: the **~88% premise did not hold** (actual
35.2% positive); the mild bias is **model-driven**; score **dispersion is ample** for a rank ⇒ **G6 is not the
ensemble blocker**, and the real constraint is **coverage** (4.2% scored, 402 tagged+scored, `nse_tickers_v2`
empty). A2–A4 are consequently **deferred** (run Part B on raw scores first).

**A2. Build a gold set.** ~**300–500** Indian financial headlines sampled across tickers/time, labeled
pos/neu/neg by a clear rubric. Label with a **strong, different** LLM (not the FinBERT family being
evaluated — avoid circularity) + a **Lijo spot-check** of a subsample. Store in the research lane
(`output/exp20/gold.csv`). *(This is the only manual-ish step; keep it small and honest.)*

**A3. Measure ordering, not centering.** On the gold set compute, for the **raw** scores and for each
candidate transform:
- **AUC** (positive-vs-negative separation) and **Spearman** (score vs ordinal gold) — the *discrimination*
  metrics that matter for a cross-sectional rank;
- a reliability/confusion view for context (where the absolute level is wrong) — reported, not optimized.

**A4. Choose the calibration transform** — simplest that wins on A3's held-out slice. Candidates:
- **(i) None needed for XS** — if raw *ordering* is already good (AUC high), the z-score handles the offset →
  document and move straight to Part B. *(Genuinely the likely outcome — test it first.)*
- **(ii) Monotone recalibration** (isotonic / Platt) of score→true-label-probability, fit on gold-train,
  validated on gold-test. Improves probability meaning; **preserves ranking** (so won't change XS much).
- **(iii) Model swap / ensemble of scorers** — if FinBERT *mis-orders* (not just mis-centers), prefer
  `groq-llama` or a finance+India model, or average models. This is the only fix that changes the XS rank.
- **(iv) Neutral-band re-threshold** — if the issue is over-calling "positive," shift cutoffs (helps
  precision; minor for a continuous XS score).

> **Pre-registered guard:** because the XS z-score removes a constant offset, **only A4(iii) (re-ordering) can
> change Exp19's result.** If diagnosis shows the bias is a uniform offset with good ordering, the honest
> conclusion is "G6 is not the blocker for the ensemble" — and Part B runs on raw scores. Don't manufacture a
> transform that only re-centers and then claim it helped.

### Part B — The per-ticker sentiment feeder + the ablation (the decisive test)

**B1. Build the column.** Aggregate calibrated scores to **(nse_ticker, IST day)** → daily mean sentiment
(and count). Add to `build-xs-panel.mjs` as `sentiment`, **strictly as-of the rebalance date** (use scores
with `scraped_at`/`published_at` < d; never same-day-after-close → no look-ahead). Expect **sparsity** —
coverage is gated on **G1 tagging recall** (`nse_tickers` was ~1.7% pre-V2-031b); the IC-weighting handles a
sparse column (it just carries low weight until dense), exactly as `ear_drift` did in v1.

**B2. Run the v1↔v2 ablation (per [[exp19_brief]] §3.7).** Hold **everything fixed** — same universe, dates,
walk-forward splits, gates, cost — and change **only** the sentiment column:
- v1 = `price_momentum, ear_drift, bulkdeal_intensity` (the [[Exp19]] baseline, re-run for an apples-to-apples
  reference).
- v2 = v1 + `sentiment`.
- Compare **OOS composite IC** and **net spread @250bps**; require sentiment's **drop-one-out contribution > 0**
  on walk-forward. Two checks must agree (§3.7).

### 3.x `--selftest`
Calibration side: assert the AUC/Spearman estimator recovers a known-good vs known-noisy synthetic labeling.
Ensemble side: reuse the Exp19 harness `--selftest` (already passing).

---

## 4. Potential traps & caveats (locked in advance)

1. **Over-fixing the bias (the headline trap) — CONFIRMED by A1.** The bias is not only moot for a
   cross-sectional rank (z-score removes the offset), it is also **far smaller than the 88% premise** (A1: 35%
   positive, model-driven, well-dispersed). Effort spent centering would have been wasted. Spend it on
   **coverage** (G1) and on whether the column adds IC (B2). State this loudly.
2. **Gold-label circularity / leakage.** Don't label with the same model being scored; don't let any gold
   headline's future return leak into the label. Spot-check by a human.
3. **Look-ahead in the sentiment timestamp.** Headlines after the rebalance close must not enter that date's
   column. Use a strict `< d` cutoff (mirror the Exp18/19 entry discipline).
4. **Coverage/sparsity (G1) — CONFIRMED the binding constraint by A1.** Per-ticker sentiment is only as broad
   as `nse_tickers` tagging AND as the share of rows scored. A1 found **402 tagged+scored rows over two
   months** (`nse_tickers` 4.4%, `nse_tickers_v2` 0%, only 4.2% of rows scored at all) → **no per-day
   cross-section, no history**. Part B is **"untestable yet," not "null,"** until G1 widens tagging and scoring
   coverage. This couples Exp20 to **G1** (the latency feeder's gate too).
5. **Headline-only signal.** FinBERT scores headlines, not bodies — coarse. A real limitation, not fixable
   here; note it.
6. **Survivorship / universe** — inherited from Exp19.

---

## 5. Execution plan & next steps

1. **A1 diagnosis** — ✅ **DONE 2026-06-08**, `scripts/research/check-sentiment-calibration.mjs` (read-only).
   Verdict: G6 is not the ensemble blocker; coverage is. **A2–A4 deferred** (run Part B on raw scores). §1.1.
2. ~~**A2 gold set**~~ — **DEFERRED** unless Part B shows raw sentiment *mis-orders* (only A4(iii) re-ordering
   would then matter). Spec retained in §3 A2–A4 for if/when that happens.
3. **Unblock coverage first (gates Part B)** — this is now the critical path, and it is **G1's job, not
   Exp20's**: (a) deploy the V2-031b/c tagging so `nse_tickers_v2` populates + backfill history; (b) widen the
   share of the firehose that gets scored at all (4.2% today). Re-run A1 to confirm the cross-section is dense
   enough before building the panel column.
4. **B1** — extend `build-xs-panel.mjs` with the `sentiment` column (per-ticker daily mean, as-of d, raw
   scores). Expect to gate on step 3's coverage.
5. **B2** — `exp19-xs-ensemble.mjs --columns=price_momentum,ear_drift,bulkdeal_intensity,sentiment` vs the v1
   baseline; run the §3.7 ablation; generate the HTML report (`--html`) for both versions.
6. **Report** `wiki/experiments/Exp20.md`; append H20a/b to the playbook register.

**Downstream (only if SUPPORTED):** changing the *production* scorer (e.g. swap to a better model in
`_sentiment-chain.mjs`) is a **James prod task**, separate from this research-lane experiment — Exp20 proves
whether it's worth it before any prod change.

> **Decisive framing:** this is the experiment that tells us if SachNetra's unique data earns its keep in the
> cross-section. If H20b is ❌ (and the later G1 latency feeder is too), edge-hunt §3 is refuted and the
> alt-data nowcasting moat (dataset-of-record, [[positioning_v2]] §7) becomes the standing strategy — a strong
> outcome, not a defeat.

---
*Pre-registered design only. It does not claim sentiment helps — it specifies how we'd prove or refute it,
calibrated for ranking (not centering), walk-forward, net of cost, with the drop-one-out check ensuring the
column adds value beyond momentum. Built on [[Exp19]] + [[2026-06-06_edge-hunt-where-alpha-could-still-live]]
§3 and the [[Exp3]] G6 finding.*
