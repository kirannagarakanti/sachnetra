---
tags: [governance-signal, decisive-test, spec, pre-registration, review-draft, do-not-run]
date: 2026-07-02
status: REVIEW DRAFT v0 — pending fresh-eyes sign-off. DO NOT EXECUTE until reviewed and this line is removed.
purpose: >
  The decisive test for the #2 governance-monitoring signal — one executable protocol synthesizing five
  independent design reviews (MiniMax-M3, Qwen, Kimi K2.6, GLM-5.2, Claude RETRO-CC+FREEZE). Fixes the flaws
  the red-team round found in the earlier matched case-control design. Hand this to an engineer once signed off.
---

# Governance blow-up signal — DECISIVE TEST SPEC (v0, review draft)

**The question:** do governance red flags extracted from public Indian filings, measured point-in-time, give a
fund/credit-risk team a *tradeable early warning* of insolvency that beats free financials — reliably enough to sell
as a monitoring feed?

## §0 — Frozen parameters (pin before any code runs)
- `D0` snapshot / measurement reference: **2024-01-01**
- Subcohort size: **n = 600** (stratified), listed oversampled 2:1, weighted back
- Label horizon: **18 months** forward
- Alert budget for headline metric: **top 5%** of the universe by score
- RNG seed: **(fill in a 4-digit number here before pulling any data; record it in the pre-registration)**

## §1 — Universe & sampling (case-cohort, NOT matched controls)
- **Universe U:** the survivorship-free company universe from the **bhavcopy archive** + MCA master, all entities
  active (not already in CIRP) as of `D0`, in the size band spanning the 5th–95th percentile of case revenue/assets
  (band fixed before looking at flags). Includes later-struck-off/merged/wound-up entities.
- **Cases:** all hand-verified IBC/NCLT insolvency cases (label source: **IBBI CIRP registry**, via the `L`-CIN
  listed trick + self-disclosed "Corporate Insolvency Resolution Process" filings; the roster-verification step that
  caught false positives — admission-set-aside, application-only, stayed — applies). *Real-n caveat: our verified
  roster today is ~13–18; expanding toward ~45 requires more IBBI order-page verification. Run with what verifies.*
- **Subcohort C:** a **seeded random sample of 600** companies from U, drawn with **no reference to outcome**
  (case-cohort design; a sampled company that later fails stays in C — that is what keeps the base rate honest).
  **Oversample listed 2:1** vs their universe share (weight back with case-cohort / Prentice weights), because
  pledge only exists for listed names and a raw draw is overwhelmingly private.
- **No matching.** Distress is handled as a *baseline covariate* at analysis time (§4), never as a matching key.
- **All reported metrics are weighted back to the true universe base rate.**

## §2 — The clock & measurement window
- **Time-zero anchor `T0`:** use the **NCLT admission date**. Rationale: admission dates are the most reliably
  available and unambiguous field in the IBBI records; petition-filing dates are inconsistently reported across
  benches, so admission gives the cleanest, most complete label across all cases.
- **Measurement window:** governance flags counted using **only filings dated ≤ `T0` − 6 months**, looking back
  **12 months** (i.e., `[T0−18m, T0−6m]`). The 6-month buffer is the anti-echo guard. Lookback is 12m (not 24m)
  because filing history is ~2 years deep — say so in the writeup; a true 24m-lead claim is not testable here.
- **Subcohort timing:** score each subcohort company **as of the current date (2026-07)** using its most recent
  12 months of filings, so the control scores reflect the freshest available governance picture.
- **Rating/petition dates:** pull first rating-action-to-default (CRISIL/CARE/ICRA/India Ratings) and NCLT petition
  dates where available — used only for the lead-time descriptive in §5 and the 2-day kill test in §8.

## §3 — Features
**Extraction:** keyword-level from `india_bourse_announcements` / `india_announcements` (auditor, KMP, director,
results-timing); pledge from Trendlyne/Screener + NSE/BSE shareholding pattern; RPT from annual-report/RPT
disclosures. LLM extraction only if the decisive test passes on keywords. **Extract blind** to case/control status
(shuffled, label-free company list).

**IN — tier 1 (promoter-behaviour; least "death-debris"):**
- `pledge` — promoter pledged % level >50% OR rise ≥20pp in window (listed). **For private companies, where pledge
  data does not exist, set this flag = 0** so every company has a comparable 5-flag score.
- `rpt_spike` — RPT ≥2× prior period AND ≥5% of revenue.

**IN — tier 2 (personnel; death-debris-neutralised):**
- `auditor_resign`, `cfo_cs_id_exit` — counted **only if the event is ≥9 months before `T0`** (drop the reactive
  last stretch; record late ones descriptively, never in the score).
- `going_concern_qual` — auditor "material uncertainty related to going concern" / CARO material-weakness language
  in the window. (A direct auditor judgment on viability — treat as a core governance flag.)

**IN — tier 3:**
- `late_results_change` — late in the window AND on-time in the earliest observable period (a *change*, not a level;
  companies that always file late are sloppy, not dying). Missing baseline → flag = missing.

**OUT — permanently:** `insolvency_related_filings` (that is the label wearing a hat).

**Filing-volume confound:** all flags are **binary on a fixed document-type checklist** (annual report, board-change
filings, auditor-change filings, pledge disclosures, results-filing dates) — identical for cases and subcohort — so
a company that files 200 documents gets the same 0/1 as one that files 10. Report per-company checklist coverage.

## §4 — Baseline to beat
A governance signal that can't beat free financials has no buyer. **Baseline B:** point-in-time financial-distress
score — leverage (D/E), interest coverage, Altman-Z where applicable, `log(revenue)`, sector, listing status —
using only statements *publicly filed* before `T0−6m` (respect the MCA filing lag; use filing date not statement
date). Pull financials for the **cases + 600 subcohort only** (the point of case-cohort — never touch the rest of U).
**Increment** = weighted logistic (Prentice weights), Baseline vs Baseline + governance-score. Governance is worth
paying for only if it adds discrimination *conditional on* the financials.

## §5 — Metrics & pass/fail bar (decided NOW)
**Scoring:** combine the flags into a score, then **fit logistic-regression weights on the cases via 5-fold CV and
choose the score threshold that maximises F1** on the sample; apply that threshold to the subcohort.

**Headline metric:** **precision in the case-cohort sample** — of the companies flagged (case + subcohort combined),
the fraction that were cases — reported alongside recall.

**Companion metrics (population-weighted):** recall @ top-5% alert budget; median lead-time of the first tier-1/2
flag ahead of `T0` and ahead of first rating-action; AUC-PR; NPV.

**BUILD if all hold · KILL if any fails:**

| Metric | BUILD ≥ | KILL < |
|---|---|---|
| Headline precision (flagged that were cases) | **30%** | **15%** |
| Marginal lift over Baseline B (PPV(B+gov)/PPV(B)) | **1.5×** | **1.0×** |
| Recall @ top-5% | **35%** | **15%** |
| Median lead-time ahead of first rating-action | **6 months** | **3 months** |
| Survives placebo + death-debris tests (§6) | pass | fail |

## §6 — Validation (honest limits)
- **Permutation test:** shuffle failure labels 1,000×; empirical p-value of the observed AUC-PR increment over
  baseline. p > 0.10 → kill.
- **Death-debris test:** recompute the score dropping the last 3 months of the window (`[T0−18m, T0−9m]`). If AUC-PR
  drops >0.05, the flags are process-debris, not leading — kill.
- **Sector-cluster jackknife:** drop each sector's cases, re-estimate. If the result survives only via one sector's
  blow-up cluster, report it as sector-specific.
- **Cluster bootstrap** by company for CIs on every headline number.
- **Cannot do:** true out-of-macro-regime validation (one IBC/credit cycle, ~2yr depth). Say so.

## §7 — The forward FREEZE (the only skeptic-proof arm)
The day §0–§6 are frozen: score all of live U with the frozen pipeline, write the ranked list to a file, **hash +
timestamp it (a public git commit)**, and evaluate at +12 months against new IBBI admissions. This is the only
evidence a hostile skeptic cannot dismiss as hindsight — run it in parallel, don't wait on it alone.

## §8 — The 2-DAY KILL TEST (do this FIRST, before any build)
- **Day 1:** pull petition + first-default/rating dates for every verified case; compute the admission−petition and
  petition−default lags. This is the clock geometry of our own data.
- **Day 2:** 10 seeded-random cases; hand-build each full timeline (every flag date + default/rating/petition/
  admission). Plot flag dates vs first-default. **KILL if fewer than ~4 of 10 show a pledge/RPT/auditor flag firing
  ≥6 months before the first conventional distress signal.** (Companion: of the flagged cases, did >80% already have
  bad leverage 18m prior? → redundant with financials.)
- Reuses `scripts/research/{assemble-roster-from-ibbi, build-hand-trace-scoring, analyze-hand-trace}.mjs`.

## §9 — Honest limits (put in the buyer report, up front — not a footnote)
- **Leading-vs-coincident ceiling:** 2yr depth proves at best a ~12m-lead "end-of-cycle monitor," not a 24m leading
  indicator. Price/position accordingly.
- **Researcher-is-the-leak:** the six flags were chosen because they're what everyone saw in famous Indian blow-ups
  + our own pilot — a positive *retrospective* result is tainted by hindsight feature-selection; only the §7 freeze
  answers it.
- **Product framing:** the flags may detect deliberate promoter *extraction/looting*, not accidental distress →
  honest framing is a **"promoter-misconduct early warning,"** not a generic credit feed.

## §10 — Data sources (our repo)
IBBI CIRP registry (labels) · bhavcopy archive + MCA master (survivorship-free universe) · `india_bourse_announcements`
/ `india_announcements` (auditor/KMP/director/late-results flags) · Trendlyne/Screener + NSE/BSE shareholding
(pledge) · annual-report/RPT disclosures (RPT) · CRISIL/CARE/ICRA/India Ratings (downgrade dates) · NCLT/IBBI
(petition dates) · `research_prices` (listed price/return context) · `scripts/research/` (existing hand-trace harness).
