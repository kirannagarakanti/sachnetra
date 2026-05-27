# NPTEL Time Series — Follow-Up Checklist

*Action items distilled from `ai_docs/learning/playlists/nptel-ts-r/WHAT_I_LEARNED.md`
(§19 SachNetra-specific takeaways + §20 Open questions + the 2026-05-27 review of the
doc). Same posture as `feedback_task_authoring_vs_impl`: Lijo + Claude decide what
graduates to a task / playbook update; James implements anything that lands in
`ai_docs/tasks/`. Nothing here writes to prod or to the wiki yet.*

---

## Status — 2026-05-27 — DRAFT, awaiting Lijo triage

- [x] Source doc fixes applied (§A below) — 3 edits to `WHAT_I_LEARNED.md`
- [ ] §B discipline upgrades — Lijo decides which land in `sachnetra_research_playbook.md`
- [ ] §C cheap experiments — Lijo picks 0–2 to author into `ai_docs/tasks/` or
      the `_data_gaps_backlog.md` queue
- [ ] §D park-list — Lijo confirms nothing here is misclassified before we set it down

---

## Read this first — what this checklist is, and what it is NOT

**Is:** a one-time triage of the time-series course's outputs into three buckets —
*discipline upgrades* that change how we run the next experiment, *cheap experiments*
that test a named hypothesis on data we already have, and a *park-list* of ideas that
are real but premature.

**Is NOT:** a task file. The Exp 11 chain remains the active research thread
(`exp11_brief.md` §11 is gated on Lijo's prod SQL checks — see "what is next"
recommendation 2026-05-27). Anything in §C below queues behind Exp 11 unless Lijo
explicitly re-prioritises.

**Why a checklist at all:** the learning doc is 633 lines. Without a triage layer the
useful action items get lost in the pedagogy. This file is the staging area where
follow-ups either graduate to a task / backlog row, or get parked with a written
reason so a future Claude doesn't re-propose them cold.

---

## §A — Source-doc fixes (applied 2026-05-27)

- [x] L62 typo — "yesterday today" → "yesterday … to tomorrow"
- [x] L201 wording — "7 for weekly daily data" → "7 for daily data with weekly seasonality"
- [x] L600–601 factual mismatch — "We're Python-first" rewritten to reflect that
      `scripts/research/` is Node `.mjs` (12 files, zero Python). Recommendation
      preserved (skip R sessions), premise corrected (pick host language per-experiment).

*No further edits to the learning doc unless §B or §C surfaces a contradiction.*

---

## §B — Discipline upgrades (playbook-level — durable, no end state)

These are not experiments. They are rules to bake into
`ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md` so every future
Exp file inherits them. Each one is a one-paragraph addition.

- [ ] **B1. Theil's U as the parsimony gate.** Every experiment that reports a
      forecast or directional model must report `Theil's U` vs the naive baseline
      ("tomorrow = today"). If U ≥ 1, the model is rejected regardless of in-sample
      p-values. Currently the playbook mandates AIC/BIC parsimony for model
      *selection* but has no explicit *baseline-beating* rule. Source:
      `WHAT_I_LEARNED.md` §9 + L280.

- [ ] **B2. Squared-residual Ljung-Box as the mandatory third diagnostic.** When an
      experiment fits any mean model (ARIMA, regression, event-study residual), the
      diagnostic block must include Ljung-Box on the *squared* residuals, not just
      raw residuals. A pass on raw + fail on squared = the model is missing the
      volatility process and the experiment's verdict is provisional until a GARCH
      layer is fitted. Source: §7.3 + L230.

- [ ] **B3. ADF + KPSS together, not ADF alone.** The playbook currently doesn't
      mandate the joint test. Disagreement between them is itself a finding
      (trend-stationary vs difference-stationary). Cheap to add, prevents a real
      class of error. Source: §2.4 + L87.

- [ ] **B4. Stationarity check before every regression-style experiment.** Spurious
      regression on two non-stationary series is the canonical silent failure
      (`WHAT_I_LEARNED.md` §13). Add a one-line preflight to the playbook's experiment
      template: "If the regression involves two or more series, ADF each one first.
      If any is non-stationary, justify (cointegration test) or first-difference."

*Decision posture:* B1–B3 are low-risk additions to the playbook (a paragraph each).
B4 is structural — it changes the experiment template. Lijo and Claude co-author the
edit; do not delegate to James (per `feedback_task_authoring_vs_impl`).

---

## §C — Cheap experiments (data-already-in-hand, named hypothesis)

Each is sized so a single `scripts/research/expN-*.mjs` can ship it. None replace
Exp 11; all queue behind it.

- [ ] **C1. ACF / PACF of post-filing abnormal returns (Exp 10 follow-up).**
      Hypothesis: post-event AR series for the top categories has detectable AR or
      MA structure → tells us whether the price impact dies in 1 bar, 2 bars, or
      drifts for hours. Decides the *correct event window* for any future Exp 10 /
      Exp 11 redux. Data already exists (`research_prices_intraday` + announced_at
      from `india_bourse_filings`). One script, one plot, one verdict.
      **Source:** doc §19.B + §20 Q1. **Gate:** finishes after Exp 11 v1 lands —
      the universe choice in `exp11_brief.md` §4 likely changes the answer for
      mid/small-caps vs large-caps and we want one diagnostic per universe.

- [ ] **C2. Hurst exponent on Nifty (rolling).** Hypothesis: H drifts above/below
      0.5 in identifiable regimes (trending vs mean-reverting). If yes, it gates
      *when* a momentum vs mean-reversion strategy is deployable. One R/S
      computation, rolling 250-day window over `research_prices` Nifty series.
      Probably one afternoon. **Source:** §19.E + §20 Q4. **Decision-grade either
      way** — if H is stuck at 0.5, the regime-switching ML stuff in §16/§17 is
      premature even as a research direction.

- [ ] **C3. GJR-GARCH asymmetry test around filing events.** Hypothesis: bad-filing
      shocks raise next-bar vol more than equally-sized good-filing shocks. Needs
      direction extraction (the Exp 10 §9.1 method bug Exp 11 already plans to
      fix) — so this is downstream of Exp 11 v1 finishing. **Source:** §19.D +
      §20 Q2. **Don't queue until Exp 11's direction-extraction step lands** —
      otherwise we're guessing the sign.

- [ ] **C4. Cointegrated NSE pairs scan.** Hypothesis: at least one banking-sector
      pair (HDFC/ICICI canonical example, but also Tata Steel/JSW Steel, M&M/Bajaj
      Auto, etc.) is cointegrated over the `research_prices` window. Engle-Granger
      two-step, or Johansen for >2 series. Engineering, not research — the
      mechanics are textbook (`WHAT_I_LEARNED.md` §13). **Source:** §19.C + §20 Q3.
      **Tension with `positioning_v2`:** pair trading is a *different edge* from the
      latency thesis Exp 11 is testing. Lijo should explicitly decide whether to
      run it as a parallel research track or park it until the latency thesis
      decision lands.

*Recommended sequencing (when Exp 11 finishes):*
1. C1 first — it's a diagnostic that improves *every subsequent* event-window
   experiment. Cheapest leverage.
2. C2 second — single number, decision-grade, gates §C3 and §D.
3. C3 only if Exp 11 fires SUPPORTED and direction extraction is in the script.
4. C4 only if Exp 11 fires NULL on both arms (i.e. the latency thesis dies and we
   need a different edge — `latency_vs_value_tradeoff` §6 outcome tree, leftmost
   "pivot to a different edge" branch).

---

## §D — Park (real but premature, or methodologically blocked)

Written down so a future Claude doesn't re-propose cold.

- [ ] **D1. ARIMA-LSTM hybrid on returns.** Doc §17. *Premature.* Standard parsimony
      (§19.F): exhaust ARIMA + GARCH before adding ML residual layers. Revisit only
      if a specific signal has model-fit issues that GARCH variants can't close.

- [ ] **D2. ARFIMA / long-memory on volatility.** Doc §11. Needs long history (years of
      clean returns) and a *specific question* — currently we don't have one.
      Revisit if a future GARCH fit shows persistent ACF in squared residuals out
      to lag 50+.

- [ ] **D3. Frequency-domain / spectral analysis of filings.** Doc §14. Same posture
      as the original doc: park unless a specific cycle question arises (e.g. "is
      the quarterly results spike showing up at exactly s=4 in the periodogram?").

- [ ] **D4. EVT / tail studies on sentiment.** Doc §5 / §11. Already documented as
      deferred in `research_state_summary.md` — needs ~Aug 2026 worth of sentiment
      data points. No action until then.

- [ ] **D5. Markov-switching state models.** Doc §16. Interesting but expensive;
      gated on C2 (Hurst). If C2 shows no regime drift, MS-AR has no signal to
      capture. If C2 fires, then MS-AR becomes a real candidate.

---

## §E — Memory + cross-reference housekeeping (when this checklist closes)

- [ ] If §B fires, update `sachnetra_research_playbook.md` and bump
      `research_state_summary.md` §6 ("What To Do Next") with the new discipline
      rules.
- [ ] If any §C experiment graduates to a task file, add an `Exp` row to the
      Hypothesis Register in `sachnetra_research_playbook.md` *before* it runs —
      pre-registration, per the playbook's own rule.
- [ ] Add a memory row `project_nptel_followups.md` only if there's something here
      that a future Claude wouldn't re-derive from the doc itself. Right now the
      doc + this checklist are self-sufficient — *don't* save a duplicate memory
      yet.

---

## §F — Issues we might hit during triage

1. **Scope creep into "do all of §C now".** The whole point of `positioning_v2`
   "be your own first customer" is to converge on a tradeable edge, not run more
   methodology. Exp 11 is the named test. §C items are *next*, not *now*.
2. **§B feels like overhead.** It's three paragraphs in the playbook, applied once.
   The cost is small; the cost of *not* having them is one silent false-positive
   experiment.
3. **C4 (cointegration) competes with the latency thesis for research time.** Lijo
   should make the parallel-vs-sequential call explicitly — don't let it sneak in
   under "cheap engineering".

---

## §G — Deliverables when this checklist closes

- §B → 3–4 paragraphs added to `sachnetra_research_playbook.md`, single PR-shaped commit.
- §C → 0–2 items elevated to `ai_docs/tasks/Exp12.md` (or the next free Exp number)
  *after* Exp 11 lands; the rest stay parked here with a one-line reason.
- §D → no action; the list itself is the deliverable.
- This file → archived to `ai_docs/learning/playlists/nptel-ts-r/FOLLOWUPS_CLOSED.md`
  once §B + §C decisions land. Park-list (§D) moves with it.

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-27 | Initial draft. Applied 3 fixes to `WHAT_I_LEARNED.md` (§A). Sorted the doc's §19 takeaways + §20 open questions into §B discipline upgrades (4), §C cheap experiments (4 with sequencing), and §D park-list (5). Held the line against scope creep: Exp 11 remains the active thread; §C queues behind it. |
