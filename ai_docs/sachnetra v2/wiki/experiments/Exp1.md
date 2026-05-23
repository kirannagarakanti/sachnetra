---
tags: [experiment, sachnetra, research, quant-finance, fii, validation]
source: [[sachnetra_research_playbook]]
experiment_id: Exp1
status: COMPLETE
run_date: 2026-05-22
verdict: ❌ DEAD (primary hypothesis) + 🟡 one tiny coincident effect + ⬜ DII blocked (data gap)
audience: Lijo, James, future Claude Code sessions
---

# Experiment 1 — Does FII flow predict the next-day Nifty move?

> Part of the SachNetra quant research program. Method defined in
> `[[sachnetra_research_playbook]]`. This is the first experiment run end-to-end
> after the price layer (Experiment 0) was built.

---

## 1. Hypothesis (written before looking at any result)

**H1:** *FII net flow on day T predicts a same-sign ^NSEI (Nifty 50) return over the next H trading days.* Net buying → market up; net selling → market down.

This is the single most repeated piece of Indian-market folk wisdom ("FIIs are selling, so the market will fall"). The experiment tests whether it is *predictively* true — i.e. whether **today's** flow tells you anything about **tomorrow's** move — using 17 years of data.

Falsifiable, with a direction (same-sign) and a horizon (next H trading days). Tested at H=1 and H=2.

---

## 2. Why this experiment first

- `india_institutional_flows` (FII cash) is the **longest, cleanest series SachNetra owns** — ~3,965 daily rows back to Dec 2009 (built in V2-017 / V2-017b).
- Logic from the playbook: *if the strongest, longest signal you own predicts nothing, be very skeptical of the noisier ones.* It calibrates expectations for everything downstream.
- It is the cheapest possible test of the "FII = alpha" assumption that underpins a lot of retail and even institutional narrative.

---

## 3. Data

| Series | Table | Columns used | Filter | Rows |
|---|---|---|---|---|
| FII daily flow | `india_institutional_flows` | `flow_date`, `net` (₹ crore) | `investor_type='FII'`, `segment='cash'` | ~3,965 |
| DII daily flow | `india_institutional_flows` | `flow_date`, `net` | `investor_type='DII'`, `segment='cash'` | **only 31** (see §8) |
| Nifty 50 price | `research_prices` | `trade_date`, `log_return` | `symbol='^NSEI'`, `log_return IS NOT NULL` | 4,264 bars (2009-01-02 → 2026-05-22) |

`research_prices` was populated by Experiment 0 (`scripts/research/backfill-research-prices.mjs`): **196,718 daily bars total**, ^NSEI + 47 Nifty-50 constituents, from Yahoo Finance. (`TATAMOTORS.NS` failed — Yahoo 404, ticker rename — irrelevant here since Exp 1 uses only the index.)

Aligned observations after pairing flow dates to forward returns: **n = 3,965** (H=1), **n = 3,964** (H=2).

---

## 4. Method

Script: `scripts/research/exp1-fii-predicts-nifty.mjs` (read-only — SELECTs only, writes nothing).

### 4.1 No look-ahead (the critical design choice)
FII net for day T is published only **after** T's market close. So the script never pairs flow_T with return_T as a *prediction*. Instead, for a flow on date T it sums the ^NSEI log returns over the next **H trading days strictly after T** (T+1 … T+H), found by binary search over the actual trading calendar (so weekends/holidays/gaps never misalign a day).

### 4.2 Three regressions run
1. **Predictive (the hypothesis):** forward return (T+1..T+H) regressed on FII net_T. OLS.
2. **Out-of-sample split:** fit on the first 70% of dates, test on the last 30%. A relationship that only exists in-sample is overfitting.
3. **Reverse / coincidence check:** *same-day* return_T regressed on flow_T. Diagnoses whether FII flow **leads** the market or merely **reacts** to it. (Independent of horizon.)

### 4.3 Statistics computed (pure Node, no deps)
- OLS slope, intercept, Pearson correlation, R²
- t-statistic on the slope; two-sided p-value via **normal approximation** of the t-distribution (accurate at these sample sizes, n in the thousands — see caveat §7)
- **Directional hit-rate:** fraction of days where sign(flow) matches sign(forward return); 50% = coin flip
- Significance markers: `*` p<0.10, `**` p<0.05, `***` p<0.01

---

## 5. Commands run

```bash
# Experiment 0 prerequisite (writes research_prices)
node scripts/research/backfill-research-prices.mjs --symbol=^NSEI --dry-run --from=2024-01-01   # smoke test
node scripts/research/backfill-research-prices.mjs                                              # full backfill

# Experiment 1
node scripts/research/exp1-fii-predicts-nifty.mjs                # FII, H=1 (default)
node scripts/research/exp1-fii-predicts-nifty.mjs --horizon=2    # FII, H=2
node scripts/research/exp1-fii-predicts-nifty.mjs --investor=DII # DII, H=1
```

---

## 6. Results (complete — nothing omitted)

### 6.1 FII, horizon = 1 trading day

**Predictive (flow_T → return_T+1):**
| Sample | n | corr | R² | slope | t | p | sig |
|---|---|---|---|---|---|---|---|
| Full | 3965 | 0.009 | 0.0001 | 4.31e-8 | 0.59 | 0.5521 | — |
| In-sample (first 70%) | 2775 | 0.016 | 0.0003 | 1.21e-7 | 0.86 | 0.3877 | — |
| Out-of-sample (last 30%) | 1190 | 0.003 | 0.0000 | 7.07e-9 | 0.10 | 0.9229 | — |

- Directional hit-rate: full **51.0%** (n=3961); in-sample 50.8%; out-of-sample 51.6%.

**Reverse / coincidence (flow_T vs return_T, same day):**
| n | corr | R² | slope | t | p | sig |
|---|---|---|---|---|---|---|
| 3947 | 0.035 | 0.0012 | 1.58e-7 | 2.19 | 0.0285 | ** |

**Verdict:** ❌ No significant *predictive* relationship.

### 6.2 FII, horizon = 2 trading days

**Predictive (flow_T → return_T+1..T+2):**
| Sample | n | corr | R² | slope | t | p | sig |
|---|---|---|---|---|---|---|---|
| Full | 3964 | −0.004 | 0.0000 | −2.73e-8 | −0.27 | 0.7904 | — |
| In-sample (first 70%) | 2774 | 0.009 | 0.0001 | 9.16e-8 | 0.46 | 0.6435 | — |
| Out-of-sample (last 30%) | 1190 | −0.024 | 0.0006 | −8.61e-8 | −0.84 | 0.4020 | — |

- Directional hit-rate: full **49.8%** (n=3964); in-sample 49.9%; out-of-sample 49.5%.
- **Slope sign flips** in-sample (+9.16e-8) → out-of-sample (−8.61e-8): a hallmark of noise, not signal.
- Reverse check: identical to §6.1 (n=3947, corr 0.035, t=2.19, p=0.0285) — reverse is horizon-independent.

**Verdict:** ❌ No significant predictive relationship; the longer horizon does not rescue it.

### 6.3 DII, horizon = 1 trading day

**Predictive (flow_T → return_T+1):**
| Sample | n | corr | R² | slope | t | p | sig |
|---|---|---|---|---|---|---|---|
| Full | **31** | 0.167 | 0.0279 | 5.56e-7 | 0.91 | 0.3616 | — |
| In-sample (first 70%) | 21 | 0.335 | 0.1121 | 1.16e-6 | 1.55 | 0.1214 | — |
| Out-of-sample (last 30%) | 10 | −0.153 | 0.0234 | −4.23e-7 | −0.44 | 0.6617 | — |

- Directional hit-rate: full **48.4%** (n=31); in-sample 52.4%; out-of-sample 40.0%.
- Reverse check: n=31, corr −0.046, t=−0.25, p=0.8060.

**Verdict:** ⬜ **Un-testable** — n=31 is far too small. This reflects a *data gap*, not a market fact (see §8). The in-sample corr of 0.335 looking "interesting" while out-of-sample is −0.153 is exactly what tiny-N noise looks like; ignore it.

---

## 7. Interpretation

1. **The folk wisdom is false at a tradable horizon.** Today's FII net flow carries essentially **zero** information about tomorrow's Nifty move (corr ≈ 0.01, p > 0.5, hit-rate ≈ 51% ≈ coin flip), and this holds out-of-sample. Confirmed across H=1 and H=2.

2. **FII flow is coincident, not leading.** The *only* statistically significant link is the **same-day** one (corr 0.035, p=0.028): FIIs net-buy on days the market is already up. They **react to / confirm** moves, they don't predict them. This matches the documented behaviour of Indian institutional flows and was the playbook's pre-registered expectation.

3. **The economic-vs-statistical-significance lesson (the most important takeaway).** That "significant" same-day result has **R² = 0.0012** — FII flow explains ~**0.1%** of the same-day move. It clears p<0.05 *only because n ≈ 4,000*; with that many observations even a trivially small correlation is "significant." **Statistically real ≠ economically useful ≠ tradable.** This is the single biggest way large datasets fool researchers, and Exp 1 is the canonical demonstration of it on our own data.

4. **Where the leading signal must therefore live:** not in FII *levels*. Candidates: bourse announcements (event-driven, Exp 2), news sentiment (Exp 3), and flow *tails/surprises* rather than levels (Exp 5 / future). The negative result actively points the research forward.

---

## 8. Caveats & limitations (read before citing this)

- **Form tested = raw daily level.** Only `net` level → return was tested. NOT tested (and still open as future hypotheses): extreme/tail flow days, cumulative or streak flows, flow *surprise* vs a rolling mean, flow standardized by recent volatility. "FII levels don't predict" does **not** mean "no FII-derived feature predicts."
- **Segment = cash only.** F&O / derivatives FII positioning not included.
- **Provisional vs final flows.** `india_institutional_flows` supersedes provisional with final values (V2-017 ON CONFLICT DO UPDATE), so the series is final-where-available; intraday provisional timing is not modelled.
- **p-values are normal-approximated**, not exact t-distribution. Immaterial at n in the thousands; would matter for the DII n=31 case (another reason to disregard DII here).
- **Index-level only.** ^NSEI used as the target. No single-stock FII attribution (FII flow is aggregate, not per-name).
- **Survivorship bias:** not a concern for this experiment (the index is survivorship-adjusted by construction). It *will* matter for single-stock event studies (Exp 2) since `research_prices` holds only current Nifty-50 names.
- **No transaction costs / no tradability test.** Even a real signal would need cost modelling before "tradable."

---

## 9. Outputs & artifacts

- **Hypothesis Register** (`[[sachnetra_research_playbook]]` §Hypothesis Register): rows **H1, H1b, H1c**, and the DII data-gap row logged 2026-05-22.
- **Code:** `scripts/research/exp1-fii-predicts-nifty.mjs` (read-only), `scripts/research/backfill-research-prices.mjs` (built `research_prices`).
- **Data:** `research_prices` table now permanent on Railway (196,718 bars) — reused by all future experiments.

---

## 10. Data gaps surfaced (action items)

| Gap | Detail | Owner / action |
|---|---|---|
| **DII flows barely collected** | ~31 DII rows vs ~3,965 FII rows in `india_institutional_flows`. DII research is impossible until backfilled. | **James** — check the V2-017 DII collection path. |
| `TATAMOTORS.NS` price missing | Yahoo 404 (post-demerger ticker rename). | Fix the symbol in `market-taxonomy.json` when single-stock work needs it. |

---

## 11. Reproducibility

**Prerequisites:** `DATABASE_URL`/`DATABASE_PUBLIC_URL` in `.env.local`; `research_prices` populated (run `backfill-research-prices.mjs` first).

**Re-run:** the three commands in §5. Results are deterministic given the same DB snapshot. `backfill-research-prices.mjs` is idempotent (`ON CONFLICT DO UPDATE`), so re-running it refreshes/extends the price series without duplication.

**Flags available on Exp 1:** `--horizon=N`, `--investor=FII|DII`, `--segment=cash`, `--index=^NSEI`, `--from=YYYY-MM-DD`, `--to=YYYY-MM-DD`, `--split=0.7`.

---

## 12. Next experiment

**Exp 2 — do NSE bourse announcements move prices? (event study).** Tests the *business* thesis (Product A): whether filing categories (auditor change, board outcome, promoter pledge) produce abnormal returns in the ±5 days around `announced_at`. Unlike FII levels, this is a genuine *leading*-signal candidate — and Exp 1's result (the lead is not in flows) is exactly what points us there. Data ready: 17,322 announcements in `india_bourse_announcements` + the price series just built.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Initial complete write-up. Documents all three runs (FII H=1, FII H=2, DII H=1), full result tables, interpretation, caveats, data gaps, reproducibility. |
