---
tags: [experiment, sachnetra, research, quant-finance, evt, tails, risk, deferred]
source: [[sachnetra_research_playbook]]
experiment_id: Exp5
status: DEFERRED — not worth running now (both arms blocked); revisit when sentiment matures
run_date: not run (decision logged 2026-05-22)
verdict: ⏸ DEFERRED · sentiment arm untestable (16 daily points → no tail) · FII arm largely redundant with [[Exp1]]'s coincidence finding · revisit as a proper EVT/GPD study in ~2–3 months
audience: Lijo, James, future Claude Code sessions
---

# Experiment 5 — Do sentiment + flow tails line up with market shocks? (EVT teaser)

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> **This experiment was consciously DEFERRED, not run.** This doc records the hypothesis, *why*
> running it now is low-value, and the exact conditions under which it becomes worth doing — so a
> future session doesn't burn time re-deciding. The program proceeded to [[Exp6]] (FII → volatility)
> instead.

---

## 1. Hypothesis (written before deciding)

**H5:** *The worst-decile news-sentiment days and the largest FII-outflow days **co-occur with the
worst ^NSEI return days** more often than chance — i.e. the **tails align** even if the levels don't
predict (Exp 1, Exp 3).* Later, the negative tail is modelled with a **Generalized Pareto
Distribution (GPD)** to estimate crash-tail behaviour.

The product framing this would unlock: a **risk / crash early-warning** signal, not a direction
signal — arguably an easier B2B sell than alpha.

---

## 2. Why it was deferred (the decision, 2026-05-22)

EVT lives **entirely in the tails**, and tails are rare — so EVT is the *most* data-hungry method in
the program. Both arms fail that bar today:

1. **Sentiment arm — untestable.** The daily-mean sentiment series is **16 points** ([[Exp3]], scoring
   began 2026-05-07). Its "worst decile" is ~1–2 days — an anecdote, not a tail. A GPD fit needs many
   exceedances over a high threshold; we have effectively zero. Running it would manufacture noise.

2. **FII arm — testable but largely redundant.** FII has ~3,965 daily rows (17 yrs), so the *length*
   is fine. But [[Exp1]] already established the FII↔Nifty relationship is **contemporaneous and tiny**
   (same-day corr 0.035, R²=0.0012 — ~0.1% of variance) and that FII does **not** lead next-day
   direction. A same-day FII-tail ↔ Nifty-shock co-occurrence would mostly **re-confirm Exp 1's
   coincidence finding**. There's a slim chance of *tail dependence* where linear correlation is ~0 —
   real, but not enough expected yield to justify a full build+run right now.

**Net:** one arm is impossible, the other is low marginal information. Deferring is the disciplined
call — the playbook's whole point is that running an underpowered test and calling the result
anything is the cardinal sin.

---

## 3. What makes it worth running later (the revisit gate)

Run Exp 5 properly when **all** of these hold:

- [ ] Sentiment series ≥ ~60–90 daily points (≈ 2–3 months of the autonomous pipeline → ~early-mid
      Aug 2026) so a high-threshold tail actually has exceedances.
- [ ] Done as a **real EVT study**, not a teaser: pick a threshold (e.g. 90th/95th percentile of
      negative returns), fit a **GPD** to the exceedances, estimate the shape parameter ξ, and report
      tail-dependence (e.g. the χ tail-dependence coefficient) between {sentiment, FII-outflow} tails
      and the ^NSEI down-tail vs a random baseline.
- [ ] Ideally after data-gap **G6** (sentiment positivity-bias calibration — see
      `_data_gaps_backlog.md`) is addressed, so the sentiment tail means what we think it means.

The FII-tail-vs-shock co-occurrence (the runnable half) can be folded in then as one panel of the
fuller study, rather than run alone now.

---

## 4. Method (sketch — for the future run, not executed)

- **Volatility/shock target:** worst-decile ^NSEI `log_return` days (the negative tail).
- **Signal tails:** worst-decile daily-mean sentiment; largest FII net-outflow days (most-negative `net`).
- **Co-occurrence test:** P(market in down-tail | signal in tail) vs the unconditional base rate; a
  2×2 contingency / Fisher exact, plus a permutation baseline.
- **EVT:** Peaks-Over-Threshold → GPD fit on exceedances; report ξ, and the tail-dependence coefficient.
- **No look-ahead:** for an *early-warning* (not just descriptive) claim, test signal-tail on day T vs
  market down-tail on **T+1**, mirroring [[Exp1]]'s no-look-ahead pairing.

Script (`scripts/research/exp5-tail-cooccurrence.mjs`) is **not written yet** — write it at revisit
time so it targets the matured data, not today's 16 sentiment points.

---

## 5. Status & next

- **Status:** ⏸ DEFERRED. No script, no run, no Hypothesis Register row (nothing was tested — a
  deferral is not a result). A `—` placeholder note is acceptable in the register if you want the
  sequence visible, but do **not** log a verdict.
- **Next experiment actually run:** **[[Exp6]] — does FII flow predict *volatility* (not direction)?**
  The variance question Exp 1 never asked; testable now on the full 17-yr FII series; genuinely
  distinct from Exp 1 (magnitude→magnitude, not sign→sign).

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Created as a **deferral record** (not a run). Logged H5, the two reasons it's low-value now (sentiment 16 pts; FII redundant with Exp 1), the revisit gate (≥60–90 sentiment points + a real GPD study + G6 calibration), and the method sketch for the future run. Program proceeded to Exp 6. |
