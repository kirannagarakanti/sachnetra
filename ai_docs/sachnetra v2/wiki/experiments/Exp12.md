---
tags: [experiment, sachnetra, research, quant-finance, cointegration, pair-trading, engle-granger, mean-reversion, pre-registered]
source: [[sachnetra_research_playbook]]
experiment_id: Exp12
status: COMPLETE
authored_date: 2026-05-28
run_date: 2026-05-28
verdict: 🟡 PROMISING
audience: Lijo, James, future Claude Code sessions
---

# Experiment 12 — Are there cointegrated, tradeable Nifty-50 pairs?

> Part of the SachNetra quant research program. Method philosophy in
> [[sachnetra_research_playbook]]. This is a **parallel research track** to the
> Exp 4 / Exp 10 / Exp 11 *latency* thesis — a **different edge entirely**
> (pair mean-reversion, not filing lead-time). Decided as a deliberate parallel
> track by Lijo (2026-05-28) per the NPTel follow-up checklist §C4.

This doc is **pre-registered**: hypothesis, thresholds, interpretation rules, and
caveats are locked in §1 / §5 / §9 *before* running the script. Results in §6–8 are
added after Lijo runs it against prod.

---

## 1. Hypothesis (locked before looking)

**H12 (existence):** *At least one economically plausible, same-sector Nifty-50 pair is
**cointegrated** on daily log prices over the `research_prices` history* — Engle-Granger
two-step: OLS of one log-price on the other, then ADF on the residuals **without
deterministic terms**, rejecting the unit-root null at p<0.05 using **Engle-Granger
critical values** (not standard Dickey-Fuller — the residual is estimated, so the
distribution shifts; see §3.3).

**H12b (tradeability):** *The passing pair(s) mean-revert **out-of-sample*** — on the
held-out last 30% of dates, using the in-sample β / μ / σ frozen, the spread has a
**half-life in 5–60 trading days** AND reverts toward the mean (|z| shrinks within 5
trading days) on **>55%** of the |z|>2 entry signals.

**Why two hypotheses:** H12 is the textbook statistical claim (is there a rubber band?).
H12b is the only one that matters for "be your own first customer" (can you *trade* the
rubber band on data the model has never seen?). A pair can pass H12 and fail H12b — that
is the difference between a statistical artifact and a strategy.

### Pre-registered success thresholds (no moving the goalposts)

| Outcome | Trigger |
|---|---|
| ✅ SUPPORTED | ≥1 **Tier-A** pair passes EG residual-ADF at 5% (EG critical values) **AND** OOS half-life ∈ [5, 60] trading days **AND** OOS reversion rate > 55% at \|z\|>2 |
| 🟡 PROMISING | In-sample EG pass, but OOS weak (reversion ≤ 55%) **or** half-life outside [5, 60] |
| ❌ NULL | Zero Tier-A pairs pass the in-sample EG test |
| 🚩 SUSPECT | A pass is driven by a **single structural break** (merger / index rebalance / regime shift) — the residual-ADF collapses once the break date is excluded. Name the date. |

---

## 2. Why this experiment

The latency thesis ([[Exp4]] → [[Exp10]] → [[Exp11]]) is **gated** on news ticker-tagging
coverage ([[exp11_brief]] §3 — V2-031b just shipped; coverage re-measure pending). While
that gate clears, this is a **decision-grade experiment on data we already own** that needs
**no tagging at all**: just `research_prices` daily bars for the Nifty-50.

Pair trading via cointegration is a **well-trodden, viable strategy** (NPTel §13 — the
HDFC/ICICI canonical setup; `WHAT_I_LEARNED.md` §19.C calls it "engineering, not research").
It is a **different edge** from latency:

| | Latency thesis (Exp 4/10/11) | Cointegration (Exp 12) |
|---|---|---|
| Edge | Being earliest to a corporate *fact* | A statistical *rubber band* between two stocks |
| Signal | Filing → price lead time | Spread deviation from long-run equilibrium |
| Data | filings + news tags + intraday prices | daily prices only (no tagging) |
| Status | gated on G1/V2-031b | unblocked now |

They do not compete for the same data and they fail independently. If Exp 12 fires
SUPPORTED, SachNetra has a candidate paper-tradeable strategy **regardless of how the
latency thesis resolves**. If it fires NULL, we've spent one cheap script to close a
named hypothesis — and the latency track is untouched.

> **Positioning note:** this is consistent with [[positioning_v2]] "be your own first
> customer." A cointegration edge is tradeable on own capital with the same paper-trade
> → live ramp as the latency edge. It does **not** replace Exp 11; it runs beside it.

---

## 3. Method

### 3.1 Data inputs
- **Prices:** `research_prices` daily bars — `SELECT symbol, trade_date, adj_close` for the
  `shared/market-taxonomy.json` `nifty50_registry` tickers (`*.NS` suffix). Convert to log
  price `p = ln(adj_close)`.
- **Pairing:** inner-join the two legs on `trade_date`; require **≥ 500 overlapping days**
  or the pair is skipped (too short to test). Legs with no rows (e.g. `TATAMOTORS.NS` —
  Yahoo 404, data-gap G5) are skipped with a logged warning, never silently zeroed.

### 3.2 The two universes
- **Tier A (~16 same-sector pairs — the HEADLINE):** economically plausible pairs where a
  cointegration relationship is *a priori* defensible (same sector, same demand drivers).
  These carry the H12 verdict. Reported **raw** (each judged on its own EG statistic) with
  an FDR note.
- **Tier B (all ~1,225 unique Nifty-50 pairs — APPENDIX CSV only):** the full scan, used
  only for the **multiplicity** check — how many pairs pass by chance vs. signal — and the
  Benjamini-Hochberg FDR control. Not interpreted pair-by-pair.

**Tier A pairs (locked):**

| Sector | Pairs |
|---|---|
| Banking | HDFCBANK/ICICIBANK, HDFCBANK/KOTAKBANK, ICICIBANK/AXISBANK, SBIN/ICICIBANK, HDFCBANK/AXISBANK |
| Steel/Metal | TATASTEEL/JSWSTEEL, TATASTEEL/HINDALCO |
| Auto | M&M/MARUTI, M&M/BAJAJ-AUTO, TATAMOTORS/MARUTI |
| Pharma | SUNPHARMA/DRREDDY, CIPLA/DRREDDY, SUNPHARMA/CIPLA |
| IT | TCS/INFY, INFY/WIPRO, TCS/HCLTECH |

### 3.3 Engle-Granger two-step (ep39 §1)
1. **Stationarity of each leg.** ADF on each log-price (constant, no trend). Both legs
   should be I(1) (non-stationary in levels) for EG to apply — document the t-stats.
2. **Cointegrating regression.** In-sample OLS `p1 = α + β·p2 + ε`. Extract residual `ε`.
3. **Residual unit-root test.** ADF on `ε` **with no constant and no trend** (the
   cointegrating regression already absorbed the mean). Lag order chosen by AIC up to a
   Schwert-style cap.
4. **Critical values.** Compare the residual-ADF t-stat to **Engle-Granger** critical
   values (N=2 variables, constant), **not** standard DF — because `ε` is estimated, the
   null distribution shifts left:

   | Significance | EG critical value (N=2, constant, asymptotic) |
   |---|---|
   | 1% | −3.90 |
   | 5% | **−3.34** |
   | 10% | −3.04 |

   *(MacKinnon Engle-Granger surface; matches ep39's note that std DF values are invalid
   for estimated residuals. ~−3.34 at 5% for n≈250; we use the asymptotic values given
   n≫250.)* **Pass = residual-ADF t < −3.34.**

### 3.4 Half-life of mean-reversion
On the in-sample residual, OLS `Δε_t = a + λ·ε_{t-1}`. **Half-life = −ln(2)/λ** trading
days (defined only when λ<0). Reported for every pair; the [5, 60]-day band is the H12b gate.

### 3.5 Out-of-sample test (the look-ahead guard)
Chronological **70/30 split**. Freeze `α, β` (from the IS cointegrating regression) and the
IS residual mean `μ` and sd `σ`. On the OOS dates:
- `ε_oos = p1 − (α + β·p2)`; `z = (ε_oos − μ)/σ`.
- **Entry signals:** dates with `|z| > 2`.
- **Reversion success:** the spread moves *toward* the mean within 5 trading days
  (`|z_{t+5}| < |z_t|`, same sign — i.e. it shrank, didn't blow through).
- **OOS reversion rate** = successes / signals. The >55% bar is the H12b gate.
- OOS half-life recomputed on the OOS residual; also must land in [5, 60].

Freezing IS parameters and only ever using them forward on OOS dates is the look-ahead
defence — no future information enters the spread or the z-score.

### 3.6 Multiplicity (Benjamini-Hochberg FDR)
Scanning ~1,225 Tier-B pairs, ~5% (~61) pass at the 5% level **by chance alone**. So:
- Report Tier-B **count passing 5%** vs. **expected-by-chance (~61)** — the intuitive check.
- Apply **Benjamini-Hochberg** at q=0.10 to the Tier-B approximate p-values; report how many
  survive FDR. *(p-values for the EG residual-ADF are approximate — see §9; the authoritative
  Tier-A decision is the critical-value comparison, FDR is the multiplicity caveat.)*
- **Tier A is reported raw** (each pair pre-specified on economic grounds, so it is not part
  of the blind scan) **with an FDR note** stating whether each would also survive Tier-B FDR.

### 3.7 Structural-break flags
A cointegration "pass" can be a single regime shift masquerading as a rubber band. The script:
- Annotates **known breaks**: HDFC twins merger (~2023-07; any pair with `HDFCBANK`), and
  flags pairs whose residual shows a large level shift.
- Reports the **date of the largest single-step jump** in each pair's residual as a candidate
  break, and re-runs the residual-ADF **excluding a window around it**; if the pass collapses,
  the pair is tagged 🚩 SUSPECT (§5).

---

## 4. Commands

```bash
# Self-test first (no DB) — validates the estimator on synthetic series. Anyone can run.
node scripts/research/exp12-cointegration-pairs.mjs --selftest

# Full run (read-only; emits HTML + CSVs). Lijo runs against prod.
node scripts/research/exp12-cointegration-pairs.mjs

# Headline-only (Tier A) / windowed / single-pair deep-dive / custom split
node scripts/research/exp12-cointegration-pairs.mjs --tier=A
node scripts/research/exp12-cointegration-pairs.mjs --from=2015-01-01
node scripts/research/exp12-cointegration-pairs.mjs --pair=HDFCBANK.NS,ICICIBANK.NS
node scripts/research/exp12-cointegration-pairs.mjs --split=0.7
```

Open `scripts/research/output/exp12/exp12_report.html` in a browser — that is the **visual
verdict** (spread "rubber-band" charts + a colour-coded verdict banner).

---

## 5. Pre-registered interpretation rules

| Result pattern | Verdict | Next step |
|---|---|---|
| ≥1 Tier-A pair: EG pass (t<−3.34) AND OOS half-life ∈ [5,60] AND OOS reversion >55% | ✅ SUPPORTED | Author the pair-trading paper-trade rule (entry \|z\|>2, exit \|z\|<0.5, stop, size) — a future "Exp" number; this is the cointegration analogue of the latency paper-trade |
| Tier-A in-sample EG pass but OOS weak / half-life out of band | 🟡 PROMISING | Keep the pair on a watchlist; re-run as history extends. Do not paper-trade yet. |
| Zero Tier-A pairs pass in-sample EG | ❌ NULL | Log H12 dead. Cointegration is not a near-term edge on this universe; proceed to Exp 13 (Hurst) |
| A pass collapses when its largest-jump date is excluded | 🚩 SUSPECT | Downgrade one tier; document the break date. A merger/rebalance, not a tradeable band. |

---

## 6. Data reality (run 2026-05-28)

| Fact | Value |
|---|---|
| Registry tickers priced ≥500 days | 45 of 46 (TATAMOTORS.NS skipped — Yahoo 404, gap G5) |
| Tier-A pairs tested (≥500 overlapping days) | 15 of 16 |
| Tier-A pairs skipped | TATAMOTORS/MARUTI (TATAMOTORS.NS <500 days) |
| Tier-B pairs scanned | 1,035 |
| `research_prices` span | 2009-01-01 → 2026-05-21 (per-pair overlap up to ~4,000 days) |
| Split | 70% in-sample / 30% out-of-sample, chronological |

---

## 7. Results (run 2026-05-28 — verbatim)

### 7.1 Tier-A headline table

| pair | sector | EG t | cointegrated (t<−3.34)? | OOS half-life (d) | OOS reversion | OOS signals |
|---|---|---|---|---|---|---|
| HDFCBANK/KOTAKBANK | banking | **−4.97** | ✅ | 58 | 52% | 692 |
| TATASTEEL/HINDALCO | metal | **−4.41** | ✅ | 32 | 50% | 1114 |
| M&M/MARUTI | auto | **−3.86** | ✅ | 886 | 51% | 699 |
| M&M/BAJAJ-AUTO | auto | **−3.41** | ✅ | 240 | 53% | 688 |
| INFY/WIPRO | it | −3.22 | ❌ | 116 | 56% | 147 |
| HDFCBANK/ICICIBANK | banking | −3.20 | ❌ | 282 | 49% | 1170 |
| SBIN/ICICIBANK | banking | −3.01 | ❌ | 305 | 46% | 739 |
| CIPLA/DRREDDY | pharma | −2.93 | ❌ | 113 | 51% | 1004 |
| TCS/HCLTECH | it | −2.62 | ❌ | 777 | 41% | 244 |
| HDFCBANK/AXISBANK | banking | −2.52 | ❌ | 230 | – | 0 |
| ICICIBANK/AXISBANK | banking | −2.36 | ❌ | 126 | 48% | 1282 |
| TATASTEEL/JSWSTEEL | metal | −2.32 | ❌ | 142 | 48% | 1194 |
| TCS/INFY | it | −2.23 | ❌ | 70 | 47% | 1184 |
| SUNPHARMA/DRREDDY | pharma | −2.05 | ❌ | 185 | – | 0 |
| SUNPHARMA/CIPLA | pharma | −1.83 | ❌ | 46 | 68% | 34 |

4 of 15 pairs are cointegrated in-sample at EG 5%. **None** clears H12b (OOS half-life ∈ [5,60] AND reversion >55%): reversion sits at coin-flip (~46–53%) with very large |z|>2 signal counts, and the two M&M pairs have multi-year OOS half-lives. (SUNPHARMA/CIPLA's 68% is on n=34 signals and isn't cointegrated, t=−1.83 — ignore.)

### 7.2 Tier-B multiplicity (1,035 pairs)

- Passing raw EG 5%: **179** vs **~52 expected by chance** → cointegration is **~3.4× more common than chance** (real aggregate structure).
- **BH-FDR survivors (q=0.10): 0** — no individual pair is extreme enough (p≲1e-4) to clear correction over 1,035 tests. Cointegration here is **broad but marginal**, not concentrated in a few rock-solid pairs. (Approximate p-value tail is conservative — §9 — but even an exact p for the best pair, t=−4.97 ⇒ p≈0.002, fails the rank-1 BH threshold of ~9.7e-5.)

### 7.3 Structural-break flags

No SUSPECT (🚩) flags fired — none of the four EG-passers collapsed when the window around their largest residual mean-shift was dropped. The HDFCBANK pairs carry the known 2023-07 HDFC-merger annotation but did not trip the drop-test.

---

## 8. Interpretation (run 2026-05-28)

**Verdict per §5: 🟡 PROMISING.** ≥1 Tier-A pair is cointegrated in-sample; none is OOS-tradeable.

- **Cointegration exists but doesn't survive forward as a snap-back.** The four EG-passers (HDFCBANK/KOTAKBANK best, t=−4.97) have a genuine in-sample equilibrium, but OOS the spread **drifts**: 5-day reversion is ~50% (coin-flip) and |z|>2 fires on a huge fraction of OOS days (688–1,282) — the signature of a spread that wandered off its in-sample mean and stayed there, not one that oscillates around it. M&M/MARUTI and M&M/BAJAJ-AUTO also have OOS half-lives (886d, 240d) far outside the 5–60d band.
- **Best candidate: HDFCBANK/KOTAKBANK** — OOS half-life 58d (just inside band) + 52% reversion (just under the 55% bar). The only pair close to tradeable; worth re-checking as `research_prices` extends.
- **Aggregate yes, individual no.** 179-vs-52 says cointegration is real across the universe; 0 BH-FDR survivors says no single pair is strong enough to bet on after honest multiplicity correction.
- **Cross-check with [[Exp13]]:** index-level Hurst shows Nifty mean-reverting only 0.1% of the time. Both experiments point the same way — **mean-reversion is hard to harvest on this universe right now.**
- **Next step (§5 PROMISING row):** park the 4 EG-passers on a watchlist; **do not paper-trade**. Re-run as history extends. Do **not** pivot the program to pair-trading on this evidence. H12 logged.

---

## 9. Caveats & traps (locked in advance; mapped to playbook checklist)

- **Spurious regression (the canonical silent failure).** Regressing two non-stationary
  series gives a fake-significant slope with high R² (`WHAT_I_LEARNED.md` §13). The defence
  *is* the experiment: we only believe the relationship if the **residual is stationary**
  (the EG residual-ADF). A high R² with a non-stationary residual = spurious, reported as
  NULL for that pair.
- **Estimated-residual distribution.** ADF on an OLS residual does **not** follow standard
  DF critical values — using DF values would over-reject. We use Engle-Granger critical
  values (§3.3). This is the single most common way a naive pair-trading scan fools itself.
- **Look-ahead.** β/μ/σ are frozen from in-sample and only applied forward to OOS dates
  (§3.5). The z-score never sees future data.
- **Multiple testing.** ~1,225 Tier-B pairs → ~61 chance passes at 5%. Handled by the
  expected-vs-observed count and BH-FDR (§3.6). Tier A is pre-specified, so it is not part
  of the blind scan, but we still report whether each Tier-A pair would survive FDR.
- **Approximate p-values.** The Tier-B p-values fed to BH are an **approximation** of the EG
  residual-ADF distribution (monotone interpolation across the EG critical points), used for
  ranking/multiplicity only. The **authoritative pass/fail is the critical-value comparison**
  (t < −3.34). Documented in the script header.
- **Structural breaks / non-stationary cointegration.** A merger (HDFC twins, 2023-07) or
  index rebalance can create a one-time level shift that the EG test reads as "the residual
  reverted." The break-flag + drop-window re-test (§3.7) catches this → 🚩 SUSPECT.
- **Survivorship.** `research_prices` holds the *current* Nifty-50. Pairs that blew up or
  got delisted are absent — the surviving pairs are a favourable sample. A real strategy
  needs a point-in-time universe (data-gap; out of scope here). Reported as a ceiling, not
  fixed.
- **Transaction costs.** The OOS reversion test is gross. Round-trip cost on a large-cap
  pair (2 legs × [STT + brokerage + impact]) is material; a 55% gross reversion rate is not
  automatically net-profitable. Net-of-cost sizing is the downstream paper-trade step, not
  this experiment.
- **Stationarity preflight (playbook §B4).** Each leg is ADF-tested before the pairing — if a
  leg is already stationary in levels, EG does not apply and the pair is flagged.

---

## 10. Outputs & artifacts

- **Code:** `scripts/research/exp12-cointegration-pairs.mjs` (read-only; pure Node, no new
  deps; Claude authors, Lijo runs).
- **Visual report:** `scripts/research/output/exp12/exp12_report.html` — the primary
  human-readable deliverable (verdict banner + spread charts + tables).
- **CSVs:** `exp12_tierA.csv` (headline pairs, full stats), `exp12_tierB_allpairs.csv`
  (full scan for the FDR appendix).
- **Hypothesis Register:** row H12 to be logged in [[sachnetra_research_playbook]] post-run.

### H12 Hypothesis-Register row template (fill after §7)

```
| H12 | YYYY-MM-DD | ≥1 same-sector Nifty-50 pair cointegrated (EG) + OOS-tradeable (half-life 5-60d, reversion>55%) | research_prices daily, nifty50_registry, Tier-A n=16 pairs, ≥500 days | Engle-Granger two-step (OLS levels → ADF residuals, EG crit) + OOS frozen-β z-score reversion + BH-FDR on Tier B | (TBD: passing pairs, t-stats, half-lives, reversion rates) | OOS 70/30; survivorship + tx-cost caveats | (TBD verdict per §5) | (TBD next step) |
```

---

## 11. Reproducibility

Deterministic given the same DB snapshot, **except** `research_prices` extends daily, so a
later run includes more recent bars (and a later OOS window). Re-run protocol: `--selftest`
must always pass (estimator sanity); then the full run; compare §7 Tier-A to the prior run
and flag any pair that crosses the EG threshold or changes verdict.

The `--selftest` builds a synthetic cointegrated pair (shared random walk + stationary AR(1)
spread) and a synthetic independent-random-walk pair, and asserts the script flags the first
as cointegrated and the second as not — a validated-estimator gate in the spirit of [[Exp9]].

---

## 12. Next experiment

- **If §5 fires SUPPORTED →** define the pair-trading paper-trade rule (entry/exit/stop/size)
  and run it forward — the cointegration analogue of the latency paper-trade. New Exp number
  when authored.
- **Regardless of verdict → Exp 13 (Hurst rolling regime)** is the next item in the locked
  research queue (NPTel §C2): does Nifty drift between trending and mean-reverting regimes?
  That gates *when* a mean-reversion strategy (like a cointegration pair) is deployable.
- **Append H12 to the Hypothesis Register** ([[sachnetra_research_playbook]]) either way.

---

## 13. Cross-experiment context

| Exp | Status | Relevance to Exp 12 |
|---|---|---|
| [[Exp1]] | ❌ dead | FII direction null — unrelated edge; shares the OOS-split discipline |
| [[Exp4]]/[[Exp10]]/[[Exp11]] | gated | The *latency* thesis Exp 12 runs in parallel to (different edge) |
| [[Exp9]] | ❌ null confirmed | Precedent for the validated-estimator (`--selftest`) discipline used here |
| Exp 13 (planned) | next in queue | Hurst regime — gates *when* mean-reversion (this pair edge) is deployable |

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-28 | Pre-registered. H12 (existence) + H12b (OOS tradeability), success thresholds (§5), Engle-Granger method with EG critical values (§3.3), OOS frozen-β reversion test (§3.5), BH-FDR multiplicity (§3.6), structural-break flags (§3.7), and the full caveat/trap list (§9) all locked **before** running. Decided as a parallel track to the Exp 11 latency thesis (NPTel §C4; Lijo 2026-05-28). Script + visual HTML report authored alongside; results (§6–8) pending Lijo's prod run. |
