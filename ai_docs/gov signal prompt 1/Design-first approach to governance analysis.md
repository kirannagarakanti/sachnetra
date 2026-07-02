---
title: "Design-first approach to governance analysis"
source: "https://claude.ai/chat/e9c6a102-2b31-4e0a-968d-d4f39a743532"
author:
published:
created: 2026-07-02
description: "Claude conversation with 7 messages"
tags:
  - "clippings"
---
**Claude**

This is a good brief, and I'm going to honor the "design fresh first" instruction before touching yours. Fair warning: the biggest problem I found isn't subtle, and it's baked into your step 3.

---

### 1\. Independent design

The commercial claim is "monitoring feed on a universe." The honest way to test a monitoring feed is a **point-in-time cohort design**, not case-control: take a snapshot of the full at-risk universe (or a random sample of it) at several dates, compute flags as of each snapshot using only data filed by that date, follow every company forward 24 months, and see who enters distress. That's the only design that gives you a real base rate, real precision, and real lead time — the three numbers a buyer actually cares about.

Since extracting flags for the whole universe is expensive, I'd do a **case-cohort compromise**: extract flags for (a) all ~45 cases and (b) a *random* sample of ~300–500 companies from the universe, sampled without reference to outcome, weighted back to universe proportions. Random subcohort instead of matched controls is the key move — matching destroys your ability to estimate absolute performance, and absolute performance is what's for sale.

Second pillar: **anchor the event date to the earliest observable distress event** — first payment default, rating action, or NCLT petition *filing* — not the admission date. More on why below; this is the load-bearing decision.

Third pillar: **no fitting at all.** With ~45 positives you cannot estimate weights or tune a threshold without overfitting; you already spent your exploratory budget on the pilot. Freeze flag definitions, extraction code, and a unit-weight score (count of flags) now, in writing, before touching the labels. Report rank-based metrics (lift at top-k% of the sample) rather than a tuned threshold.

Fourth pillar: **a hand-built timeline study on 10 cases before anything else** — see §5. It costs two days and can kill the whole project.

### 2\. Red-team of your design, ranked

**Flaw 1 — Label contamination via T0 = admission date. This is close to fatal as written.** In the IBC process, admission at NCLT typically lags the underlying default by a long time: default → months of non-payment → petition filed → NCLT backlog → admission. That lag is frequently longer than 6 months and often longer than 18. So your "18-to-6-months-before-T0" window will, for many cases, sit *after* the default and even after the petition was filed. In that window, auditor resignations, director exits, and late results are not predictors — they are the insolvency process shedding debris. And one of your flags, "insolvency-related filings," is literally the label wearing a hat. You will get a beautiful result that says: companies visibly going insolvent tend to be going insolvent. Fix: re-anchor to petition-filing date or first-default date (both discoverable — petition dates are in NCLT records), and drop or heavily lag the insolvency-filings flag.

**Flaw 2 — Your precision number is an artifact of your sampling ratio.** With 1:10 case:control matching, the base rate in your sample is ~9%. The true annualized insolvency rate in your universe is plausibly well under 1%. Precision computed in the matched sample overstates deployed precision by roughly the ratio of those base rates — an order of magnitude or more. A matched case-control design can legitimately give you an odds ratio, TPR, and FPR; it cannot give you precision. You must separately estimate the universe base rate and *project* precision at it. If you report the in-sample precision as the headline, you'll fool yourself and any unsophisticated buyer, and get destroyed by any sophisticated one.

**Flaw 3 — You're already fit to the data.** You ran a pilot. Your six flag families, your intuition about which matter, possibly your window choice, are all downstream of it. Writing the pass/fail bar in advance is necessary but not sufficient: the *score construction* also has to be frozen, and ideally validated on cases the pilot never saw. With 2 years of filing depth this is hard (see Flaw 5), which pushes you toward the prospective freeze in §5.

**Flaw 4 — Mechanically-induced flags.** "Chronically late results" is partly caused by the death process itself: dying companies stop filing. Auditor resignations spike after default becomes known to the auditor. If extraction is done knowing which companies are cases (and it will be, unless you enforce blinding), keyword-level extraction will be applied with more care to cases. Fixes: extract blind to case status, with identical pipelines and identical lookback depth per company, and for each flag ask "could the default itself cause this?" — if yes, it needs the earlier anchor from Flaw 1 to mean anything.

**Flaw 5 — Two years of filing history can't support "change" flags or generalization.** Flags like "sudden exit," "pledge *rise*," "RPT *spike* " require a baseline to detect change against; some companies will have almost none. And because your window needs 18 months of pre-T0 coverage, all usable cases come from a narrow recent vintage — likely clustered in the same macro conditions and a few sectors. Insolvencies cluster (sector shocks, credit cycles), so your effective sample size is smaller than 45, your confidence intervals are wide (recall on 45 cases has roughly ±15pp of noise), and you cannot test whether the signal survives a regime change. Also note pledge data only exists for listed companies — if cases and controls differ in listed/private mix, that flag becomes a proxy for listing status.

**Flaw 6 — The matching cuts both ways, and you haven't picked which question you're answering.** Matching on leverage/distress is the right instinct — it tests whether governance adds signal *beyond* distress, which is the only commercially interesting question (a buyer can compute interest coverage for free). But then your comparison must be explicit: baseline model (leverage, coverage, size, sector) vs. baseline + governance flags, and the deliverable is the *incremental* lift. Also check the point-in-time integrity of the matching variables themselves: private-company financials reach MCA with long lags, so "leverage as of 18 months before T0" may use statements that weren't actually public then. And state your risk-set rules in advance: what happens if a "surviving" control enters insolvency 8 months after the case's T0?

**Flaw 7 — "How many months early" relative to what?** Early relative to admission is worthless (Flaw 1). The commercially meaningful lead time is: how far ahead of the *first conventional public signal* (rating downgrade to default grade, first disclosed missed payment, petition) did your flag fire? If your flags fire after the rating action, the feed has negative value even with perfect recall.

### 3\. The single most likely way you fool yourself

Flaw 1. You will measure the echo of the insolvency and call it a prediction, because NCLT admission dates trail the real distress event by months to years. Everything else on the list degrades the result; this one manufactures it.

### 4\. The buyer test

A credit-risk officer's counterfactual is not "nothing" — it's rating watchlists, CRILC/default data, interest coverage screens, and price action for listed names, all cheap or free. So the minimum bar is stated as *incremental*: at a fixed alert budget (say, flagging the top 5% of the monitored book), the feed must (a) achieve lift of several times the base rate over a financials-only baseline, and (b) show a median lead time of at least ~3–6 months ahead of the first conventional signal, on out-of-time events.

On your 30% question: yes, a monitoring desk will happily act on 30% precision — even 10–15% — *if* the alert volume is manageable and each alert costs an analyst-hour of investigation rather than an automatic action. Watchlists are cheap to act on. What makes it useless is not low precision per se, it's either (a) alert rates so high the desk drowns (flagging 30% of the book), or (b) zero incremental lead time — alerts arriving with or after the downgrade. False-alarm tolerance collapses if alerts trigger expensive actions (exiting positions, cutting limits); it's generous if they trigger reviews.

### 5\. Cheaper alternatives and kill-tests, in order

**Kill-test A (2 days, do this first, no controls needed):** hand-build a full timeline for 10 known cases: first default, first rating action, petition filing, admission, and the date each governance flag first fired. If flags mostly fire after the first default/downgrade, stop — the product has no lead time and no amount of case-control machinery rescues it. This single exercise also directly measures the admission-vs-petition lag in your own data (checking Flaw 1 empirically).

**Kill-test B (1 day):** for all ~45 cases, pull petition-filing dates from NCLT records and compute the admission lag. If the median lag exceeds ~6 months, your proposed window is contaminated by construction and must be re-anchored before any measurement.

**Kill-test C (within your design):** run the financials-only baseline first. If governance flags add no discrimination conditional on the matching variables plus a simple leverage score, stop.

**The cheapest *convincing* test:** a prospective freeze. Freeze the rules today, score the current universe, seal the output (hash it, timestamp it), and evaluate in 12 months against new insolvency events. Almost zero incremental labor, and it's the only evidence a genuinely skeptical buyer can't argue with — no retrospective design fully escapes the "you knew the answers" objection. Run it in parallel with the retrospective study; don't wait on it alone.

### 6\. Verdict

**(b) Fixably flawed — but two of the flaws are result-manufacturing rather than result-degrading, so the current version would be worse than uninformative.** The case-control skeleton, the point-in-time discipline, and the pre-registered bar are all sound instincts, and matching on distress is the right question to be asking. Must-fixes, in order: re-anchor T0 to petition/first-default and drop the insolvency-filings flag (non-negotiable); stop reporting precision from a matched sample — report odds ratio/TPR/FPR and project precision at an independently-estimated universe base rate; freeze a unit-weight score with no threshold tuning; extract blind to case status; benchmark against a financials-only baseline and sell only the increment; define lead time relative to first conventional signal; start the prospective freeze now.

Confidence: high on Flaws 1 and 2 — the mechanisms are structural, not speculative. Medium-high on the overfitting and clustering concerns (they depend on how contaminated you already are by the pilot and how concentrated your case vintages turn out to be). One honest caveat the other way: if Kill-test A shows the *pledging and RPT* flags firing well before first default, that's a genuinely promising sign, because those two are the flags least explainable as death-process debris — they reflect promoter behavior, which is exactly the governance story you're trying to sell.

---

**You**

Good critique. Now do the opposite job: give me the ONE experiment you would actually RUN — complete and executable — that you'd stake your reputation on as the decisive test. Not a list of principles; the actual protocol I could hand to an engineer tomorrow. Fix every flaw you just found. Design within these REAL data constraints (what I actually have): - ~45 hand-verified insolvency cases (Indian IBC/NCLT), each with an admission date; I can also pull the petition-filing date from NCLT/IBBI records, and first rating-action/default dates for many. - Filing history is ~2 years deep; extraction is coarse keyword today, LLM-level possible with effort. - Flags available: auditor resignation; CFO/CS/independent-director exit; promoter share-pledging (LISTED companies only); related-party-transaction spikes; chronically late results; insolvency filings. - A survivorship-free company universe exists; financials for a distress baseline (leverage/Altman) would need pulling and arrive late for private companies. Specify EXACTLY: 1. UNIVERSE & SAMPLING — cohort? case-cohort? what is the comparison group and how is it sampled? 2. THE CLOCK — what event anchors "time zero" and why (given admission lags the real default); what is the measurement window. 3. FEATURES — which flags in, which out, and how you neutralize the self-leaking / "death-debris" flags and the filing-volume confound. 4. BASELINE TO BEAT — what free/standard model must governance beat, and how you measure the increment. 5. METRICS + PASS/FAIL BAR — the exact real-population metrics (NOT matched-sample precision) and the numeric threshold that means "build it" vs "kill it," decided now. 6. VALIDATION — how you guard against overfitting / regime-dependence with only ~45 cases and 2 years of depth. Be honest if it's not fully possible. 7. THE 2-DAY KILL VERSION — the cheapest subset of your design that could kill the whole thing in ~2 days of hand-work, before any big build. 8. THE ONE RISK YOUR OWN DESIGN STILL CAN'T BEAT — don't oversell; name the residual threat that would still make a skeptic doubt a positive result. Blunt, concrete, executable. No fabricated numbers. If two designs tie, pick one and say why.

---

**Claude**

Here is the protocol. I'll name it so we can refer to it: **RETRO-CC + FREEZE** — a retrospective case-cohort study anchored to petition filing, run in parallel with a sealed prospective freeze. One design, two arms, because with 45 cases and 2 years of depth no purely retrospective result will fully convince a skeptic (see §8), and the freeze costs almost nothing extra.

Where I state a numeric bar, that's a design decision I'm making now, not an empirical claim — that's the point of pre-registration.

---

### 1\. Universe & sampling — case-cohort, not matched case-control

**Universe:** all companies in your survivorship-free registry that were (a) active as of the sampling date, (b) have ≥18 months of filing history available, and (c) fall in a size band covering your cases (set the band as the 5th–95th percentile of case revenue/assets, defined before looking at flags). Call this U. Compute |U| — you need it for base-rate projection.

**Cases:** all ~45 IBC cases, minus any that fail the eligibility rules above (a case with only 8 months of filing history before its clock date must be dropped, not padded — record every exclusion and the reason).

**Subcohort:** a simple random sample of **400 companies from U**, drawn with a seeded RNG, sampled with *no reference to outcome*. If a sampled company later turns out to be one of your cases or entered insolvency in the follow-up window, it stays in the subcohort — that's how case-cohort works and it's what keeps the base rate honest. Do not match. Matching is handled at analysis time by *adjusting* for sector/size/leverage (§4), which preserves your ability to compute absolute, universe-level numbers.

Why 400: it's the smallest round number that (i) gives you a few hundred flag-extraction jobs, feasible at keyword level in days, and (ii) makes the subcohort's own noise small relative to the noise from 45 cases, which dominates everything regardless. Going to 1,000 buys you almost nothing because the cases are the binding constraint.

**Stratification, one exception to pure randomness:** oversample listed companies 2:1 relative to their universe share (then weight back). Reason: pledging — plausibly your best flag — only exists for listed names, and a pure random draw from an Indian registry will be overwhelmingly private, leaving the pledging analysis starved.

### 2\. The clock

**T0 = NCLT petition-filing date**, not admission. Pull it from NCLT/IBBI records for every case; where you also have a first-default or first-rating-action-to-default date that *precedes* the petition, use the earliest of the three. Call this T0\*. Rationale: the clock must be the earliest publicly observable point at which the market "knows," because everything after that point is echo, not prediction.

**Measurement window: \[T0* − 24 months, T0* − 6 months\]\*\*, with flags recorded with their own dates so lead time is computable per flag. The 6-month buffer is the anti-echo guard: even the petition date can trail the real default by a few months when default dates are unavailable, and 6 months absorbs most of that slack. The 24-month start is forced by your 2-year filing depth — acknowledge in the writeup that flags requiring a longer baseline are structurally handicapped.

**Subcohort clock:** each subcohort company is assigned a pseudo-T0\* drawn from the empirical distribution of case T0\* dates (match the calendar distribution, seeded RNG). This is essential — if cases are measured in windows ending in, say, 2024–25 and controls "as of now," any calendar trend in filing behavior becomes fake signal.

**Risk-set rule, decided now:** a subcohort company that files/receives a petition *within* its measurement window is measured anyway and labeled by what happens in follow-up; one whose insolvency event falls within **18 months after** its pseudo-T0\* is a positive; beyond that, negative. 18 months is the label horizon — it matches the "next 1–2 years" claim you're selling.

### 3\. Features

**In, tier 1 (promoter-behavior flags — the product thesis):**

- Promoter pledge level and 6-month change (listed only; analyzed as a listed-subgroup result, never pooled silently with private names).
- RPT spike: RPT value as a share of revenue, current filing vs. prior filing, flag if it exceeds a multiple fixed now (I'd set 2× prior period AND >5% of revenue — crude, but frozen).

**In, tier 2 (personnel flags, with a death-debris neutralizer):**

- Auditor resignation, CFO/CS exit, independent-director exit — but each counted **only if it occurs ≥9 months before T0** \*, i.e., only in the first 15 months of the window. Resignations in the last stretch before a petition are overwhelmingly reactive. This throws away real signal; that's the price of a clean claim. Record the late ones separately for descriptive purposes, never in the score.

**In, tier 3, redefined:**

- Late results — but normalized as a *change*: late in the window AND on-time in the earliest observable period. A company that has always filed late is a sloppy company, not a dying one. Companies with no early baseline get this flag set to missing, not zero.

**Out, permanently:** insolvency-related filings (it's the label), and any flag whose extraction requires text produced after T0\* − 6 months.

**Filing-volume confound, the sneaky one:** every flag's *opportunity* scales with how much a company files. Fix: extraction runs on a fixed document-type checklist per company (annual report, board-change filings, auditor-change filings, pledge disclosures, results-filing dates), identical for cases and subcohort, and each flag is defined against that checklist, not against free-text volume. A company missing a checklist document gets "missing," and you report missingness rates for cases vs. subcohort — if they diverge badly, that's itself a finding (and a warning).

**Blinding:** the engineer running extraction gets a shuffled company list with no outcome labels. Keyword extraction first; LLM extraction only if the kill-test (§7) passes, and then re-run blind on everything, never selectively on cases.

**Score:** unit-weight count of fired flags (missing ≠ zero; a company's score is flags fired over flags observable, times flags observable — report both raw count and this coverage-adjusted version, primary = raw count with a minimum-coverage inclusion rule of ≥4 observable flags). No fitted weights. Frozen before labels are joined.

### 4\. Baseline to beat

**Baseline model:** sector + size + a leverage/coverage score (Altman-Z-style for manufacturers, debt/EBITDA + interest cover where Z doesn't apply), computed *point-in-time* — using only statements publicly filed before T0\* − 6 months, with MCA filing lag respected (use the filing date, not the statement date). Yes, pulling this for private companies is slow; it is not optional. A governance signal that can't beat free financials has no buyer, so the baseline is the product's null hypothesis, not a nice-to-have. Budget the financials pull for the 45 cases + 400 subcohort only — that's the whole point of case-cohort, you never touch the rest of U.

**Increment measurement:** logistic model with case-cohort weights (Prentice weighting — standard, any stats library), baseline covariates only vs. baseline + governance score as a single added variable. One added degree of freedom, which is all 45 positives can support. Deliverables: (a) the governance coefficient with CI, and (b) the operational translation — lift curves for baseline vs. baseline+governance, weighted back to U.

### 5\. Metrics + pass/fail bar, fixed now

All metrics computed with case-cohort weights so they estimate **universe-level** quantities. Headline metric: **recall among true insolvencies at a 5% alert budget** (i.e., flag the top 5% of U by score) — call it R@5%. Companion: projected precision at the measured universe base rate, reported with its CI, never the in-sample fraction. Third: **median lead time of the first tier-1/tier-2 flag ahead of T0** \*, and separately ahead of first rating action where available.

**Build bar (all three, decided now):**

1. Baseline+governance R@5% exceeds baseline-alone R@5% by an absolute margin whose 90% CI excludes zero (with 45 cases, that CI is wide — this bar is harder than it looks, deliberately).
2. Governance coefficient in the weighted model positive with p < 0.05 (one added parameter, so this is not a multiple-testing farm).
3. Median lead time ≥ 6 months ahead of T0\* (mechanically guaranteed ≥6 by the window; the real test is the rating-action comparison — median flag date must precede first default-grade rating action for the cases where ratings exist).

**Kill bar:** fail any of the three → the retrospective evidence does not support building. No re-running with tweaked flag definitions, new windows, or a 10% alert budget "just to check" — every such re-run converts the study into the overfitting exercise we're guarding against. The only permitted follow-up after a kill is the prospective freeze, which is already running.

### 6\. Validation — honest limits

With ~45 positives from a ~2-year vintage window, true out-of-time validation is **not fully possible**, and I won't pretend otherwise. What the design does instead:

- **No fitting:** unit weights, frozen definitions, one added model parameter, one alert budget. Overfitting risk is mostly eliminated by having almost nothing to fit. The residual contamination is *you* — your flag choices post-pilot — which cannot be removed retrospectively, only disclosed.
- **Temporal split as a robustness check, not a headline:** split cases by T0\* median date into early/late halves and check the governance coefficient has the same sign and similar magnitude in both. With ~22 cases per half this detects only gross regime-dependence; report it as such.
- **Sector-cluster jackknife:** drop each sector's cases entirely, re-estimate. If the result survives only because of one sector's blow-up cluster, the CI story is a lie and the writeup must say the signal is sector-specific.
- **The real validation is the freeze:** on the day the retrospective study's rules are frozen, score all of U with the same frozen pipeline, write the ranked list to a file, hash it, timestamp it (a public git commit works), and evaluate at +12 months against new IBBI admissions. This is the only arm of the design that produces evidence a hostile skeptic cannot dismiss, and it's also the cheapest — it reuses the entire pipeline.

### 7\. The 2-day kill version

Day 1: for all 45 cases, pull petition-filing dates and, where available, first default/rating-action dates. Compute the admission-minus-petition and petition-minus-default lags. *Output: the true clock geometry of your own dataset.* If defaults typically precede petitions by more than ~12 months, even my window is partly echo and must be widened or the project re-scoped.

Day 2: pick 10 cases (seeded random, not cherry-picked). By hand, build each company's full timeline: every governance flag with its date, plus default/rating/petition/admission dates. Then the one plot that decides everything: flag dates relative to first-default (or petition where default is unknown).

**Kill rule:** if fewer than ~4 of 10 cases show *any* tier-1 or tier-2 flag firing ≥6 months before first default/petition, stop — there is no lead time to sell, and no study design manufactures lead time that doesn't exist. If 4+ do, proceed to the full build. (Threshold logic: you're selling ≥30–50% recall at meaningful lead; below 4/10 on a hand-check, the ceiling on recall is already under your sellable floor before any false-positive cost is even counted.)

Note what the kill version *cannot* tell you: whether the subcohort fires the same flags just as often. Passing day 2 means "signal exists in cases," not "signal discriminates." That's what the full study is for.

### 8\. The one risk this design still can't beat

**Retrospective flag selection — the researcher is the leak.** You chose these six flag families partly *because* they're the things everyone has seen in famous Indian blow-ups, and partly informed by your own pilot. That means the retrospective study is, at the meta level, testing hypotheses that were suggested by (a cousin of) the data it's tested on. Freezing weights and thresholds stops numeric overfitting; it cannot stop the fact that the feature list itself was born from hindsight on this ecosystem. A skeptical buyer's strongest remaining objection to a positive retrospective result is exactly this — "of course auditor resignations look predictive on the 2023–25 IBC cohort; that's the cohort that taught you to look at auditor resignations" — and there is no retrospective fix.

That's why the freeze arm is not decoration. It's the answer to the one objection the main study can't answer. A positive retrospective result gets you a decision to keep building; only the sealed, timestamped, out-of-time result gets you something you can put in front of a credit-risk officer and stake a fee on. Twelve months feels long; it's also exactly the product's claimed horizon, so a buyer would be right to insist on it.

---

**You**

Given ~2-year data depth, and that the bankruptcy-court date lags real distress by months-to-years, is there any valid way to test a leading governance signal — or does the data reality already make this a null?

---

**Claude**

The core constraint is whether the 2-year filing depth actually allows for a testable structure. The lag problem can be solved by re-anchoring to petition or default dates, but that creates a timing squeeze: I need a 24-month window before my anchor point, the anchor itself has to be recent enough that filings actually exist, and then there's the follow-up period to account for. Let me work through whether the math actually works out given that filing history only goes back to mid-2024.

For a case with an anchor point in early 2026, the lookback window spans mid-2024 to mid-2025—barely within coverage. Earlier anchor points push the window into data gaps, which shrinks the usable retrospective sample drastically. But this isn't automatically fatal; it's an empirical question I can check: petition-to-default lag distribution, how many cases have recent-enough anchors for window coverage, whether the flags actually fire early enough. The prospective freeze design sidesteps this entirely since it works forward regardless of depth.

The honest answer is that the retrospective test is conditionally valid—it depends on whether I can identify the earliest anchor date, fit the window inside available data, and have enough cases remaining after filtering. For private companies without public distress markers, I might not be able to verify the lead at all, which could restrict the claim to rated or listed names only.

---

**You**

Good. Now commit: design the specific test you would stake your reputation on, using ONLY the data we actually have — ~2 years of filings, fewer than 10 clean recent collapse cases, and an unreliable court-date "clock." Be concrete and executable: no fabricated numbers, no "assume we get more data." If your honest conclusion is that it CANNOT be validly tested with this data, say so plainly, and say what you would tell the customer instead.

---

**Claude**

With fewer than 10 cases available, I need to abandon the retrospective statistical approach and shift to a prospective design instead. I'll do a hands-on timeline reconstruction of the cases we have without trying to manufacture false statistics, then figure out what's actually honest to communicate to the customer.