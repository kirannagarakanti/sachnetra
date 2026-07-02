---
tags: [governance-signal, decisive-test, spec, pre-registration, v1]
date: 2026-07-02
status: v1 — corrected after the seeded-error calibration + 6-reviewer round. §0 RNG seed pinned (6119). Ready to run
  once the 2-day kill test (§8) passes. Supersedes v0 (v0 retained only as the seeded-error QC artifact).
supersedes: 2026-07-02_governance-decisive-test-SPEC.md
purpose: >
  The decisive test for the #2 governance-monitoring signal. v1 fixes the 6 deliberately-seeded errors (see change
  log) plus the real flaws the reviewers + Grok surfaced. Hand to an engineer after the §8 kill test passes.
---

# Governance blow-up signal — DECISIVE TEST SPEC (v1)

**The question:** do governance red flags from public Indian filings, measured point-in-time, give a fund/credit-risk
team a *tradeable early warning* of insolvency that **beats free financials** — enough to sell as a monitoring feed?

## Change log — what v1 fixes vs v0
Seeded errors, now corrected: (SE-1) clock re-anchored to **petition/first-default**, not admission · (SE-2) headline
metric is **population-weighted PPV/lift**, not case-cohort-sample precision · (SE-3) **frozen unit/tier weights, no
fitting**, operating point = alert budget (no F1-threshold tuning) · (SE-4) **going-concern dropped from the headline
score** (death-debris → sensitivity arm only) · (SE-5) subcohort gets a **pseudo-T0\*** (no "score as of today") ·
(SE-6) pledge **missing ≠ 0** for privates. Real bonus fixes: risk-set framing removes the D0/T0 contradiction ·
right-censoring handled · **Crude Financial Distress Proxy** baseline so financials aren't artificially weak · Altman-Z
only where valid · listed pledge analysis scoped honestly · missingness thresholds · leave-one-flag-out sensitivity ·
base-rate computed two ways.

## §0 — Frozen parameters (pin before any code runs)
- Design: **risk-set case-cohort** (each case at its own T0\*; controls at a pseudo-T0\*). No single D0 snapshot.
- Subcohort size: **n = 600** random + **listed oversampled** (ratio set in §1); Prentice-weighted back to the universe.
- Label horizon: **18 months** after T0\*.
- Operating point: **top 5%** of the weighted sample by score (this IS the threshold — nothing is tuned).
- Score weights: **frozen, unit or fixed tier weights** (see §3). No fitting.
- RNG seed: **6119** (pinned 2026-07-02; use for subcohort draw + §8 kill-test case sample).
- Pin the git commit hash of every `scripts/research/*.mjs` used, and the bhavcopy/MCA snapshot dates.

## §1 — Universe & sampling (case-cohort, NOT matched controls)
- **Universe U:** survivorship-free (bhavcopy + MCA master), size band = 5th–95th pct of case revenue/assets (band
  fixed before looking at flags); includes later-struck-off/merged/wound-up entities.
- **Cases:** all hand-verified IBC/NCLT cases (IBBI CIRP registry). **Right-censoring:** include only cases whose
  T0\* leaves ≥18 months of forward observability before the data cutoff; log every exclusion. *Real-n today ≈ 13–18
  verified; if <25 verified at cohort-build time, use the additive scorecard (§3), not fitted anything.*
- **Subcohort C:** seeded random sample of ~600 from U, drawn with **no reference to outcome** (a sampled company that
  later fails stays in C). **Oversample listed** enough to get ≥80 listed names into C (else the pledge flag is
  un-testable); weight back with Prentice weights. If listed can't reach ~80, **pledge is analysed listed-only /
  descriptive**, and the headline score is the 4-flag score every company can carry.
- **No matching.** Distress enters as a §4 baseline covariate only.
- **Base rate computed two ways and reconciled:** (a) historical IBBI admission rate in the size band; (b) forward
  from the subcohort's own follow-up. Report both; use them to weight PPV to the universe.

## §2 — The clock & measurement window
- **T0\* = earliest of {NCLT petition-filing · first default · first rating-action-to-default}** — NOT the admission
  date (admission lags the real event 6–18m). Pull petition/rating/default dates from NCLT/IBBI + CRISIL/CARE/ICRA/
  India Ratings.
- **Window:** flags from filings dated in **[T0\*−18m, T0\*−6m]**; the 6-month buffer is the anti-echo guard.
- **Subcohort timing:** assign each control a **pseudo-T0\*** drawn from the empirical distribution of case T0\* dates
  (seeded), and score it in **[pseudo-T0\*−18m, pseudo-T0\*−6m]**. Never "as of today" — that would compare different
  macro eras.
- **Buffer check:** if the §8 Day-1 measurement shows median (T_petition − T_default) > 6m, widen the buffer to 9m
  before running §5. *(Not `T0*−default`: since `T0* = min(petition, default, rating)`, `T0*−default ≤ 0` and that
  check would never fire — the meaningful lag is petition-behind-default.)*

## §3 — Features
Keyword extraction from `india_bourse_announcements`/`india_announcements` (auditor/KMP/director/results-timing);
pledge from Trendlyne/Screener + NSE/BSE shareholding; RPT from annual-report/RPT disclosures. **Extract blind**
(shuffled, label-free company list). Pin the exact numeric definitions below in the pre-registration before extraction.

**Headline score — 5 binary flags, frozen unit weights:**
| Flag | Definition | Note |
|---|---|---|
| `pledge` | promoter pledged % >50% OR +≥20pp in window | **listed only; missing (private) ≠ 0** — see coverage rule |
| `rpt_spike` | RPT ≥2× prior period AND ≥5% of revenue (if prior=0: RPT ≥5% of revenue) | |
| `auditor_resign` | auditor resignation/cessation, **counted only if ≥9m before T0\*** | late ones descriptive only |
| `cfo_cs_id_exit` | CFO/CS/independent-director exit, **only if ≥9m before T0\*** | |
| `late_results_change` | late in window AND on-time in the earliest observable period (a *change*) | no baseline → missing |

**OUT of the headline score:**
- `insolvency_related_filings` — the label wearing a hat. Permanent exclude.
- `going_concern_qual` (auditor going-concern / CARO material-weakness) — **death-debris** (written *because* the firm
  is failing). **Sensitivity arm only:** run the score with it added, report the "if you let the auditor tell you" gap.

**Missingness (SE-6 fix):** a flag can be 1, 0, or **missing** (never impute 0). Score = observed flags fired, reported
as **"X of Y observable flags"** (coverage-adjusted). **If any flag family is missing in >30% of the relevant group,
that family is invalidated for the headline and reported separately.** Analyse listed and private cohorts separately.

**Filing-volume confound:** binary flags on a **fixed document-type checklist** (annual report, board-change,
auditor-change, pledge disclosure, results-filing dates), identical for all — a 200-filing company and a 10-filing
company get the same 0/1. Report per-company checklist coverage.

## §4 — Baseline to beat (must not be artificially weak)
Private-company MCA financials are sparse/late/abridged, so a naïve Altman-Z baseline would be garbage and governance
would "win" for the wrong reason. So the baseline is **two-part**:
- **B1 — Crude Financial Distress Proxy (CFDP):** binary text flag = any of {default, overdue, covenant breach, NPA,
  SARFAESI, liquidity crunch} in [T0\*−18m, T0\*−6m], from the **same filing pipeline** (no missing-financials problem).
- **B2 — financial components where available:** D/E, interest coverage, `log(revenue)`, sector, listing status;
  Altman-Z **only** for manufacturers with the needed fields (never raw across sectors). Point-in-time — use filing
  date, not statement date.
**Increment** = Prentice-weighted logistic, (B1+B2) vs (B1+B2 + governance score). Governance must add discrimination
*conditional on* the baseline; the money question is the CFDP=0 subgroup — does governance catch the companies whose
financials still look quiet?

## §5 — Metrics & pass/fail bar (population-weighted; decided NOW)
**Scoring:** frozen additive score (unit weights). **Operating point = top-5% of the weighted sample.** No threshold
tuning, no F1, no weight-fitting. (5-fold CV, if run at all, is a coefficient-stability *diagnostic* only, never a
selector.)

**Headline metric = population PPV at top-5%**, estimated with case-cohort weights:
`PPV = Σ(weight · flagged cases) / Σ(weight · all flagged)`, where subcohort non-cases carry weight `|U|/|C|` and cases
carry weight 1. **Lift = PPV / universe base rate.** (Never report the raw case-cohort-sample fraction — it's inflated
by the sampling ratio.)

**Companion:** recall @ top-5%; **median lead-time of the first tier-1/2 flag ahead of the first conventional distress
signal** (reported only over cases with an observable rating/default date, min N=8, else "insufficient data"); AUC-PR.

| Metric | BUILD ≥ | KILL < |
|---|---|---|
| Lift (PPV / base rate) at top-5% | **5×** | **3×** |
| Marginal lift over baseline (CFDP=0 subgroup) | **1.5×**, 90% CI excludes 1.0 | CI includes 1.0 |
| Recall @ top-5% | **35%** | **15%** |
| Median lead-time ahead of first conventional signal | **6 months** | **3 months** |
| Survives permutation + death-debris + leave-one-out (§6) | pass | fail |
(Single threshold per metric — no deadband. BUILD needs all; KILL on any.)

## §6 — Validation (honest limits)
- **Permutation test:** shuffle case/non-case labels 1,000× within the weighted design; p-value of the AUC-PR increment
  over baseline. p > 0.10 → kill.
- **Death-debris test:** drop the last 3m of the window ([T0\*−18m, T0\*−9m]); if AUC-PR drops >0.05, flags are debris.
- **Leave-one-flag-out (Grok):** recompute the score dropping each flag in turn; report robustness (no single flag
  should carry the whole result).
- **Sector-cluster jackknife:** drop each sector's cases, re-estimate — **descriptive** (with ~15 cases it's noisy),
  not a kill criterion.
- **Cluster bootstrap** by company → CIs on every headline number.
- **Cannot do:** out-of-macro-regime validation (one IBC/credit cycle, ~2yr depth). State it.

## §7 — The forward FREEZE (start Day 1, in parallel — the only skeptic-proof arm)
On the day §0–§6 are frozen: score all of live U with the frozen pipeline, write the ranked list, **hash + timestamp it
(a public git commit)**, evaluate at +12 months vs new IBBI admissions. This is the only evidence a skeptic can't
dismiss as hindsight (the flag list itself is hindsight-selected — see §9). Commit the **hash**, not the public
name-and-shame list, to avoid defamation exposure.

## §8 — The 2-DAY KILL TEST (do this FIRST — before any build; the only part safe to run now)
- **Day 1:** pull petition + first-default/rating dates for every verified case; compute admission−petition and
  petition−default lags (the clock geometry; also validates the §2 buffer).
- **Day 2:** 10 seeded-random cases; hand-build each timeline (every flag date + default/rating/petition/admission),
  **plus 1 size/sector/listing-matched control each** (specificity arm — MiniMax's point: a flag that fires for
  everyone is useless). Plot flag dates vs first-default.
  **KILL if:** fewer than **4 of 10** cases show a pledge/RPT/auditor flag ≥6m before their first conventional distress
  signal, **OR** (case flag-rate − control flag-rate) < 0.3. Companion: of flagged cases, did >80% already have CFDP=1
  18m prior? → redundant with financials.

## §9 — Honest limits (put in the buyer report, up front)
- **Leading-vs-coincident ceiling:** 2yr depth proves at best a ~12m-lead "end-of-cycle monitor," not a 24m leading
  indicator.
- **Researcher-is-the-leak:** the flags were chosen from famous Indian blow-ups + our pilot — a positive *retrospective*
  result is hindsight-tainted; only the §7 freeze answers it.
- **Absolute false positives:** at a <0.1% universe base rate, even a great 5× lift produces many false alarms in a live
  feed — frame the alert-budget cost honestly.
- **Product framing:** the flags may detect deliberate promoter *extraction/looting*, not accidental distress → honest
  framing is a **"promoter-misconduct early warning,"** not a generic credit feed.

## §10 — Data sources (our repo)
IBBI CIRP registry (labels + petition dates) · bhavcopy + MCA master (survivorship-free universe) ·
`india_bourse_announcements`/`india_announcements` (auditor/KMP/director/late-results) · Trendlyne/Screener + NSE/BSE
shareholding (pledge) · annual-report/RPT disclosures (RPT) · CRISIL/CARE/ICRA/India Ratings (default/downgrade dates)
· `research_prices` (listed price context) · `scripts/research/{assemble-roster-from-ibbi, build-hand-trace-scoring,
analyze-hand-trace}.mjs` (hand-trace harness — pin commit hashes).
