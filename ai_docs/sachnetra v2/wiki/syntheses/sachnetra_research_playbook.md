---
tags: [synthesis, sachnetra, research, quant-finance, validation, methodology, agent-context]
source: [[sachnetra_quant_pivot]], [[sachnetra_quant_roadmap]], [[cluster_story_entity_architecture]]
last_updated: 2026-05-22
audience: Lijo, James, future Claude Code sessions
---

# SachNetra Research Playbook
*The missing fourth doc. The pivot doc says "the quant system is the proof of value" — this doc is **how you actually prove it.** Everything else in the stack is about **collecting** data. This is about **validating** that the data you collect predicts anything.*

---

## Where this sits in the doc stack

```
sachnetra_quant_pivot.md       WHY   — the business, Products A/B/C
sachnetra_quant_roadmap.md     WHAT  — which collectors to build, in what order
cluster_story_entity_architecture.md   HOW (data flows in)
sachnetra_research_playbook.md (this) PROOF — does the collected data work?   ← the gap
```

Build roadmap = James's lane. This doc = **Lijo's lane**: turning the data already in PostgreSQL into validated signals, using the econometrics from the NPTEL series. You can run most of this **today**, on data you already have, without waiting on any new collector.

---

## The core idea (read this even if you read nothing else)

> A data point is worthless until you've shown it predicts something **out of sample**.
> Collecting more data types is *not* research. Proving one signal works *is*.

You already have the right data. The Gemini "what data to collect" list is solved — your roadmap covers it in 10× the depth. The unsolved question is the only one that matters:

**Does an FII outflow / a sentiment drop / an "auditor change" filing actually move the price — and could you have known *before* the move?**

Answering that one sentence, repeatedly, for each signal, is the entire job.

---

## The signal-validation loop

Every research session is one turn of this loop. Do not skip steps. Most fake "alpha" comes from skipping step 5.

```
1. HYPOTHESIS   Write ONE falsifiable sentence with a direction and a horizon.
                "FII net outflow today predicts a NEGATIVE Nifty return over the next 2 days."

2. DATA         Pull only the columns you need. Align timestamps to a daily grid.
                Mind the timezone: announcements are IST (+05:30); align to the IST trading day.

3. TEST         Start with the cheapest test that could kill the hypothesis:
                correlation → simple regression → event study → ARIMA/GARCH.
                Don't reach for GARCH on day one.

4. VALIDATE     Split the data. Fit on the FIRST 70% of dates, test on the LAST 30%.
                A result that only exists in-sample is noise you fooled yourself with.

5. DOCUMENT     Append to the Hypothesis Register (below). Record what you tried,
                the number, and the verdict — INCLUDING the failures. Dead hypotheses
                are the most valuable rows in the register; they stop you re-running them.
```

The discipline that separates research from data-mining: **write the hypothesis down BEFORE you look at the result.** If you peek first and then write the hypothesis to fit, you've proven nothing.

---

## Experiment 0 — the prerequisite (do this first; nothing works without it)

**You have events but no queryable price series.** `india_institutional_flows`, `india_bourse_announcements`, and `india_news_signals` are all *event/signal* tables. To test "did the price move after the event," you need a **daily price series in a table you can SQL-join against event dates.** `seed-market-quotes.mjs` feeds the live UI — it is not a research-grade historical price store.

**The fix (a research-data task, not a prod collector — keep it in `scripts/research/`):**
- Pull daily OHLCV for **^NSEI (Nifty 50)** and the **Nifty 50 constituents** in `shared/market-taxonomy.json` from Yahoo Finance (free, daily history back ~20 years — covers your FII history from Dec 2009).
- Land it in a `research_prices` table: `(symbol, trade_date, open, high, low, close, adj_close, volume)`, PK `(symbol, trade_date)`.
- Compute daily **log returns** once and store them — every test downstream uses returns, not raw prices.

Until `research_prices` exists, every experiment below is blocked. This is the highest-leverage thing to build for *research* (distinct from the *product* collectors James owns).

> Per `feedback_v2_prod_execution`: I write these scripts; **you run them.** Research scripts read from prod but should write only to `research_*` tables (or a separate DB), never touch `india_*` signal tables.

---

## Your data → the NPTEL syllabus → a runnable experiment

This is the bridge. Each lecture topic becomes an experiment on a table you already have.

| NPTEL topic | Your table(s) | The experiment | "Pass" looks like |
|---|---|---|---|
| **Stationarity / ADF test** (pre-req for everything) | `india_news_signals.sentiment_score` daily mean | Is the daily-sentiment series stationary? ADF test. | p < 0.05 → stationary → safe to model directly. If not, difference it first. |
| **ARIMA** | daily mean sentiment | Does sentiment have memory? Fit ARIMA, check if AR terms are significant. | Significant AR(1) → yesterday's mood carries information. |
| **Event study** (your workhorse) | `india_bourse_announcements` + `research_prices` | For `category = 'auditor%'`, compute mean abnormal return over ±5 trading days around `announced_at`. | A clean, significant drop in the days *after* the filing = a real event signal. |
| **GARCH** | `research_prices` returns + `india_institutional_flows` | Do FII outflow spikes precede volatility *clusters* (not just direction)? | Lagged |FII net| improves a GARCH variance forecast. |
| **Multi-factor / APT** | announcements as 0/1 dummies + returns | Regress stock returns on event dummies (auditor change, pledge, board outcome). | A dummy with a significant, stable coefficient = a tradable factor. |
| **Extreme Value Theory** | sentiment + FII tails | Do the worst 1% sentiment days coincide with the worst Nifty days? | Tail co-occurrence well above chance = a crash early-warning candidate. |
| **Lead-lag / Granger causality** | `announced_at` vs `india_news_signals.published_at` | Do bourse filings lead the news by hours? (Product A's whole thesis.) | Filings systematically precede the matching headline = the latency edge is real. |

Watch a lecture → pick its row → run that experiment. That turns passive watching into research.

---

## The five experiments to run first (in order)

Sequenced by *cheapness-to-disprove* and by how load-bearing they are for your business thesis.

### Exp 1 — Does FII flow predict the next-day Nifty move?
- **Data:** `india_institutional_flows` (FII, cash segment, `net`) + `research_prices` (^NSEI return).
- **Test:** regress next-1-day and next-2-day Nifty log return on today's FII `net`. Then lag it the other way as a sanity check (does the Nifty predict FII? — if *that's* stronger, your signal is just a coincident indicator, not a leading one).
- **Why first:** you have 3,964 rows back to Dec 2009 (V2-017b). Longest, cleanest series you own. If *this* doesn't work, be very skeptical of everything noisier.

### Exp 2 — Do bourse announcements move prices? (event study)
- **Data:** `india_bourse_announcements` (17,322 rows) + `research_prices` for the matching `symbol`.
- **Test:** event study, ±5 trading days, grouped by `category`. Rank categories by post-event abnormal return.
- **Why:** this is the empirical core of **Product A**. If "auditor change" / "promoter pledge" categories show a real post-filing drift, you have a sellable signal. If nothing moves, Product A's thesis needs a rethink *before* the OCR app gets built.

### Exp 3 — Is news sentiment a stationary, autocorrelated series? (ARIMA pre-flight)
- **Data:** `india_news_signals.sentiment_score`, daily mean.
- **Test:** ADF test → if stationary, fit ARIMA(p,d,q), inspect AR significance.
- **Why:** decides whether *any* time-series model on sentiment is even valid. Cheap, foundational, and directly exercises the early NPTEL lectures.

### Exp 4 — Does the bourse lead the newswire? (latency edge)
- **Data:** `india_bourse_announcements.announced_at` vs `india_news_signals.published_at`, matched by `symbol`/`companies`.
- **Test:** for matched events, distribution of (news time − filing time). Median > 0 by hours = edge confirmed.
- **Why:** the pivot doc claims "market reacts in minutes, journalists take hours." This *measures* that claim instead of asserting it. One of the most compelling slides you could put in front of a B2B pilot.

### Exp 5 — Do sentiment + flow tails line up with market shocks? (EVT teaser)
- **Data:** worst-decile sentiment days + largest FII-outflow days vs worst ^NSEI return days.
- **Test:** co-occurrence rate vs random baseline; later, fit a Generalized Pareto to the tail.
- **Why:** turns your OSINT/sentiment collection into a *risk* product, not just a *direction* product — a different and arguably easier sell.

---

## The traps that invalidate research (best-practices checklist)

These are why most retail "backtests" are fiction. Check every one before you believe a result.

- **Look-ahead bias** — using data you wouldn't have had at decision time. If FII flows for day T publish *after* market close on T, you cannot trade on them until T+1. Align to *availability* time, not *event* time.
- **Survivorship bias** — testing only on companies that still exist / are still in the Nifty. Delisted/bankrupt names are exactly where auditor-resignation alpha lives. Note this as a known limitation of any Nifty-50-only test.
- **Timezone drift** — `announced_at` is IST (+05:30); Yahoo prices are exchange-local. A naive UTC join silently misaligns a whole trading day. Pin everything to the IST trading calendar.
- **Multiple-testing / p-hacking** — test 20 hypotheses, ~1 looks "significant" at p<0.05 by pure chance. The Hypothesis Register (logging failures too) is your defense: it shows how many shots you took.
- **In-sample only** — covered above. Always hold out the last 30% of dates.
- **Tiny-N event studies** — 6 "auditor change" filings is a story, not statistics. Note the N on every event-study result; be loud when it's small.
- **Non-stationarity** — running correlation/regression on a trending (non-stationary) series produces confident nonsense. ADF first (Exp 3 exists for this reason).

---

## Hypothesis Register (the living output of all research)

Append one row per experiment. **Log failures** — they're the most valuable rows. This is the artifact that compounds; in a year it's a moat (it's literally the R&D log a Product C buyer or a WorldQuant relationship would want to see).

| # | Date | Hypothesis (direction + horizon) | Data used | Test | Result (number) | In-sample? Out-of-sample? | Verdict | Notes / next |
|---|---|---|---|---|---|---|---|---|
| H1 | 2026-05-22 | FII net flow on T predicts same-sign ^NSEI return, T+1 | `india_institutional_flows` FII cash (n=3965) + ^NSEI | OLS, no look-ahead | corr 0.009, p=0.55, hit-rate 51.0% | out-sample p=0.92 — nothing either side | ❌ dead | No next-day predictive power. Don't retry the naive level→return form. |
| H1b | 2026-05-22 | FII net flow on T predicts return over T+1..T+2 | same | OLS, no look-ahead | corr −0.004, p=0.79, hit-rate 49.8% | slope sign FLIPS in→out (+→−) | ❌ dead | Sign instability = pure noise. 2-day horizon doesn't rescue it. |
| H1c | 2026-05-22 | FII net flow is contemporaneous with ^NSEI (reverse/coincidence check) | same | OLS, same-day | corr 0.035, t=2.19, **p=0.028** | full-sample only | 🟡 real but tiny | FII is REACTING, not leading. R²=0.0012 → explains ~0.1% of same-day move. Statistically sig (large n) but economically negligible. Confirms the leading signal lives elsewhere → Exp 2. |
| — | 2026-05-22 | (DII variant of H1) | `india_institutional_flows` DII | — | **n=31 only** | — | ⬜ blocked | DATA GAP, not a market fact: DII flow is effectively un-collected (~31 rows vs ~3,965 FII). Flag to James before any DII research. |
| H2 | 2026-05-22 | NSE announcements produce abnormal returns around the filing (PRE/DAY0/POST ±5d) | `india_bourse_announcements` + `research_prices` (Nifty-50) | market-adjusted event study | DAY0 +0.48% t=3.08 (n=205); POST +0.39% t=1.70 | full only — too little history to split | ⬜ inconclusive | Same-day pop is real-ish; post-drift marginal. Category-level UNTESTABLE: per-category N=10–19. Data-limited, not signal-negative. Full write-up [[Exp2]]. |
| H2-mgmt | 2026-05-22 | "Management change" filings → positive post-drift | same, mgmt_change bucket | event study | POST +2.20% t=2.03 (**) but **n=10** | — | ❌ disregard | N=10 anecdote, survivorship-biased, 1 month. Logged so it isn't mistaken for alpha later. |
| H4 | 2026-05-22 | NSE filing (announced_at) PRECEDES the matching news headline (published_at) per company | `india_bourse_announcements` + `india_news_signals` (nse_tickers, published_at), n=239 | paired timestamp delta + sign test, ±48h match | 60.3% news-after, median +0.22h (~13min), sign-test **p≈0.002**; scraped_at 66.7%, p<0.001 | robust across both time bases + all category buckets (no train/test split — distribution, not a predictive model) | 🟡 supported (modest, gated) | **FIRST leading signal in the program** (leads the *newswire*, not price). BUT: median only ~13min; 40% of pairs are news-BEFORE (matching noise); large-cap-ONLY because just ~1.7% of news is ticker-tagged — and large-caps are where the wire is fastest, so this is the FLOOR. Fixed a `.NS`-suffix join bug (first run=0). Valuable mid/small-cap version blocked on tagging coverage → James. Full write-up [[Exp4]]. |
| — (Exp 5) | 2026-05-22 | (sentiment+FII tails co-occur with ^NSEI shocks — EVT) | — | — | NOT RUN | — | ⏸ deferred | DEFERRED, not a result: sentiment series 16 pts (no tail); FII arm redundant with H1c coincidence. Revisit as a real GPD study at ≥60–90 sentiment points (~Aug 2026). Full rationale [[Exp5]]. |
| H6 | 2026-05-22 | \|FII net flow\|_T predicts the MAGNITUDE of ^NSEI move on T+1 (volatility, not direction) | `india_institutional_flows` FII cash + ^NSEI, n=3965 | OLS \|flow\|→\|r\| & r², 70/30 split, decile + Welch contrasts, no look-ahead | full \|r\| corr 0.029 p=0.072; r² p=0.001; **OOS corr ≥ in-sample everywhere** (\|r\| H5 out corr 0.166) | ✅ holds (and STRENGTHENS) out-of-sample, both proxies + horizons | 🟡 supported (OOS-robust, modest R²) | **Variance ALIVE where direction (H1) was dead.** Real next-day VOL signal, survives OOS. R² small (<0.03) but tail/conditional effects meaningful. 2nd predictive signal in program (leads *vol*, not direction). Full write-up [[Exp6]]. |
| H6-asym | 2026-05-22 | FII OUTFLOW days precede MORE next-day volatility than inflow days | same | Welch two-sample t on next-day \|r\| | outflow 0.828% vs inflow 0.665% = **+24%**, t=6.64 (H1) / 8.77 (H5), **p<0.001** | consistent across both proxies + horizons | ✅ supported (unconditional) | Leverage / bad-news-clustering on Indian data. Real as a DESCRIPTION — but Exp 7 (H7) shows it is NOT incremental to GARCH. Read with H7. |
| H7 | 2026-05-22 | \|FII flow\|_{T-1} adds INCREMENTAL next-day vol-forecast power OVER a plain GARCH(1,1) (γ>0 in the variance eqn) | `india_institutional_flows` FII + ^NSEI, n=4263 | GARCH(1,1) vs GARCH-X, Gaussian QMLE (Nelder-Mead, warm-start), LR test + OOS predictive NLL/RMSE, no look-ahead | γ=−0.0019, **LR=0.77 p=0.38**, BIC worse, OOS Δ≈0; outflow-only OOS WORSE (Δ−7.72) | ❌ holds out-of-sample too (no gain either spec) | ❌ null (CONFIRMED) | **REINTERPRETS H6.** Once GARCH soaks up vol-persistence (α+β=0.989), \|FII flow\| adds NOTHING. Exp 6's OLS vol signal was largely the clustering it couldn't control for. Estimator validated: fixed self-test recovers γ (LR=21, p<1e-5). Full write-up [[Exp7]]. |
| H8a | 2026-05-22 | A negative ^NSEI return on T precedes higher vol on T+1 than a positive return (leverage effect) | `research_prices` ^NSEI, n=3947 | Welch (down vs up) + signed-return OLS on next-day \|r\| | down 0.791% vs up 0.688%, t=4.38, p<0.001; signed-slope −3.74e-4 t=−3.29 | full sample | ✅ supported (real but modest) | The confound exists — but P(down\|outflow) is only 50.0% vs 44.5% (inflow), a weak 5.5pp channel. Full write-up [[Exp8]]. |
| H8 | 2026-05-22 | Exp 6's FII-OUTFLOW→next-day-vol asymmetry survives controlling for the market's OWN return (i.e. it is NOT just the leverage effect) | `india_institutional_flows` FII + ^NSEI, n=3947 | nested OLS (outflow vs +\|r_T\|+downside), stratified Welch within up/down days, 70/30 split, no look-ahead | outflow coef shrinks only ~18% (t 6.99→5.83 ***); stratified DOWN t=5.16 / UP t=4.12 ***; OOS \|r\| t=2.89 ***; r² OOS t=1.49 (ns) | ✅ holds OOS on \|r\|; soft on r² | 🟡 supported (robustness check on H6-asym) | **Confound test, not a new signal.** The outflow asymmetry is NOT a leverage artefact — survives the own-return control + within both strata. NB the strong co-driver is own-move SIZE \|r_T\| (the persistence H7 nulls), NOT the leverage sign. Does NOT contradict H7 (different control: 1-lag own return vs full GARCH). Unifying test = GARCH-X + outflow term. Full write-up [[Exp8]]. |
| H9 | 2026-05-23 | **Replication of H7 on a validated estimator** — does \|FII flow\|_{T−1} add incremental next-day vol-forecast power over GARCH(1,1) (γ>0)? | `india_institutional_flows` FII + ^NSEI, n=4263 (identical to H7) | Same GARCH-X spec as H7 (Gaussian QMLE, Nelder-Mead, warm-start, LR + OOS NLL/RMSE, no look-ahead) BUT with the self-test rebuilt: spiky iid regressor replaces H7's smooth AR(1) `x` that was collinear with ω | γ=**−0.0019**, **LR=0.77 p=0.379**, BIC worse by 7.6, OOS Δ NLL +0.91 (negligible); outflow-only γ≈0, OOS −7.72 (X worse); post-2012 subsample γ=−0.0010, p=0.73; self-test recovers γ=0.154 from true 0.15 (**LR p=4.2e-5**) | ❌ both in-sample and OOS reproduce H7 to three sig figs; outflow + post-GFC subsamples also null | ❌ **null CONFIRMED on validated estimator** | **Closes the GARCH-X / flow→variance question for the symmetric-Gaussian GARCH(1,1) class.** Same numbers as H7, but now the null rests on a self-test that can actually identify γ when γ is real — so it's the estimator's verdict, not the H7 §8 identification artifact. H7 + H9 together = the program's definitive word that \|FII flow\| carries no incremental info about next-day ^NSEI variance over GARCH persistence. Only place a flow→variance link could still hide: richer model class (Student-t, GJR-EGARCH-X, intraday realized vol) — future H7/9b. Full write-up [[Exp9]]. |

**Verdict legend:** ✅ holds out-of-sample · 🟡 in-sample only / promising · ❌ dead (don't retry) · ⬜ untested/blocked

> **Data-layer gaps surfaced by experiments** are accumulated in
> `wiki/experiments/_data_gaps_backlog.md` (G1–G6 as of Exp 4). That doc is the **staging ground for
> the bundled implementation task** Lijo will author after running more experiments — append to it as
> each new experiment surfaces a gap, rather than filing a task mid-research.

---

## How to use Claude in a research session (so usage isn't wasted)

High-value, in rough order:
1. **Write the analysis scripts** — `scripts/research/event_study.mjs`, ADF/ARIMA harnesses — that you then run. Math → runnable code on your real rows.
2. **Translate a lecture you just watched** into its experiment row in the table above.
3. **Sanity-check a result** — "is this t-stat meaningful given N=14?" / "did I look-ahead bias myself here?"
4. **Survey a specific best practice** (event-study window choice, GARCH spec) when you hit it — narrow questions, not "explain all of quant finance."

Low-value (don't spend usage here): re-deriving the data-source list (done), generic "what is GARCH" explainers (the NPTEL series does this better), or anything that writes to prod `india_*` tables.

---

## Boundaries (inherited from CLAUDE.md + memory)

- Research scripts live in `scripts/research/`, read prod, write only `research_*` tables. Never modify `india_*` signal tables or any sacred file.
- Per `feedback_v2_prod_execution`: Claude authors scripts + read-only checks; **Lijo runs them** against the DB.
- The Redis/DB credentials in `.env.local` never leave the machine — not into Gemini, not into shared docs.

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-22 | Initial doc. Created as the fourth strategy doc (proof/validation layer) to fill the gap that pivot/roadmap/architecture are all collection-focused. Grounded in the live schemas in `migrate-india-signals.mjs`. Defined the signal-validation loop, Experiment 0 (price-series prerequisite), the NPTEL→table→experiment bridge, the first five experiments, the bias checklist, and the Hypothesis Register. |
| 2026-05-23 | Appended **H9** to the Hypothesis Register — validated-estimator replication of H7's GARCH-X test on \|FII flow\|→next-day variance. Run executed against prod 2026-05-23; reproduced H7 to three sig figs (γ=−0.0019, LR=0.77, p=0.38), outflow-only and post-2012 subsamples also null, fixed self-test recovers γ cleanly (LR p=4.2e-5). Verdict ❌ null CONFIRMED. H7 + H9 together close the GARCH-X / flow→variance question for the symmetric-Gaussian GARCH(1,1) class. |
