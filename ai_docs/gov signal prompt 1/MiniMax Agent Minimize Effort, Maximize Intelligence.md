---
title: "MiniMax Agent: Minimize Effort, Maximize Intelligence"
source: "https://agent.minimax.io/mavis?id=415287723139172"
author:
published:
created: 2026-07-02
description: "Discover MiniMax Agent, your AI supercompanion, enhancing creativity and productivity with tools for meditation, podcast, coding, analysis, and more!"
tags:
  - "clippings"
---
ROLE: You are a skeptical quantitative research reviewer and experiment-design red-teamer. I'm about to spend two weeks running an experiment and I'm worried I'll fool myself. Your job is NOT to encourage me — it's to find every way this experiment could produce a good-looking result that is actually meaningless, and to tell me the cheapest design that would genuinely settle the question. Assume I am biased toward my own idea. Be blunt. Do not rubber-stamp. THE QUESTION I'M TRYING TO ANSWER: Can a set of "governance red flags" — extracted from companies' public regulatory filings, measured on a company TODAY — reliably distinguish companies that will hit severe distress / insolvency in the next ~1-2 years from otherwise-similar companies that won't? Reliably enough that a fund / credit-risk team would pay for it as an ongoing early-warning "monitoring" feed. CONTEXT / DATA REALITY (India; private + small listed companies): - The red flags come from public filings: auditor resignation; sudden CFO / company-secretary / independent-director exit; promoter share-pledging level or rise; related-party-transaction spikes; chronically late financial results; insolvency-related filings. - Extraction from the filings is imperfect and fairly coarse (keyword-level today; possibly LLM-level later). - Filing history is only ~2 years deep. - "Who actually went insolvent" (the labels) comes from the insolvency regulator's official records, each with an admission date I'll call T0. - A small earlier pilot was inconclusive; I'm now designing the decisive version. (I'm deliberately NOT telling you the pilot's numbers so you reach your own view.) THE DESIGN I'M CONSIDERING (please tear it apart): 1. CASES: ~40-50 companies that entered insolvency, each with its admission date T0. 2. CONTROLS: for each case, several (5-20) surviving companies matched on sector, size, AND financial leverage/distress as of 18 months before T0 — so the only thing left differing is governance, not just "troubled vs healthy." 3. MEASUREMENT: for every company (cases and controls), count the governance red flags using ONLY information available in the window from 18 months to 6 months before T0 (point-in-time, no peeking after that). 4. SCORING: combine the flags into a score, pick a threshold ("flag if score ≥ X"), then report PRECISION (of the companies I flag, what fraction actually went insolvent), RECALL (of the insolvencies, what fraction I flagged), and how many months early. 5. I'll write the pass/fail bar down in advance. DELIVER (specific, blunt, no flattery): 1. INDEPENDENT DESIGN: if YOU had to answer the core question cheaply and convincingly, how would you design it? Design it fresh BEFORE critiquing mine — don't just anchor to my version. 2. RED-TEAM MY DESIGN — biggest flaws, ranked. Specifically hunt for: - The WRONG METRIC — is precision/recall even the right thing? what metric would mislead me? - CONFOUNDS that could fake a good result: survivorship bias; look-ahead / leakage (esp. flags in the window that are really early echoes of the insolvency itself = label contamination); distress-vs-governance (am I measuring governance or just leverage?); base-rate realism (insolvency is rare — what does a 1:many case:control ratio do to precision, and am I estimating it honestly?); threshold/feature choices made after seeing the data (overfitting); coincident-vs-predictive (does the signal LEAD the event or just coincide?); generalization (does a signal fit on past blow-ups hold on unseen ones?). 3. THE SINGLE MOST LIKELY WAY I FOOL MYSELF here. 4. THE BUYER TEST: what MINIMUM result (metric + level) would a skeptical fund / credit-risk officer need before paying for this as a monitoring feed? Would they act on an early-warning that's right, say, 30% of the time? What false-alarm rate makes it useless? 5. CHEAPER ALTERNATIVES: any design that answers the question with less data / less hand-work, or a faster kill-test that would tell me to stop. 6. VERDICT: is this design (a) SOUND, (b) FIXABLY FLAWED — list the must-fix changes, or (c) FUNDAMENTALLY MISCONCEIVED — and why. State your confidence. RULES: Be blunt; assume I'm biased. If you make a statistical claim, be concrete about the mechanism. Don't invent references or numbers — reason it through. If a part is fine, say what makes it fine AND its residual failure mode.

03:01

The user wants a skeptical, quantitative red-team review of their experimental design. This is a serious analytical task — no fluff, no flattery, just rigorous critique. Let me think through this carefully.

The question: Can governance red flags (from public Indian regulatory filings) measured today distinguish companies that will hit severe distress/insolvency in the next 1-2 years from similar companies that won't?

Let me think hard about each piece.

**The user's design:**

- 40-50 cases (insolvent companies) with T0
- 5-20 controls per case, matched on sector, size, financial leverage/distress as of 18 months before T0
- Measure flags in window \[T0-18m, T0-6m\] only
- Combine into score, pick threshold, report precision/recall
- Pre-register pass/fail bar

Let me think about each potential flaw:

**1\. Case-control ratio destroys precision estimation**

This is the big one. If the base rate of insolvency in the relevant population is, say, 0.5% per year, and you sample cases and controls at 1:10, your "precision" estimate is wildly inflated. This is the classic base-rate fallacy in case-control studies.

Example: Suppose the true positive rate (sensitivity/recall) is 30% and true false positive rate is 5% in the real population.

- In a 1:10 case-control design: apparent precision = (0.3 \* 1) / (0.3 \* 1 + 0.05 \* 10) = 0.3/0.8 = 37.5%
- In the real population with 0.5% base rate: precision = (0.3 \* 0.005) / (0.3 \* 0.005 + 0.05 \* 0.995) = 0.0015/0.05125 = 2.9%

The user is measuring the wrong thing. With 1:10 ratio, their precision estimate is 12x too high. The honest precision at realistic base rates will be terrible.

**2\. Matching on financial leverage 18 months pre-T0 is not "matching on distress"**

The user wants to isolate governance signal from financial distress signal. But by 18 months before insolvency, leverage is already elevated — they will end up with a control pool of similar-leverage but later-also-failing companies, OR with healthy but similarly-leveraged companies (which is impossible to find for highly distressed cases). The matching variable is essentially the outcome variable.

Better: a control pool drawn from the SAME cohort — same year, same sector, similar size — and let the distress variable be a feature, not a matching variable. Or, the right approach: in the real population, do you have many highly-leveraged companies that DON'T go insolvent? If the matching leaves only mildly-leveraged companies, you've made controls trivially different from cases.

**3\. Window choice \[T0-18m, T0-6m\] is dangerous**

- T0-6m: the most damning red flags (auditor resignation, etc.) often happen in the last 6 months before formal insolvency. So the user excludes them, but...
- The user might still have flags that are early echoes of the insolvency process. e.g., promoter pledging rising 12 months before T0 is often BECAUSE the company is already heading for insolvency, not an independent signal. So the flags may not be predictive — they may be coincident or even downstream of the same root cause.
- A genuine predictive design would use information available at, say, T0-24m or earlier, and ask: "in the next 24 months, did this company go insolvent vs not?"

**4\. Cross-sectional scoring with hand-picked threshold is overfitting**

Picking a threshold on the same data you evaluate on = overfitting. Need a held-out test set, or cross-validation with proper holdout.

**5\. The signal might not exist**

Maybe governance flags are a symptom, not a cause. Maybe they're coincident with distress, not predictive. Companies that go insolvent are distressed at T0-18m, and the audit/governance red flags are the board's response to distress, not a leading indicator.

**6\. The 2-year filing history is a problem**

If filings go back only 2 years, you can't use a 24-month lookback. The 18-month pre-T0 window is constrained by data availability, which means the user might be overstating how early the signal fires.

**7\. LLM extraction noise**

Imperfect extraction at the company level means the signal-to-noise is low. If precision is at the edge of significance, extraction noise alone could explain the result.

**8\. "What fraction of companies I flag actually went insolvent" is precision in a case-control design**

This is the case-control precision, not the real-world precision. The user is computing PPV under a 1:10 sampling ratio and calling it precision. It's not.

**9\. The pass/fail bar matters a lot**

What's "good enough"? Without it, you'll rationalize.

**Now, the INDEPENDENT DESIGN — what would I do?**

For a fund/credit officer, the real question is: "Among all companies I'm monitoring, which ones should I escalate for deeper review?" That's a population question, not a case-control question.

Independent design:

1.Define the population of interest (say, all listed + unlisted companies above a revenue threshold in India, ~5,000-10,000 companies).

2.Pick a date D, use only information available at D.

3.Score all companies on governance flags as of D.

4.Wait 12-24 months. Record which ones enter CIRP/insolvency.

5.The metric of interest: at a chosen flag-rate (e.g., top 5% of scores), what is the precision (PPV) and recall (sensitivity) in the actual population?

6.Pre-register the score formula and threshold on data BEFORE the labels arrive.

7.Repeat with rolling dates for out-of-time validation.

8.Report the precision at the chosen recall target.

Critical: a prospective, out-of-time, full-population study. No matching. Just the natural base rate.

You might still use a small case-control pilot to design the score, but the final claim is the prospective precision.

**The Buyer Test**

A credit officer thinks in terms of:

- "If I flag a company, what's the chance it actually fails?" (precision/PPV)
- "Of the failures, what fraction do I catch?" (recall/sensitivity)
- "How much lead time do I get?"

For a monitoring feed, the buyer typically needs:

- Precision ≥ 5-10x the base rate (so the signal adds information)
- A lead time of at least 6-12 months (so they can act)
- Coverage (recall) of 30-50% of failures
- False positive rate that doesn't drown the team (e.g., 5-10% of the monitored universe)

If the base rate is 0.5% per year, 30% precision is 60x the base rate — that's genuinely useful. 5% precision is 10x the base rate — still useful.

But: 30% precision over 5,000 companies, even at 0.5% base rate, means 175 flagged companies per year, of which ~52 are real failures. If you can absorb 175 reviews/year for 52 catches, fine. If not, you need higher precision.

The crucial buyer question: "What is the BASE-RATE-ADJUSTED lift?" — i.e., the precision divided by the unconditional base rate. If your precision is 5% and the base rate is 0.5%, your lift is 10x. That might be a sellable feed.

**The most likely way to fool yourself**

1.Compute case-control precision, not population precision. Get a number that looks good (say, 40%) and forget that it corresponds to 4% in the real population.

2.Pick the threshold after seeing the data. Optimize to look good in-sample.

3.Use flags that are actually early echoes of the insolvency process (e.g., "auditor concerns" that were filed in the 6-18 month window because the company was already distressed).

4.Match on distress so aggressively that the controls are also "going to fail" companies — biasing upward.

5.Cherry-pick the test window.

Let me structure my response. The user wants:

1.INDEPENDENT DESIGN

2.RED-TEAM (with specific hunting)

3.SINGLE MOST LIKELY WAY TO FOOL ONESELF

4.BUYER TEST

5.CHEAPER ALTERNATIVES

6.VERDICT

I should be specific, blunt, and concrete. Let me draft this carefully.

I should be very direct and avoid any sycophancy. I should be quantitatively rigorous where it matters. I should be willing to say "your design has a fatal flaw" if it does.

Let me also think — is this design "fundamentally misconceived" or "fixably flawed"?

I think the design is **fixably flawed** with one critical fix needed: the case-control framing makes the metric invalid for the actual buyer question. The core idea is reasonable (use governance flags as an early warning), but the way the result will be measured is wrong, and the user will report a precision that doesn't exist in the real world.

A second critical fix: the matching on financial leverage could be matching on the outcome. A third: the threshold should be pre-registered properly.

I want to also think — is there any version of the design that works? Yes: a prospective, out-of-time, full-population evaluation. That's the honest test.

Let me also think about cheaper kill-tests:

- Look at just the 5 strongest flags (auditor resignation, CFO exit, promoter pledging spike, RPT spike, late filings) and see if ANY one of them in a 12-24 month window has a population-level lift over base rate. If not, kill the project.
- Use only the most recent year's data (cross-sectional snapshot, no time series needed).

OK, let me write this up. I'll be direct, concrete, and quantitative.

Let me also be careful: I should not invent specific numbers. I should reason from general principles. Where I use numbers, they're illustrative ("suppose base rate is 0.5%") not asserted facts.

The user explicitly said "don't invent references or numbers — reason it through." So I should keep numbers illustrative and clearly labeled as such.

Length: this is a serious analytical review. The user wants depth. I should write a substantial response — but I should be efficient with words. No fluff.

Let me write the response now.

Format: I think Markdown with sections matching the user's six asks is right. They asked for a specific structure, I'll follow it.

Let me think about the case-control math one more time to be precise.

In a case-control study with C cases and K controls per case (matching):

- The "precision" you compute is the proportion of flagged individuals who are cases
- In the matched sample, you have C cases and KC controls
- If your flag identifies F% of cases and f% of controls: precision\_in\_sample = CF / (CF + KC\*f) = F / (F + Kf)
- This is NOT the real population precision

In the real population:

- Base rate of cases = p (very small)
- Real precision = pF / (pF + (1-p)\*f)
- For p=0.005, F=0.30, f=0.05: real precision = 0.0015 / (0.0015 + 0.995\*0.05) = 0.0015/0.05125 ≈ 2.9%
- Sample "precision" with K=10: 0.30 / (0.30 + 10\*0.05) = 0.30/0.80 = 37.5%

So a 12x inflation. The case-control "precision" is essentially the likelihood ratio times the K, and it tells you nothing about real PPV.

That's the trap. And it's the most likely way the user fools themselves.

OK, writing the response now.

One more thought: the user's window \[T0-18m, T0-6m\] is also suspect. T0-6m excludes the 6 months right before T0, but flags in the 6-18m window are still often consequences of distress, not causes. A purer test: use only flags observable 24+ months before T0. With only 2 years of filing history, that's essentially impossible — another reason the design is constrained.

Also: the matching on "financial leverage/distress 18 months pre-T0" — if the matching variable is the same as the outcome, the controls aren't controls. Companies at 18 months pre-insolvency look like companies at 18 months pre-insolvency. If you match on the matching variable and the case-cohort's leverage is high, you have to find other companies with similar leverage. But "similar leverage" + "didn't fail" is a strong filter. If the matching is too loose, the leverage differs and you're back to "distress vs governance" confound. If too tight, you have weird controls.

Better: don't match on leverage. Include leverage as a feature, alongside governance flags. Or use a stratified design where you evaluate the marginal value of governance flags given leverage is known.

Alright, writing now.

One more thing: the user said "I'll write the pass/fail bar down in advance" — that's good. But what should that bar be? The bar should be in real-population terms (precision at fixed flag rate, lead time, recall), not in case-control terms.

Let me write a strong, specific response.

## Red-team review of the governance-flags insolvency experiment

Let me be direct: **the design is fixable, but as stated it will produce a number that looks meaningful and is not. The single biggest risk is a case-control precision that has no relationship to the precision a fund/credit team will actually experience in production.** That is the trap you will fall into. I'll work through everything, then come back to that.

### 1\. Independent design — how I'd actually answer this

Before touching your version, here is the design I'd build from scratch. The question you want to answer is fundamentally a **prospective population question**, not a case-control question: "Among the ~5,000-10,000 Indian listed + sizeable private companies I'm monitoring, if I score them today on governance flags and flag the top X%, what fraction of those flagged companies will be in CIRP/severe distress 12-24 months later, and what fraction of actual failures do I catch?"

**The design:**

1.**Define the universe explicitly.** All companies above some revenue/asset threshold in India, as of a fixed date D₀. Don't cherry-pick sectors. Lock this list.

2.**Snapshot date D₀.** Score every company in the universe using ONLY information filed and publicly available as of D₀. This is your "point-in-time" score. No peeking.

3.**Score formula is pre-registered and frozen** before D₀, using only data prior to D₀. This is the hardest part and the one most experiments fudge. You can develop the formula on data up to, say, D₀ − 24 months, and freeze it.

4.**Choose the operating point by flag-rate, not threshold.** "I will flag the top 5% of scored companies." Lock the flag-rate, not the score threshold. (Reason below.)

5.**Wait 24 months. Then read labels.** Resolve who entered CIRP / NCLT / winding-up / severe default between D₀ and D₀ + 24m. Use the official insolvency regulator's records. This is your prospective outcome.

6.

**Measure three things:**

- **PPV (precision) at the locked flag-rate** in the actual universe.
	- **Sensitivity (recall)** — fraction of all observed failures that you flagged.
	- **Lead-time distribution** — for each caught failure, when did the flag first appear relative to T₀.

7.**Out-of-time validation.** Repeat the whole thing at D₁ = D₀ + 12m and D₂ = D₀ + 24m with a frozen score formula. If precision collapses, you don't have a signal; you had a fit.

8.**Pre-register the pass bar in real-population terms**, e.g.: "We claim the feed is useful if PPV ≥ 5x the unconditional base rate, with at least 30% recall and median lead-time ≥ 6 months." This is the bar the buyer cares about, and it is **not** the number your current design will produce.

This is more work than yours in some ways (no matching, no per-case surgery) and less in others (no painstaking 1:many control selection). The matching you propose is doing two jobs it cannot do — see below.

### 2\. Red-team of your design — flaws, ranked

#### FLAW #1 (fatal-ish, the headline) — Your "precision" is not the precision a buyer gets. The case-control ratio inflates it ~10-30x.

This is the single biggest problem. Walk the math with me.

- Insolvency is rare. Plausibly a few tenths of a percent of the monitored universe per year. Call it `p` ≈ 0.5% / year (illustrative; you should compute the real base rate from your universe).
- Suppose a flag has true sensitivity `F` = 30% and true false-positive rate `f` = 5% in the population.
- **Real population precision** (PPV) = `pF / (pF + (1-p)f)` ≈ 0.0015 / 0.0513 ≈ **~3%**.
- **What your 1:10 matched design measures** = `F / (F + 10·f)` = 0.30 / 0.80 = **~37.5%**.

You will report "37.5% precision" and the real number is roughly 3%. That's a **~12x overstatement** at K=10. At K=5 it's ~6x. At K=20 it's ~25x. The "precision" you compute is approximately `K × real PPV` in the relevant regime — it scales with your matching ratio, which is a methodological choice, not a property of the signal.

**This alone means your headline metric is invalid for the buyer's question.** It's not a precision number they can use; it's a function of how many controls you decided to pull. You can make it say anything from 10% to 60% by changing K.

What to do instead: pick the operating point by flag-rate (top 5% of universe), measure PPV in the actual universe. Or, if you must use a case-control design, **convert the case-control estimate back to population PPV using the known base rate.** Then the number you report is the real one.

#### FLAW #2 — Matching on leverage/distress 18m pre-T0 is matching on the outcome.

You said: match on "financial leverage/distress as of 18 months before T0" so the only thing left differing is governance. Two problems:

- **18 months pre-T0 is already inside the failure process.** By then leverage is elevated because the company is going to fail. You're not matching on a "neutral" trait; you're matching on a correlate of the outcome.
- **The matched control pool is contaminated or trivial.** Either you find other high-leverage companies that didn't fail (which means you may be matching on something different than you think, because the failure rate at high leverage is high — so the matches are a small weird population), or you loosen the match and the leverage differs across cases and controls, in which case the "isolates governance" claim is false.

**The "distress vs governance" confound is the second-largest risk after #1.** Your design tries to fix it via matching, and the matching fixes it badly.

What to do instead: don't match on distress. Put leverage in the model as a feature. The honest question is: "given I already know leverage, does the governance score add information?" That's the real marginal-value question. A feed that requires you to ignore leverage to look good is not a useful feed.

#### FLAW #3 — The \[T0-18m, T0-6m\] window is contaminated by label leakage from the failure process.

You picked this window to "not peek after T0." Good. But the bigger leak is from before T0: many governance flags in the 6-18m window are themselves early echoes of the insolvency process, not independent leading indicators.

- Auditor resignations with "disagreement" language 12 months before CIRP — that's a consequence of the same distress, often the auditor flagging issues that will become the CIRP trigger.
- Independent director / CFO exits — often triggered by the board's awareness of impending failure.
- Promoter pledging spikes — often a cause of distress (forced sale → covenant breach), but on the timeline you measure, frequently co-incident with it.
- Late filings — partly administrative, partly because the books are bad because the company is failing.

**You're at risk of measuring the failure process under a different name.** A genuinely predictive design uses information available 24+ months before T0, before distress is visible in the financials. Your 2-year filing history makes this nearly impossible, and you should call that out.

What to do instead: run a sub-test on flags observable at T0-24m or earlier. If the signal disappears there, you don't have a leading indicator; you have a coincident one dressed up as predictive. A fund will not pay for a flag that lights up at the same time as leverage does.

#### FLAW #4 — Threshold picked after seeing the data = guaranteed overfit.

You say "pick a threshold (flag if score ≥ X), then report precision/recall." If X is picked by maximizing your chosen metric on the same sample, your precision/recall estimates are optimistically biased. With ~50 cases and ~500-1000 controls, you have enough flexibility to overfit by a lot. A threshold that splits 50 cases at 80% precision can drop to 30% in held-out data.

What to do instead: lock the threshold on a development set, evaluate on a held-out set. Or pick by flag-rate (top 5%) and live with whatever precision falls out. Even better: out-of-time validation as in the independent design.

#### FLAW #5 — Precision/recall are not even the right metrics for a monitoring feed.

You asked me to hunt for the wrong metric. Here it is:

- **The buyer thinks in terms of lift over base rate, not absolute precision.** A 5% precision in a universe with 0.5% base rate is a 10x lift — sellable. A 30% precision with 0.5% base rate is 60x lift — clearly sellable. The metric the buyer cares about is **PPV / base rate**, often called "lift" or "informational ratio."
- **The buyer also thinks in terms of workload.** At a 5% flag-rate over 5,000 companies, you're producing ~250 flags/year. Of those, only ~10-15 are real failures. That's the true cost-benefit ratio. If your precision is 3% in the population, you're producing 250 flags to catch 8 failures, and the credit team will tune you out after one cycle. **The hardest-to-achieve metric is precision at low false-positive rate** — what's your PPV at the top 1% of scores, not the top 10%?
- **Lead time matters more than you think.** A 3-month lead is mostly useless (the failure is already in the financials). A 12-month lead is genuinely valuable. Report the lead-time distribution, not just the mean.

What to do instead: report (a) lift over base rate, (b) PPV at multiple flag-rates (1%, 5%, 10%), (c) lead-time distribution conditioned on true positives, (d) recall at a flag-rate the buyer would actually tolerate.

#### FLAW #6 — Sector matching is fragile and probably under-identified.

India's listed + private universe is thin in many sectors. If you match cases to 5-20 sector/size peers, many controls will be near-duplicates, others will be poorly matched. Combined with FLAW #2, the matched analysis is doing a lot of work and may have a small effective sample size in many strata. Stratify your results by sector and watch the within-sector signal disappear.

#### FLAW #7 — Filing history depth caps the predictive horizon.

You have ~2 years of filing history. So your "18-month lookback" is at the limit of what the data supports. A 24-month lookback is not really 24 months for the average company. A signal that "fires 18 months early" is therefore firing roughly as early as the data permits — which means in production it will fire less early. Mention this.

#### FLAW #8 — LLM/keyword extraction noise is uncapped and may dominate.

If the score depends on noisy NLP, the score itself has measurement error. A 5-10% precision signal can easily be drowned in 15% extraction noise. Audit extraction agreement (kappa) on a holdout. If it's <0.7, you cannot interpret small precision differences.

#### FLAW #9 — Survivorship in the control pool.

Your "controls" are surviving companies as of T0. But companies that quietly delisted / merged / wound down without going through CIRP are missing from both cases and controls. If the governance signature is "exit via any channel" rather than "CIRP specifically," you underestimate the effect. Check: what fraction of your matched controls exited the universe by T0+12m in any way? If non-trivial, you have a survivorship bias.

#### FLAW #10 — Generalization.

A fit on 50 historical cases may not transfer. Indian insolvency has macro regime dependence (post-2018 IBC push, COVID moratorium distortions, 2022-23 credit slowdown). 50 cases over 2-3 years is a small sample, possibly drawn from a single macro regime. The buyer will ask: "does this work in a different macro regime?" You can't answer that yet. Plan for it.

### 3\. The single most likely way you fool yourself

**You compute case-control precision, anchor on it, and forget to convert it to population precision.** You will report a number like 35-50% precision, and it will feel like a real result. The real number, in the buyer's population, will be 2-5%. Your pass/fail bar, written in the same case-control terms, will be passed. The feed will go to a credit officer, the first cycle will produce 250 flags for 8-10 hits, and you'll get quietly fired.

The mechanism is: your matching ratio `K` is a free parameter. Doubling `K` roughly doubles your reported precision. You're picking `K` to make the experiment work. You probably won't notice you're doing it.

The second most likely way: **you pick a threshold on this data and report in-sample precision.** With 50 cases, even random features can be combined to look predictive at the 30-40% level with the right threshold. A held-out test will drop this. If you don't have one, the result is not real.

The third most likely way: **the flags in your window are early echoes of the failure, not predictors.** Even with the metric done right, the signal evaporates at T0-24m. You never test that, so you never know.

### 4\. The buyer test

What a skeptical credit officer needs to pay for a monitoring feed:

| Requirement | Minimum bar | Why |
| --- | --- | --- |
| **PPV / base-rate lift** | ≥ 5x (and ideally ≥ 10x) | Below 5x, the team can do as well with a simple leverage screener. |
| **Recall at a tolerable flag-rate** | ≥ 30% sensitivity at top-5% flag-rate | Below this, the feed misses more than it catches. |
| **Lead time** | Median ≥ 6 months; tail (25th pct of TPs) ≥ 12 months | 3-month lead is in the financials already. |
| **Stability across regimes** | Tested out-of-time / out-of-macro-regime | A signal that worked in 2020-22 and fails in 2024-26 is a one-off. |
| **False positives at the top of the score** | PPV at top 1% > base rate by ≥ 20x | The top of the score is what the team actually acts on. |

**Would they act on a flag that's right 30% of the time?** Probably not as a primary feed. 30% precision at 0.5% base rate is 60x lift — that's strong, but if it's at a 50% flag-rate, you've flagged 2,500 companies and only 750 are real failures? No, sorry, the precision is 30% so 750 are true hits, 1,750 are noise. That's a 7:3 noise-to-signal ratio in the team's queue. The team will get fatigued by month 3. **30% precision is only useful if it's at a low flag-rate** (e.g., 1-2%), in which case the absolute number of catches is small and the buyer's main use is "top of the queue, deep dive." That's a real product, but it's narrower than the headline sounds.

**The killer failure mode is "right sometimes, wrong often, always loud."** A 5% precision feed at 1% flag-rate is roughly a 10x lift and would be tolerable. A 30% precision feed at 30% flag-rate is unusable.

### 5\. Cheaper alternatives / faster kill-tests

**Kill-test A (1-2 days, no new data):** Compute your existing 5 strongest flags (auditor resignation, CFO/secretary exit, pledging spike, RPT spike, late filings) **on a known universe at a single past date D₀** and check population-level PPV against the actual CIRP outcomes in the next 18-24m. If even the single best flag doesn't clear 5x base-rate lift at top-5% flag-rate, **the project is dead**. Don't bother with the matched design.

**Kill-test B (1-2 days):** Take a held-out 20% of your 50 cases, freeze the score formula and threshold on the other 80%, evaluate population-style metrics. If the held-out lift is <3x base rate, kill it.

**Kill-test C (cheap, structural):** Ask: "do these flags fire 24+ months before T0, or only in the 6-18m window?" Look at the subset of flags observable at T0-24m. If most of the predictive power is in the 6-18m window, the feed is not an early warning, it's an end-of-cycle amplifier. Useful, but a different product and a different price.

**Cheaper design that actually answers the question:** the independent one in §1 — but skip the "wait 24 months" by using a historical prospective design. Pick D₀ = a fixed past date (say, 24 months ago), score the universe as of D₀ with data ≤ D₀, then read the actual CIRP outcomes over the next 24 months. This is the "out-of-time backtest." It costs the same as your case-control design in data, but gives you the right metric. No matching required.

**Minimum honest design:** historical prospective backtest, frozen score formula, frozen operating point (flag-rate), report PPV, recall, and lead-time at 12m and 24m horizons. Do this once. If the lift isn't ≥ 5x, the answer is no, and you saved yourself 2 weeks.

### 6\. Verdict

**(b) Fixably flawed.** Confidence: high.

**The must-fix changes:**

1.**Replace case-control precision with population PPV at a fixed flag-rate.** Convert everything to base-rate-adjusted lift. Your current metric is a function of `K`, not of signal quality.

2.**Stop matching on leverage/distress.** Put it in the model as a feature. Match on sector and size only, or don't match at all — use a prospective backtest.

3.**Lock the score formula and operating point before the test** on a development set with a hard holdout. No threshold tuning on the eval set.

4.**Test the predictive horizon explicitly.** Report signal strength at T0-24m and T0-18m separately. If the signal lives in T0-12m to T0-6m, call it an end-of-cycle flag, not an early warning.

5.**Add out-of-time validation.** Evaluate the same frozen formula at a second, later snapshot. A signal that holds once and not twice is overfit or regime-dependent.

6.**Pre-register the pass bar in real-population terms** (PPV ≥ X% at top-5% flag-rate, recall ≥ Y%, median lead-time ≥ Z months, lift ≥ 5x base rate). Write the case-control version of the bar explicitly so you can't accidentally drift.

7.**Audit extraction agreement** and bound the effect of NLP noise on the score.

8.**Report the lead-time distribution and the top-1% PPV**, not just overall precision/recall at one threshold.

**The design is not fundamentally misconceived.** The instinct — that governance red flags from filings might be a leading indicator of distress — is reasonable, and the data sources you have are the right ones. What's misconceived is the **evaluation framing**: you have set up an experiment that, by construction, will return a precision number that is 10-30x the real number and grows with your matching ratio. That is a methodological mistake, not a strategic one, and it's fixable in a few days. Once you fix it, the result — whatever it is — will be honest, and you'll know whether to spend the next two weeks.

**The brutal truth:** if you run the design as stated, you will likely pass your own (case-control) pass bar and produce a result that is not real. The single highest-leverage change is the first one: convert to population PPV. Everything else is a refinement.

If you'd like, I can sketch the exact backtest protocol — the snapshot date, the score-freeze procedure, and the four metrics to report — so you can run the kill-test in 2-3 days before committing two weeks.

03:04

Good critique. Now do the opposite job: give me the ONE experiment you would actually RUN — complete and executable — that you'd stake your reputation on as the decisive test. Not a list of principles; the actual protocol I could hand to an engineer tomorrow. Fix every flaw you just found. Design within these REAL data constraints (what I actually have): - ~45 hand-verified insolvency cases (Indian IBC/NCLT), each with an admission date; I can also pull the petition-filing date from NCLT/IBBI records, and first rating-action/default dates for many. - Filing history is ~2 years deep; extraction is coarse keyword today, LLM-level possible with effort. - Flags available: auditor resignation; CFO/CS/independent-director exit; promoter share-pledging (LISTED companies only); related-party-transaction spikes; chronically late results; insolvency filings. - A survivorship-free company universe exists; financials for a distress baseline (leverage/Altman) would need pulling and arrive late for private companies. Specify EXACTLY: 1. UNIVERSE & SAMPLING — cohort? case-cohort? what is the comparison group and how is it sampled? 2. THE CLOCK — what event anchors "time zero" and why (given admission lags the real default); what is the measurement window. 3. FEATURES — which flags in, which out, and how you neutralize the self-leaking / "death-debris" flags and the filing-volume confound. 4. BASELINE TO BEAT — what free/standard model must governance beat, and how you measure the increment. 5. METRICS + PASS/FAIL BAR — the exact real-population metrics (NOT matched-sample precision) and the numeric threshold that means "build it" vs "kill it," decided now. 6. VALIDATION — how you guard against overfitting / regime-dependence with only ~45 cases and 2 years of depth. Be honest if it's not fully possible. 7. THE 2-DAY KILL VERSION — the cheapest subset of your design that could kill the whole thing in ~2 days of hand-work, before any big build. 8. THE ONE RISK YOUR OWN DESIGN STILL CAN'T BEAT — don't oversell; name the residual threat that would still make a skeptic doubt a positive result. Blunt, concrete, executable. No fabricated numbers. If two designs tie, pick one and say why.

03:36

## The decisive experiment — one design, executable

I'm going to call this **the case-cohort historical prospective backtest**. Below is the full protocol. Every date and number is a real choice — you can pin them now and freeze them.

### 1\. Universe & sampling — case-cohort, not matched case-control

**Why this and not your design:** A 1:K matched case-control tells you the likelihood ratio, not the precision. You cannot convert that into a number a fund pays for without a base rate, and even then the conversion is fragile. The case-cohort design gives you a real population metric directly.

**Cohort.**

- **D₀ = 2024-01-01** (a fixed past date — pick this; do not change it).
- **Universe U(D₀)** = all companies on MCA21 with paid-up capital ≥ ₹1 Cr OR revenue ≥ ₹10 Cr, registered as "active" or "active+inactive" as of D₀, including those that later became struck off / merged / wound up (survivorship-free). Exclude companies already in CIRP/NCLT at D₀.
- Strata: (sector × listing status). 12 sector buckets (NSE industry macro), 2 listing buckets (listed / unlisted). 24 strata.

**Subcohort (the evaluation set).**

- Draw a **stratified random sample of n = 1,000** from U. This is the **subcohort C**.
- Expected cases in C over 24m: ~5-15 (at a ~0.5-1.5% / yr base rate). This is small, but it gives you an unbiased population estimate of the base rate and of PPV at the top of the score.

**The 45 cases.**

- These are your 45 hand-verified IBC admissions between **2024-01-01 and 2025-12-31** (24m forward window).
- For each case, also pull and record:
	- **T\_petition** = Section 7/9/10 petition filing date (NCLT / IBBI)
		- **T\_admit** = CIRP admission date (you already have this)
		- **T\_default** = first rating action / default / SMA-1 flag, where available (CRISIL, CARE, India Ratings, Brickwork, ICRA)
- **Critical: the 45 cases are used ONLY for score development and for sanity-checking the metric on the subcohort. They are NOT the evaluation set.** This separation is what makes the metric real.

**Cases already in C:** if any of the 45 cases are in C, exclude them from C and re-sample to keep n = 1,000. Cases are evaluated in a separate analysis using case-cohort weighting (see §5), not folded into the raw subcohort metric.

### 2\. The clock — three clocks, used in order

A "case" is an insolvency event. Which date you anchor on decides what "early" means.

**Primary clock: T\_petition.** A Section 7/9/10 petition is filed by a creditor / corporate debtor when the loss is visible enough to litigate. This is the right anchor for a buyer's question ("act before the company's problems become a legal event") because admission lags the petition, and the petition is roughly when the credit committee should be convening.

**Secondary clock: T\_admit.** CIRP admission. Use this if T\_petition is missing.

**Earliest clock: T\_default.** First rating downgrade to default / SMA-2 / first missed payment disclosure. Use as a third label for sensitivity: does the signal fire before the rating catches it?

**Measurement window:**

- **Lookback window:** 12 months ending at D₀ (i.e., 2023-01-01 to 2024-01-01). **Not 18, not 24.** Reason: you have ~2 years of filings, so 12m gives you full coverage; 18m gives you partial. Be honest about this — the leading-vs-coincident question is partially unresolvable for you, and saying so is the right move.
- **Forward window:** 24 months from D₀ (i.e., 2024-01-01 to 2025-12-31). All labels are settled by now.

**Why 12m and not 18m:** if the signal is real, you should still see lift at 12m lookback. The 18-24m claim is a buyer's claim, not a testable one in your data. Don't fake it.

### 3\. Features — what's in, what's out, and the volume confound

**In (with explicit definitions):**

| Flag | Definition | Window |
| --- | --- | --- |
| `auditor_resign` | Any auditor resignation, with or without qualifications | Last 12m |
| `cfo_exit` | CFO / CS / whole-time independent director exit (any reason) | Last 12m, count |
| `pledge_spike` | Promoter pledged shares: | Δ |
| `rpt_spike` | Related-party transactions: YoY increase ≥ 2x OR RPT/revenue ≥ 30% (last 12m vs prior 12m) | Last 12m |
| `late_results` | \# of late statutory filings / total expected filings | Last 12m |

**Out (and why):**

- **Insolvency-related filings / Section 8 / 9 / 10 references.** This is the label. Using it as a feature is using the answer as a question. **Hard exclude.**
- **Going-concern qualifications, fraud disclosures, auditor CARO qualifications that explicitly mention "material doubt" / "going concern" / "fraud."** These are downstream of the failure process — the auditor writes them because the company is failing. If you keep them, the score is not a leading indicator. **Hard exclude** for the headline metric; report a sensitivity test with them included, so the buyer can see the inflation. The gap between "with" and "without" is a real piece of information.
- **Pledge data for private companies.** Hard to source, sparse, unreliable. Impute 0 + indicator for "listed" so privates aren't penalized for missing data.

**Filing-volume confound.** Companies that file more produce more flags by random chance. Two neutralizations:

1.For each company, compute an "expected flag count" as the cross-sectional mean rate (by sector × size) and divide observed counts by expected. Use this rate, not the raw count.

2.Include `log(1 + number_of_filings_last_12m)` as a covariate in the score so any residual volume effect is absorbed.

**Survivorship confound.** The 45 cases are by definition still around at T\_petition. Many "matched" companies in your pilot probably weren't. Use the survivorship-free universe (step 1) and you'll get the right base rate.

**Self-leakage check.** Before evaluating the final metric, run a sanity test: plot flag prevalence as a function of time-to-T\_petition for the 45 cases. If `auditor_resign` and `cfo_exit` spike only in the 0-6m window before T\_petition, they're death-debris, not leading. Drop them and re-run. Report both versions.

### 4\. Baseline to beat — what governance must add to

The buyer already has the obvious stuff. Your score is worthless if it doesn't add to it. The baseline is:

**Baseline model B**: logistic regression (or a simple scorecard) on:

- `leverage` (D/E) at last available filing ≤ D₀
- `current_ratio`, `interest_coverage` (or DSCR) — where computable
- `altman_z` — where computable
- `log(revenue)` (size)
- Sector indicators
- Listing status indicator
- `late_filings_count` (administrative health, not governance)

Train B on the 45 cases + 5 size/sector/listing-status matched non-cases per case (matching on size/sector/listing — not leverage, see flaw #2 in the previous review). Freeze B's coefficients.

**Test model T = B + governance flags** (`auditor_resign`, `cfo_exit`, `pledge_spike`, `rpt_spike`, normalized `late_results`).

The relevant metric is **T vs B on the subcohort C**: at the same flag-rate (e.g., top 5%), does T give meaningfully higher PPV than B? If T and B are tied, the governance flags add nothing. The marginal lift = PPV(T) / PPV(B). This must be ≥ 1.5x for the flags to be worth paying for.

**Important:** because financials for private companies arrive late, the baseline is partial. Acknowledge this. The marginal-lift claim is most credible for listed companies; the subcohort metric stratified by listing status is the honest version.

### 5\. Metrics + pass/fail bar — decided NOW, in real-population terms

All metrics are computed on **subcohort C**, with PPV = (true positives in top X% of C) / (X% of |C|). Lift = PPV / (cases in C / |C|).

**Primary metrics:**

1.**Lift @ top 5% flag-rate** (T vs B)

2.**Marginal lift @ top 5%** = PPV(T, top 5%) / PPV(B, top 5%)

3.**Recall @ top 5%** = TPs in top 5% / total cases in C

4.**Median lead-time** for TPs in top 5% = median(D0 → T\_petition)

5.**Out-of-time ratio** = lift @ D₁ / lift @ D₀ (see §6)

**Pre-registered bar** (all must hold for PASS):

| Metric | PASS | KILL |
| --- | --- | --- |
| Lift @ top 5% (T) | ≥ **5x** | < **2x** |
| Marginal lift (T vs B) | ≥ **1.5x** | < **1.0x** |
| Recall @ top 5% | ≥ **30%** | < **15%** |
| Median lead-time | ≥ **6 months** | < **3 months** for >50% of TPs |
| Out-of-time ratio (D₁ / D₀) | ≥ **0.5x** | < **0.3x** |

**PASS rule: all five hold.** **KILL rule: any one fails, unless lead-time is the only failure and ≥ 30% of TPs have lead ≥ 6m.** State this rule on paper before running anything.

**Note on precision inflation from case-enrichment.** The 45 cases are not in C, but the cases-in-C base rate may be too small for stable PPV at top 1%. If |cases in C| < 5, report top 5% only and add a case-cohort-weighted analysis: re-weight the 45 cases by 1 / (subcohort sampling fraction) and recompute PPV. This is a real population estimate with a known variance.

### 6\. Validation — what's possible with 45 cases, honestly

**What you can do:**

- **5-fold CV on the 45 cases** for score development. Report CV-AUC and CV-precision@5%. Frozen.
- **Out-of-time backtest at D₁ = 2024-07-01**, frozen score formula, fresh subcohort of n = 500 (or re-sample from U at D₁). Forward window 18m to 2026-01-01. Compute the same 5 metrics. The ratio (D₁ / D₀) is the out-of-time stability. Even 0.5x is informative; < 0.3x is a kill.
- **Placebo test:** replace each governance flag with a randomly permuted version (preserving the marginal distribution). Run the full pipeline. Lift must collapse. If it doesn't, your pipeline is leaking.
- **Sector-stratified metrics.** Report lift and marginal lift in each of 4-5 broad sector buckets. If it works in 2 of 5 sectors only, that's a niche feed, not a general one. The buyer should know.
- **Lead-time stratified metrics.** Report PPV at horizons \[0, 6m), \[6, 12m), \[12, 18m), \[18, 24m). This is the real test of "leading vs coincident" that you can do.

**What you cannot do (say so):**

- You cannot do 5-fold CV on the subcohort (too few cases in C). The variance on PPV at top 5% with ~5-10 cases in C is wide. State the binomial CI on every PPV.
- You cannot fully separate leading from coincident. With 12m lookback max, you're always inside the failure process to some degree.
- You cannot test across macro regimes. Indian IBC has been one regime (2018-2026 with COVID distortion). Generalization to a new regime is an empirical question, not a design choice.
- 45 cases means score development has ~3-4 effective degrees of freedom. You have enough room for a 2-3 variable model, not a deep one. Keep the score simple (logistic regression on 5 flags + 4 baseline features, or a hand-tuned scorecard). If you build a 30-feature model, you are overfitting and you will not catch it.

**Pre-registered final claim:** "If all five pass criteria hold, we will claim the feed is a viable early-warning signal with 12-24m lead, in the regime and sectors tested. Replication at D₂ = 2025-01-01 in 2027 is required for production use." This is what you tell the buyer.

### 7\. The 2-day kill version — do this FIRST

If the kill version doesn't pass, stop. Don't build the full pipeline. This takes 1 engineer 2 days.

**Step 1 (½ day):** Get a list of all companies on the BSE/NSE as of 2024-01-01. Public, free. ~5,000 companies. Sample 500 by sector.

**Step 2 (½ day):** For each of the 500, plus the 45 cases, manually check 2 flags in filings between 2023-01-01 and 2024-01-01:

- Any auditor resignation? (BSE corporate announcements, MCA Form ADT-3 / MGT-14)
- Promoter pledging > 20% increase? (BSE quarterly shareholding pattern, SAST filings)

Two flags. Two people. Two days. ~6 minutes per company = 50 hours, but parallelize across 4-5 people and it's 1-2 days.

**Step 3 (¼ day):** For each company, also record CIRP admission in 2024 or 2025 (yes/no). Use IBBI public list.

**Step 4 (¼ day):** Compute:

- **Flag prevalence in cases** (45): X%
- **Flag prevalence in 500-sample non-cases**: Y%
- **Prevalence ratio** = X / Y
- **Sample-PPV at top 5%** (matched-sample, just for sanity, knowing it inflates): if you flag 25 of 500 by score, and 5 are real cases, sample-PPV is 5/25 = 20%. Lift vs base rate (45 / 545 ≈ 8%) = 2.5x. This is matched-sample, so inflation is real — but the prevalence ratio is not.

**Kill rule for the 2-day version:**

- **Prevalence ratio for either flag < 2.0**: the simple flags don't separate. The full score won't either. **KILL.**
- **Both ratios ≥ 2.0 and at least one ≥ 3.0**: continue to the full design. The signal probably exists in some form.
- **Both ≥ 3.0**: continue with confidence; the signal is likely real.

**The 2-day test does not prove the signal works. It tests whether a kill is warranted.** If you can't beat 2x prevalence in 2 days of manual checks, you won't beat it in 2 weeks either.

### 8\. The one risk my own design still can't beat

**The signal is the failure process, not a leading indicator — and you cannot fully separate the two with 2 years of filings.**

Here's the residual threat in plain terms: a company that files for insolvency in 2024-Q3 was already a failing company in 2023. Governance flags at any point in 2023 are downstream of the same failure process the petition is downstream of. They share a common cause — the company's distress — and the question is whether the flags are earlier than the petition, not whether they are independent of it.

Your 12-month lookback is the maximum you can test. The buyer wants a 12-24m lead. You can deliver the first, you cannot deliver the second, and the buyer's CFO will know the difference. A positive result on this design tells you the flags are informative conditional on the company already being in the failure process; it does not tell you they are early within a healthy company.

This is a real, irreducible limit. It means:

- A positive result is a basis for a feed priced at "informative end-of-cycle monitor," not "leading indicator." The buyer should know which one they're buying.
- A skeptic can still argue, with evidence, that your signal is just leverage + 6 months of lag, dressed in governance language. The marginal-lift test over the leverage baseline is your best defense — if marginal lift ≥ 1.5x holds, that argument is weakened; if not, the skeptic wins.
- You should disclose this in the buyer report. Not as a caveat, as a pricing input. The honest price of a feed with 12m-max lead and 5x lift is roughly half the price of a feed with 24m lead and 10x lift. The design above tells you the first; it cannot tell you the second.

**Confidence on the design itself: 0.8 that it produces a defensible answer in two weeks.** The 0.2 is: you discover, in the validation step, that the signal is unstable across D₀ and D₁ and you don't know why. With 45 cases, the confidence interval on the D₁/D₀ ratio is wide. That is honest. If the D₁ result diverges sharply from D₀, don't ship it. Run D₂ in 6 months and re-evaluate.

If you want, I can convert §1-§5 into a one-page spec for the engineer (data sources, file formats, exact queries, expected output schema) and a one-page pre-registration document for your records. Say the word and I'll write them.

03:40

yes

03:40

I'll create both documents in the workspace and send them.

Both files written. Two one-page-ready docs, no fluff, executable tomorrow morning.

**`engineer_spec.md`** — 7 sections, ~2.5 pages printed:

- §0 frozen parameters (D₀, n, windows, features) — pin these on paper before any work starts
- §1 data sources with exact databases (MCA21, BSE, NSE, IBBI, NCLT, rating agencies)
- §2 full file schemas for cohort / filings / flags / financials / labels / scores / metrics
- §3 feature definitions with hard-exclude list and self-leakage rule
- §4 model definitions (baseline + test) with imputation rules for missing privates
- §5 twelve executable build steps in order, with day-by-day time budget
- §7 an explicit "MUST NOT do" list — refit on subcohort, threshold-tune, compute matched-sample precision, skip placebo

**`pre_registration.md`** — the commitment document:

- §1 hypothesis pinned in one sentence
- §3 the exact 5 features (no swap, no add)
- §5 the exact 7 metrics (population-level, with binomial CI)
- §6 pass bar (all 5 must hold, including 5x lift and 1.5x marginal lift over the leverage baseline)
- §7 kill bar (any 1 triggers, plus 3 sanity gates that block any decision if they fail)
- §8 the 2-day kill version written out so the engineer can run it Day 0
- §9 anti-flexibility clauses — frozen seed, frozen coefficients, 45-cases-for-development-only rule
- §10 disclosures written up-front (12m lookback cap, 45 cases, regime dependence) so the buyer's CFO sees them in the first paragraph, not as a footnote

The one piece of paper I did NOT write into either doc: the **subcohort sample seed**. That should be a 4-digit number you generate (or I generate) and pin in the §11 signature block before the engineer pulls `cohort_universe.csv`. Want me to generate a seed and update the doc, or do you want to pick it yourself?

engineer\_spec.md

MD

pre\_registration.md

MD

03:43

\--- tags: \[governance-signal, decisive-test, spec, pre-registration, review-draft, do-not-run\] date: 2026-07-02 status: REVIEW DRAFT v0 — pending fresh-eyes sign-off. DO NOT EXECUTE until reviewed and this line is removed. purpose: > The decisive test for the #2 governance-monitoring signal — one executable protocol synthesizing five independent design reviews (MiniMax-M3, Qwen, Kimi K2.6, GLM-5.2, Claude RETRO-CC+FREEZE). Fixes the flaws the red-team round found in the earlier matched case-control design. Hand this to an engineer once signed off. --- # Governance blow-up signal — DECISIVE TEST SPEC (v0, review draft) \*\*The question:\*\* do governance red flags extracted from public Indian filings, measured point-in-time, give a fund/credit-risk team a \*tradeable early warning\* of insolvency that beats free financials — reliably enough to sell as a monitoring feed? ## §0 — Frozen parameters (pin before any code runs) - \`D0\` snapshot / measurement reference: \*\*2024-01-01\*\* - Subcohort size: \*\*n = 600\*\* (stratified), listed oversampled 2:1, weighted back - Label horizon: \*\*18 months\*\* forward - Alert budget for headline metric: \*\*top 5%\*\* of the universe by score - RNG seed: \*\*(fill in a 4-digit number here before pulling any data; record it in the pre-registration)\*\* ## §1 — Universe & sampling (case-cohort, NOT matched controls) - \*\*Universe U:\*\* the survivorship-free company universe from the \*\*bhavcopy archive\*\* + MCA master, all entities active (not already in CIRP) as of \`D0\`, in the size band spanning the 5th–95th percentile of case revenue/assets (band fixed before looking at flags). Includes later-struck-off/merged/wound-up entities. - \*\*Cases:\*\* all hand-verified IBC/NCLT insolvency cases (label source: \*\*IBBI CIRP registry\*\*, via the \`L\`-CIN listed trick + self-disclosed "Corporate Insolvency Resolution Process" filings; the roster-verification step that caught false positives — admission-set-aside, application-only, stayed — applies). \*Real-n caveat: our verified roster today is ~13–18; expanding toward ~45 requires more IBBI order-page verification. Run with what verifies.\* - \*\*Subcohort C:\*\* a \*\*seeded random sample of 600\*\* companies from U, drawn with \*\*no reference to outcome\*\* (case-cohort design; a sampled company that later fails stays in C — that is what keeps the base rate honest). \*\*Oversample listed 2:1\*\* vs their universe share (weight back with case-cohort / Prentice weights), because pledge only exists for listed names and a raw draw is overwhelmingly private. - \*\*No matching.\*\* Distress is handled as a \*baseline covariate\* at analysis time (§4), never as a matching key. - \*\*All reported metrics are weighted back to the true universe base rate.\*\* ## §2 — The clock & measurement window - \*\*Time-zero anchor \`T0\`:\*\* use the \*\*NCLT admission date\*\*. Rationale: admission dates are the most reliably available and unambiguous field in the IBBI records; petition-filing dates are inconsistently reported across benches, so admission gives the cleanest, most complete label across all cases. - \*\*Measurement window:\*\* governance flags counted using \*\*only filings dated ≤ \`T0\` − 6 months\*\*, looking back \*\*12 months\*\* (i.e., \`\[T0−18m, T0−6m\]\`). The 6-month buffer is the anti-echo guard. Lookback is 12m (not 24m) because filing history is ~2 years deep — say so in the writeup; a true 24m-lead claim is not testable here. - \*\*Subcohort timing:\*\* score each subcohort company \*\*as of the current date (2026-07)\*\* using its most recent 12 months of filings, so the control scores reflect the freshest available governance picture. - \*\*Rating/petition dates:\*\* pull first rating-action-to-default (CRISIL/CARE/ICRA/India Ratings) and NCLT petition dates where available — used only for the lead-time descriptive in §5 and the 2-day kill test in §8. ## §3 — Features \*\*Extraction:\*\* keyword-level from \`india\_bourse\_announcements\` / \`india\_announcements\` (auditor, KMP, director, results-timing); pledge from Trendlyne/Screener + NSE/BSE shareholding pattern; RPT from annual-report/RPT disclosures. LLM extraction only if the decisive test passes on keywords. \*\*Extract blind\*\* to case/control status (shuffled, label-free company list). \*\*IN — tier 1 (promoter-behaviour; least "death-debris"):\*\* - \`pledge\` — promoter pledged % level >50% OR rise ≥20pp in window (listed). \*\*For private companies, where pledge data does not exist, set this flag = 0\*\* so every company has a comparable 5-flag score. - \`rpt\_spike\` — RPT ≥2× prior period AND ≥5% of revenue. \*\*IN — tier 2 (personnel; death-debris-neutralised):\*\* - \`auditor\_resign\`, \`cfo\_cs\_id\_exit\` — counted \*\*only if the event is ≥9 months before \`T0\`\*\* (drop the reactive last stretch; record late ones descriptively, never in the score). - \`going\_concern\_qual\` — auditor "material uncertainty related to going concern" / CARO material-weakness language in the window. (A direct auditor judgment on viability — treat as a core governance flag.) \*\*IN — tier 3:\*\* - \`late\_results\_change\` — late in the window AND on-time in the earliest observable period (a \*change\*, not a level; companies that always file late are sloppy, not dying). Missing baseline → flag = missing. \*\*OUT — permanently:\*\* \`insolvency\_related\_filings\` (that is the label wearing a hat). \*\*Filing-volume confound:\*\* all flags are \*\*binary on a fixed document-type checklist\*\* (annual report, board-change filings, auditor-change filings, pledge disclosures, results-filing dates) — identical for cases and subcohort — so a company that files 200 documents gets the same 0/1 as one that files 10. Report per-company checklist coverage. ## §4 — Baseline to beat A governance signal that can't beat free financials has no buyer. \*\*Baseline B:\*\* point-in-time financial-distress score — leverage (D/E), interest coverage, Altman-Z where applicable, \`log(revenue)\`, sector, listing status — using only statements \*publicly filed\* before \`T0−6m\` (respect the MCA filing lag; use filing date not statement date). Pull financials for the \*\*cases + 600 subcohort only\*\* (the point of case-cohort — never touch the rest of U). \*\*Increment\*\* = weighted logistic (Prentice weights), Baseline vs Baseline + governance-score. Governance is worth paying for only if it adds discrimination \*conditional on\* the financials. ## §5 — Metrics & pass/fail bar (decided NOW) \*\*Scoring:\*\* combine the flags into a score, then \*\*fit logistic-regression weights on the cases via 5-fold CV and choose the score threshold that maximises F1\*\* on the sample; apply that threshold to the subcohort. \*\*Headline metric:\*\* \*\*precision in the case-cohort sample\*\* — of the companies flagged (case + subcohort combined), the fraction that were cases — reported alongside recall. \*\*Companion metrics (population-weighted):\*\* recall @ top-5% alert budget; median lead-time of the first tier-1/2 flag ahead of \`T0\` and ahead of first rating-action; AUC-PR; NPV. \*\*BUILD if all hold · KILL if any fails:\*\* | Metric | BUILD ≥ | KILL < | |---|---|---| | Headline precision (flagged that were cases) | \*\*30%\*\* | \*\*15%\*\* | | Marginal lift over Baseline B (PPV(B+gov)/PPV(B)) | \*\*1.5×\*\* | \*\*1.0×\*\* | | Recall @ top-5% | \*\*35%\*\* | \*\*15%\*\* | | Median lead-time ahead of first rating-action | \*\*6 months\*\* | \*\*3 months\*\* | | Survives placebo + death-debris tests (§6) | pass | fail | ## §6 — Validation (honest limits) - \*\*Permutation test:\*\* shuffle failure labels 1,000×; empirical p-value of the observed AUC-PR increment over baseline. p > 0.10 → kill. - \*\*Death-debris test:\*\* recompute the score dropping the last 3 months of the window (\`\[T0−18m, T0−9m\]\`). If AUC-PR drops >0.05, the flags are process-debris, not leading — kill. - \*\*Sector-cluster jackknife:\*\* drop each sector's cases, re-estimate. If the result survives only via one sector's blow-up cluster, report it as sector-specific. - \*\*Cluster bootstrap\*\* by company for CIs on every headline number. - \*\*Cannot do:\*\* true out-of-macro-regime validation (one IBC/credit cycle, ~2yr depth). Say so. ## §7 — The forward FREEZE (the only skeptic-proof arm) The day §0–§6 are frozen: score all of live U with the frozen pipeline, write the ranked list to a file, \*\*hash + timestamp it (a public git commit)\*\*, and evaluate at +12 months against new IBBI admissions. This is the only evidence a hostile skeptic cannot dismiss as hindsight — run it in parallel, don't wait on it alone. ## §8 — The 2-DAY KILL TEST (do this FIRST, before any build) - \*\*Day 1:\*\* pull petition + first-default/rating dates for every verified case; compute the admission−petition and petition−default lags. This is the clock geometry of our own data. - \*\*Day 2:\*\* 10 seeded-random cases; hand-build each full timeline (every flag date + default/rating/petition/ admission). Plot flag dates vs first-default. \*\*KILL if fewer than ~4 of 10 show a pledge/RPT/auditor flag firing ≥6 months before the first conventional distress signal.\*\* (Companion: of the flagged cases, did >80% already have bad leverage 18m prior? → redundant with financials.) - Reuses \`scripts/research/{assemble-roster-from-ibbi, build-hand-trace-scoring, analyze-hand-trace}.mjs\`. ## §9 — Honest limits (put in the buyer report, up front — not a footnote) - \*\*Leading-vs-coincident ceiling:\*\* 2yr depth proves at best a ~12m-lead "end-of-cycle monitor," not a 24m leading indicator. Price/position accordingly. - \*\*Researcher-is-the-leak:\*\* the six flags were chosen because they're what everyone saw in famous Indian blow-ups + our own pilot — a positive \*retrospective\* result is tainted by hindsight feature-selection; only the §7 freeze answers it. - \*\*Product framing:\*\* the flags may detect deliberate promoter \*extraction/looting\*, not accidental distress → honest framing is a \*\*"promoter-misconduct early warning,"\*\* not a generic credit feed. ## §10 — Data sources (our repo) IBBI CIRP registry (labels) · bhavcopy archive + MCA master (survivorship-free universe) · \`india\_bourse\_announcements\` / \`india\_announcements\` (auditor/KMP/director/late-results flags) · Trendlyne/Screener + NSE/BSE shareholding (pledge) · annual-report/RPT disclosures (RPT) · CRISIL/CARE/ICRA/India Ratings (downgrade dates) · NCLT/IBBI (petition dates) · \`research\_prices\` (listed price/return context) · \`scripts/research/\` (existing hand-trace harness).

04:06

Let me carefully read this review draft and provide a fresh-eyes review. This is a synthesis of five independent design reviews, and I'm being asked to do a fresh-eyes sign-off review.

Key things to look for:

1.Is this a clean synthesis or are there contradictions?

2.Are the flaws I identified in the previous round actually fixed?

3.Are there NEW flaws introduced by the synthesis?

4.Is the protocol actually executable?

5.Does it answer the question correctly?

Let me go through it carefully.

**§0 — Frozen parameters**

- D₀ = 2024-01-01 — good, this is what I recommended
- n = 600 (stratified), listed oversampled 2:1, weighted back — DIFFERENT from my n=1000. Why 600? Listed oversampled 2:1 because pledge only exists for listed. OK, that's a reasonable argument. With case-cohort / Prentice weights, the inference is still valid for the population. But 600 is small. With base rate of ~0.5-1.5%/yr × 18m = ~1-2.25% expected, you'd get 6-14 cases in subcohort. Small but workable.
- Label horizon: 18 months — DIFFERENT from my 24 months. Why 18? Maybe because they have 18m forward data from D₀=2024-01-01. Wait, 2024-01 to 2026-07 is 30 months. So 24m forward to 2025-12-31 should be possible. Why only 18? Maybe they have a reason. Let me read on.
- Alert budget: top 5% — matches mine
- RNG seed: TBD — good

**§1 — Universe & sampling**

- Survivorship-free universe from bhavcopy + MCA — OK
- Size band 5-95th percentile of case revenue/assets — band fixed before looking at flags — this is GOOD, prevents sample-shopping on case characteristics
- Cases: "today is ~13-18; expanding toward ~45 requires more verification. Run with what verifies." — This is the killer issue. The user has been talking about 45 cases throughout, but here it says only 13-18 are verified. **HUGE PROBLEM.** This changes the entire design's statistical power. With 13-18 cases, you cannot reliably fit even a 5-feature logistic regression. The development set is too small.
- Subcohort n=600 listed oversampled 2:1 weighted back — OK
- No matching — matches my critique
- Weighted back to true base rate — yes, this is the case-cohort / Prentice approach. Good.

**Issue:** With only 13-18 verified cases, the development set is n ≈ 13-18 + 5×matched = 78-108. That's smaller than I'd want. The score formula is fit on this. With 5 features + 8 baseline = 13 parameters, you're at the edge of feasibility. With fewer cases, you're overfitting hard. **This is a critical issue that needs to be flagged.**

**§2 — The clock & measurement window**

- T₀ = NCLT admission date — DIFFERENT from my recommendation of T\_petition. Rationale given: "admission dates are the most reliably available and unambiguous field in the IBBI records; petition-filing dates are inconsistently reported across benches, so admission gives the cleanest, most complete label across all cases." This is a legitimate trade-off. T\_petition is earlier but messier; T\_admit is later but cleaner. **However, this is a substantive deviation from the principle of "act before the legal event" — admission is more downstream than petition.** With T\_admit as the clock and 6m buffer, the lookback window is `[T_admit-18m, T_admit-6m]`. The "lead time" is from when the flag fires to T\_admit. But T\_admit is already a fairly late event. The lead-time claim shrinks.
- Lookback 12m, buffer 6m → window is `[T0-18m, T0-6m]` — wait, this is 12m, not 18m. So they look 12m back ending 6m before T\_admit. The buffer eats into the lookback. So flags must be from `[T_admit-18m, T_admit-6m]`. That's a 12-month window. OK.
- "Subcohort timing: score each subcohort company as of the current date (2026-07) using its most recent 12 months of filings" — **WAIT.** This is a serious issue. They're scoring cases at T\_admit-relative, but scoring controls at 2026-07-relative. This is a **temporal mismatch**. Cases are scored at a date determined by their event; controls are scored at a fixed current date. The 12-month windows are at different times. The score is not comparable.

This is a real flaw. Let me think about it more carefully.

The user is saying: "score each subcohort company as of the current date (2026-07) using its most recent 12 months of filings, so the control scores reflect the freshest available governance picture."

If you do this, then:

- Cases: score at T\_admit-relative, T\_admit is anywhere in 2024-2026
- Controls: score at 2026-07-relative

For a case that was admitted in 2024-Q1, the score is computed from filings in 2022-Q3 to 2023-Q3 (12m ending at T\_admit-6m = 2023-Q3). For a control, the score is computed from filings in 2025-07 to 2026-07.

These are completely different time windows! The "governance picture" is from different points in the macro cycle. A company that would have failed in 2024 is being compared to a company whose score is based on 2025-2026 filings. **The comparison is not valid.**

This is a serious design flaw. The right way is: pick a single D₀ for everyone. Score everyone as of D₀. Then wait for forward labels.

OR: pick multiple D₀ snapshots and treat them as a panel.

**This §2 issue is the biggest problem in the spec.** The user needs to either:

- Fix D₀ for everyone (cases + controls), and use only data ≤ D₀
- Use a panel design with multiple D₀ snapshots

**§3 — Features**

- Tier 1 (promoter): pledge, rpt\_spike — good
- Tier 2 (personnel): auditor\_resign, cfo\_cs\_id\_exit, going\_concern\_qual — INCLUDES going\_concern\_qual which I said should be OUT. This is a deviation. The doc says "(A direct auditor judgment on viability — treat as a core governance flag.)" but going-concern is downstream of distress, not leading. **This contradicts the red-team review I did.**
- Tier 3: late\_results\_change — this is a CHANGE flag, not a level flag. Smart — avoids the "always-late" confound. Good.
- OUT: insolvency\_related\_filings — good
- Death-debris neutralization: events counted "only if the event is ≥9 months before T0" — interesting choice, but if the buffer is 6m, then 9m is even more conservative. Why? Maybe to remove the "last 3 months" where reactive events happen. OK.
- Filing-volume confound: binary on a fixed document-type checklist — this is a strong neutralization. Same checklist for all. But this means you lose rate-based signals (e.g., # of board changes). Trade-off.

**The going\_concern\_qual inclusion is a deviation from my red-team review.** I argued hard for excluding it. The doc is including it as a "core governance flag." This is wrong: going-concern qualifications are written BECAUSE the company is in distress. They're a downstream signal. The red-team review from the prior round was clear about this.

**§4 — Baseline to beat**

- B: leverage, interest coverage, Altman-Z, log(revenue), sector, listing status
- Increment: weighted logistic (Prentice weights), Baseline vs Baseline + governance
- Use only statements publicly filed before T0-6m

This is the right structure. The marginal lift test is the key.

**§5 — Metrics & pass/fail bar**

- **"fit logistic-regression weights on the cases via 5-fold CV and choose the score threshold that maximises F1 on the sample; apply that threshold to the subcohort"** — this is **the exact problem I flagged in my red-team.** Picking a threshold on the same data you evaluate on = overfitting. The F1-maximizing threshold is the most overfit threshold you can pick. This is wrong.

This is a regression from my recommendation of "flag-rate operating point (top 5%)." The user has reverted to threshold tuning. **This needs to be flagged as a major flaw.**

- **"Headline metric: precision in the case-cohort sample"** — wait, "case-cohort sample" is ambiguous. The case-cohort is the union of cases and the subcohort. The precision in that combined sample is NOT the population precision. The user has gone back to case-control precision!

Let me re-read. "of the companies flagged (case + subcohort combined), the fraction that were cases — reported alongside recall."

This is the matched-sample / case-control precision. The very thing I said is invalid because it's K-dependent. With 600 subcohort + 13-18 cases, the case-enrichment is severe. PPV in the case-cohort sample will be wildly inflated relative to the population PPV.

**This is a major flaw — the same flaw the original design had.** The metric is not the metric a fund pays for.

- Pass bar:
	- Headline precision ≥ 30% — this is the case-cohort precision, not population precision. With 600 subcohort and 13 cases, the base rate in the case-cohort sample is 13/613 ≈ 2.1%. If the score is random, PPV is 2.1%. If the score is good, PPV is 30%. The lift is 14x. But this is in the case-cohort sample, not the population.
		- Marginal lift over baseline ≥ 1.5x — OK
		- Recall @ top 5% ≥ 35% — but wait, "top 5% of what"? If it's top 5% of the subcohort, that's 30 companies. With 13 cases, max recall is 100%. With a random score, recall at top 5% is 5%. With a good score, recall at top 5% is 35%. Lift = 7x. OK.
		- Median lead-time ahead of first rating-action ≥ 6 months — this is good, actionable

**Companion metrics mention NPV.** NPV of what? What is the cash flow model? This is undefined.

**§6 — Validation**

- Permutation test, death-debris test, sector-cluster jackknife, cluster bootstrap — all good
- "Cannot do: true out-of-macro-regime validation" — honest, good

**§7 — Forward FREEZE**

- This is the prospective arm — score live U, hash, evaluate at +12 months. **This is exactly the right thing to do** and matches my recommendation. Good.

**§8 — 2-day kill test**

- Day 1: pull petition + rating dates, compute lags
- Day 2: 10 cases, hand-build timelines
- Kill if <4 of 10 show pledge/RPT/auditor flag ≥6 months before first rating action

This is a reasonable kill test, but it's based on only 10 cases and is a sample of 10. With 10 cases, you have very high variance. Also, this is asking "does the signal exist at all in cases" — but it doesn't test "is the signal specific to cases vs controls." A flag that fires 6m before any distress signal is informative only if it doesn't also fire for healthy companies.

**The kill test doesn't have a control comparison.** It should also check: of the controls, do 4+ of 10 also show flags ≥6m before some reference point? Otherwise you can't tell if the flag is specific to cases.

**§9 — Honest limits**

- 12m-lead ceiling — good disclosure
- Researcher-is-the-leak — **VERY IMPORTANT POINT.** Flags were chosen because of famous Indian blow-ups. Retrospective validation is tainted. Only §7 freeze answers it. This is a strong, honest disclosure. **I should affirm this strongly.**
- Product framing: "promoter-misconduct early warning" — good reframe

**§10 — Data sources**

- Listed, OK

**SUMMARY OF ISSUES TO FLAG:**

1.**Case count uncertainty** — "today is ~13-18" not 45. The user has been describing the design as if 45 cases exist, but only 13-18 are verified. This is a fundamental change in statistical power. The score development set is too small for the proposed model complexity. **This is critical.**

2.**Subcohort timing mismatch** (§2) — Cases scored at T\_admit-relative, controls scored at 2026-07-relative. **These are different time windows in different macro environments. The comparison is not valid.** This is the biggest flaw in the spec.

3.**Threshold tuning on sample** (§5) — "fit logistic-regression weights on the cases via 5-fold CV and choose the score threshold that maximises F1 on the sample; apply that threshold to the subcohort" is the exact overfitting problem I flagged. F1-max threshold is the most-overfit threshold. **Should be operating-point (flag-rate) locked in development.**

4.**Headline metric is case-cohort precision, not population precision** (§5) — "of the companies flagged (case + subcohort combined), the fraction that were cases" is the case-control precision. With case-enrichment via the subcohort, this number has no direct relationship to the population PPV. **The metric a fund pays for is population PPV at a fixed flag-rate.** The headline metric should be PPV @ top X% of the subcohort (population-level), not the case-cohort precision.

5.**Going-concern qualification included as a core flag** (§3) — I argued strongly to exclude this. It's a downstream signal. Including it inflates the score's apparent predictiveness. The spec contradicts the red-team review on this point.

6.**NPV mentioned but undefined** (§5) — NPV of what cash flow model? The metric is not defined. Either drop it or specify the cash flow model.

7.**2-day kill test has no control comparison** (§8) — "fewer than 4 of 10 show a flag ≥6m before first distress signal" doesn't tell you if the flag is specific to cases. A flag that fires for everyone doesn't discriminate. The kill test should also include a control group.

8.**18-month label horizon (not 24)** — Why 18 and not 24? This is a 25% reduction in the forward window. With D₀=2024-01-01 and current date 2026-07-02, 24m forward to 2025-12-31 is fully labeled. Why restrict to 18m? Either there's a reason (e.g., the 45 cases only go to 2025-06) or it's an unnecessary constraint. Should be clarified.

9.**Tier 2 events: 9-month cutoff** — Why 9m and not 6m (the buffer)? If the buffer is 6m, then "≥9m before T0" adds an extra 3m of conservatism. This is reasonable, but it's not explained. Minor.

10.**Listed oversampled 2:1, weighted back** — This is a legitimate design choice. But with case-cohort weighting, the analysis is more complex. The team should make sure they understand and correctly implement the Prentice weights.

**AFFIRMATIONS (things that are RIGHT and should stay):**

1.Case-cohort design with no matching on leverage — correct

2.Survivorship-free universe — correct

3.The 5-flag core with binary on a fixed checklist — correct

4.The §7 forward FREEZE — this is the right skeptic-proof arm

5.The honest disclosure in §9 (especially the "researcher-is-the-leak" point) — correct and important

6.The "promoter-misconduct" reframe — sharp

7.The 2-day kill test concept — good (just needs the control comparison added)

8.The marginal lift over baseline test — correct

**THE MOST IMPORTANT ISSUE:**

The subcohort timing mismatch in §2 is a fatal flaw. If cases and controls are scored at different times, the score is not comparable. This needs to be fixed before the spec is executable.

The fix: pick a single D₀ (or a few D₀'s in a panel). Score all companies (cases and controls) at D₀. Use data ≤ D₀. Then observe forward labels.

For cases, you have to score them at "T\_admit of that case" or you have to score them at D₀. If you score at D₀, you include post-D₀ events in the lookback (forward leakage). If you score at T\_admit, you get the timing mismatch.

The clean solution: don't include cases in the scoring sample at all. Score the subcohort at D₀. Then, separately, for the development set (cases only), score them at T\_admit-12m. Fit the score formula on the development set. Apply the frozen formula to the subcohort. **The case-cohort analysis pools the two.**

This is what I recommended. The spec is doing something different and wrong.

OK, let me now write a sharp fresh-eyes review. I'll be specific, blunt, and point to line numbers / section numbers. I'll prioritize the critical flaws.

Let me structure:

1.Verdict: NO-GO, must fix.

2.The fatal flaw (§2 timing)

3.The other critical flaws

4.Things that are right

5.Specific edits to make

Let me also think — should this be a long response or a punchy one? The user is asking for fresh-eyes sign-off, so I need to be specific enough to act on. I'll go medium-length, organized by priority.

Length-wise, I should be tight. The user has a draft, I need to point out what to fix. I'll be specific with section numbers and proposed edits.

I should NOT just rewrite the doc. The user is asking for review. I'll review with specific edit requests.

Let me draft.

Wait, let me also double-check the case count thing. The user wrote: "our verified roster today is ~13–18; expanding toward ~45 requires more IBBI order-page verification. Run with what verifies."

So the user is being honest: the design was discussed with 45 cases, but the verified count is 13-18. This is a significant change. With 13-18 cases:

- 5-fold CV on 13-18 is barely meaningful
- A 13-parameter model (5 flags + 8 baseline) has 1-1.4 cases per parameter — extremely overfit territory
- The 5-flag score with logistic regression weights is borderline infeasible

This is critical. Either the user expands the verified roster, or simplifies the model dramatically.

**Possible simplification:** with 13-18 cases, use a hand-tuned scorecard (e.g., 1 point per flag, sum them, threshold at ≥2) rather than logistic regression. This is a 1-parameter score that's robust to small sample.

Or, more conservatively: don't use the cases for score development at all. Use them only for validation. Develop the score on the subcohort using population labels (forward insolvency outcomes), with the score as a function of flags and baseline features. With n=600 subcohort and ~13 cases in 18m forward, the logistic regression is feasible.

But wait — that requires the subcohort to have enough cases, which depends on the forward label horizon. With 18m forward and base rate ~1%, you'd get 6 cases in 600. Still small. With 24m forward, ~12 cases. With 30m forward, ~15 cases.

Hmm, the subcohort is also the evaluation set. It needs cases too. The case-cohort design works by:

- Use cases for development (with non-case matches)
- Use subcohort for population-level metric

If the subcohort has 6 cases, the binomial CI on PPV @ top 5% is wide. It's hard to get a precise lift estimate.

This is a real statistical power problem. The user needs to either:

- Use a longer forward window (24 or 30m) to get more cases in the subcohort
- Use a larger subcohort (n=1000+)
- Simplify the model

OK, I have enough to write a sharp review. Let me do it.

I should be specific about which sections are correct and which need fixing. Let me prioritize.

Top priority issues:

1.Subcohort timing mismatch (fatal, fixes the whole scoring)

2.Case count uncertainty (statistical power, may force model simplification)

3.Threshold tuning / F1 maximization (overfitting, breaks evaluation)

4.Case-cohort precision as headline (not population-level, not what fund pays for)

5.Going-concern qualification included (downstream signal, contradicts red-team)

Medium priority: 6. 2-day kill test missing control comparison 7. 18m vs 24m horizon unexplained 8. NPV undefined

Things to affirm:

- Case-cohort design
- No matching
- Survivorship-free
- §7 freeze
- Researcher-is-the-leak disclosure
- Promoter-misconduct reframe
- Marginal lift test structure

OK let me write this up.

Format: I'll use a structured response with sections for "Verdict," "Must-fix (fatal/critical)," "Should-fix (medium)," "Things that are right," and "Specific edit requests."

Length: medium. The user wants to act, so I'll be specific enough to act on.

Fresh-eyes sign-off: **NO-GO. Do not execute.** The draft is a real synthesis and gets 5 of the red-team fixes right, but it re-imports 2 of the original flaws in a slightly different costume and has one new fatal flaw I want to call out separately. Below is the prioritized list.

### Verdict

Four issues block execution. One of them (§2) is fatal to the design as written — the spec is not internally consistent. The other three are reversions to flaws the red-team round already paid for. The rest is sound.

**Recommendation: revise and re-circulate. Estimated fix: 1 day.**

### MUST-FIX #1 (FATAL) — §2 subcohort timing mismatch

Spec says: cases are scored at `T_admit-relative` (filings in `[T_admit-18m, T_admit-6m]`), and " **score each subcohort company as of the current date (2026-07) using its most recent 12 months of filings, so the control scores reflect the freshest available governance picture.**"

**This is a fatal design flaw.** A case admitted in 2024-Q3 is being scored on filings from 2022-Q3 to 2023-Q3. A control is being scored on filings from 2025-07 to 2026-07. These are not the same window in the same macro environment. The score is **not comparable** across cases and controls. A 2024-Q1 admitted case is being compared, on its governance picture, to a control whose picture is from 2.5 years later. Whatever signal you measure, you cannot separate "the flag is informative" from "the time period is different."

**Fix.** Pick a single D₀. Score every company — cases and controls — using only filings dated ≤ D₀. For the development set, the 45 cases are placed at their `T_admit − 18m` window and used to fit the score formula. For the subcohort evaluation, score every subcohort company at D₀ using data ≤ D₀. **Do not touch the subcohort with current-date data.** The "freshness" instinct is wrong here — freshness destroys the comparison.

If the user wants a 2026-current-date evaluation, the right move is a **second snapshot D₂ = 2025-07-01** for the OOT backtest, not a different scoring time within the same evaluation.

### MUST-FIX #2 (CRITICAL) — §5 threshold tuning on the eval sample

Spec says: " **fit logistic-regression weights on the cases via 5-fold CV and choose the score threshold that maximises F1 on the sample; apply that threshold to the subcohort.**"

**This is the overfitting problem the red-team round already paid for, brought back in.** The F1-maximizing threshold on a 13-18 case sample is the single most overfit threshold you can pick. With 13 cases and a continuous score, the F1 max is at the threshold that catches the easiest 4-5 cases and almost nothing else. That threshold applied to the subcohort will overstate real performance.

**Fix.** Lock the operating point by **flag-rate**, not threshold. Use top 1%, 5%, 10% of the subcohort. Do not pick a threshold. The 5-fold CV is for **model coefficient stability** (e.g., are the flag signs stable across folds?), not for threshold selection. Report CV-AUC and CV-AUC-PR as model-quality diagnostics, not as a basis for picking an operating point.

### MUST-FIX #3 (CRITICAL) — §5 "headline precision" is the wrong metric (re-imports the original flaw)

Spec says: " **Headline metric: precision in the case-cohort sample — of the companies flagged (case + subcohort combined), the fraction that were cases.**"

This is **case-control precision, not population precision.** With n=600 subcohort + 13-18 cases, the case-enrichment ratio in the case-cohort sample is roughly 1:35 to 1:50 vs the population. The case-cohort precision is the population PPV scaled by the enrichment ratio. A "30% case-cohort precision" corresponds to roughly 0.6-1% population PPV — **not a fund-buyable number.**

This is exactly the flaw the original 1:10 matched design had. The synthesis round regressed on it.

**Fix.** Headline metric = **PPV in the subcohort at the top 5% flag-rate**, where PPV = (true positives in top 5% of subcohort) / (5% × n\_subcohort). Lift = PPV / (cases\_in\_subcohort / n\_subcohort). These are population-level metrics by construction. Drop the "case-cohort combined" precision language entirely.

The case-cohort design is still useful — it lets you **weight** the cases (Prentice weights) so their contribution to the score-formula fitting is proportional to their population prevalence, not so you report metrics in the case-enriched sample. Make sure the team understands this.

### MUST-FIX #4 (CRITICAL) — §1 case-count reality check

Spec says: " **Real-n caveat: our verified roster today is ~13–18; expanding toward ~45 requires more IBBI order-page verification. Run with what verifies.**"

**This is an honest disclosure, but the spec was written assuming 45.** A 5-feature + 8-baseline logistic regression on 13-18 cases is 13 parameters on 13-18 rows — that's a parameter-to-sample ratio of ~0.7-1.0, deep in overfit territory. The 5-fold CV will not catch this because the dev set is the only data the CV sees.

**Fix options, pick one:**

- **(A) Simplify the score.** With 13-18 cases, use a hand-tuned scorecard: 1 point per flag, sum them, threshold at ≥2. This is a 1-parameter model, robust to small n. Drop the logistic-regression weights entirely from the headline model. Report logistic on the subcohort's 18m-forward outcomes as a sensitivity, not as the headline.
- **(B) Extend the forward window to 30m** to get more cases in the subcohort. From D₀=2024-01-01, 30m forward is 2026-07-01 — fully labeled by now. Expected cases in 600 subcohort at 1.5%/yr × 2.5yr ≈ 22-25. Now the subcohort has the cases; you can fit the score on the subcohort's own data and the parameter-to-sample ratio is healthier.
- **(C) Verify more cases.** Commit to N IBBI order-page verifications per day until you have 30+ verified. Then the original logistic-regression plan is feasible.

**The spec as written with 13-18 cases + 13-parameter logistic regression will overfit and not catch itself.** That's the failure mode.

### SHOULD-FIX #5 (MEDIUM) — §3 going-concern qualification re-included

Spec includes `going_concern_qual` in Tier 2 as "a core governance flag." **This contradicts the red-team review.** Going-concern qualifications are written because the company is distressed. They are downstream of the failure process, not leading. Including them inflates the apparent signal, particularly at short horizons.

**Fix.** Move `going_concern_qual` out of the headline feature set. Run a sensitivity with it included and report the gap as a "if you let the auditor tell you, you can do X" finding. The headline model uses only the 4 truly leading-ambiguous flags (pledge, rpt, auditor\_resign, cfo\_exit, late\_results\_change).

### SHOULD-FIX #6 (MEDIUM) — §8 kill test has no control comparison

Spec says: kill if "fewer than ~4 of 10 show a pledge/RPT/auditor flag ≥6 months before the first conventional distress signal."

**This doesn't test whether the flag is specific to cases.** A flag that fires 6m before any distress signal for 8/10 cases AND 8/10 controls (e.g., 80% of all companies show a pledge spike at some point) is uninformative. The kill test as written passes if the flag is common.

**Fix.** Add a matched-control arm to the 2-day kill test. For each of 10 cases, find 1 size/sector/listing-status matched control. Score both on the same flags in the same 12m-before-event window. Kill if (TP rate − FP rate) < ~0.3 across the 20 companies. This is a quick McNemar's setup. Takes 1 more day; the existing 2-day plan is 3 days.

### SHOULD-FIX #7 (MEDIUM) — §2 18m horizon unexplained; §5 NPV undefined

- **18m vs 24m label horizon (§2):** spec says 18m, my prior recommendation was 24m. With D₀=2024-01-01 and current date 2026-07-02, 24m forward (to 2025-12-31) is fully labeled. Restricting to 18m drops ~25% of available labels for no stated reason. **Either commit to 24m (and bump expected subcohort cases from 6 to 12) or document why 18m is the constraint** (e.g., the 13-18 verified cases all admit before 2025-06-30, in which case 24m adds zero cases anyway and 18m is fine). The spec is silent on this.
- **§5 NPV:** "AUC-PR; NPV" is in the metrics list. **NPV of what cash flow model?** If it's the standard "buyer acts on the flag, avoids a default loss, minus operating cost," you need to specify: (a) assumed recovery-given-default, (b) position size, (c) cost of false positives. None of these are pinned. Either specify the model or drop NPV — it's a distraction without a pinned assumption.

### THINGS THAT ARE RIGHT (keep as-is)

I want to be specific about what's working in this synthesis, because reverting any of these is a regression.

- **Case-cohort design with no matching on leverage.** §1 gets this right. Distress is a baseline covariate at analysis time, not a matching key. Correct.
- **Survivorship-free universe + size band 5-95th.** §1 right. The pre-flag size band is the right way to prevent sample-shopping.
- **Listed oversampled 2:1 + Prentice weighting.** Legitimate. Pledge only exists for listed, raw draw is overwhelmingly private. The 2:1 oversample gives the score enough listed-only signal to learn from; weights restore the population inference.
- **5-flag core, binary on a fixed document-type checklist.** §3 right. Same checklist for all companies neutralizes the filing-volume confound at the source. This is actually a better design than mine, which weighted by filing volume post-hoc.
- **`late_results_change` as a change, not a level.** §3 right. Avoids the always-late confounder. Smart.
- **§7 forward FREEZE.** The right skeptic-proof arm. Score live universe, hash, evaluate at +12m. This is the only evidence a hostile skeptic cannot dismiss. The spec should run this **in parallel from Day 1**, not "after §0-§6 are frozen" — the freeze is supposed to happen before the backtest, not after, otherwise you can't claim it was locked.
- **§9 "researcher-is-the-leak" disclosure.** This is the most important honesty point in the spec. Six flags chosen because of famous Indian blow-ups is feature selection on the outcome set. The §7 freeze is the only thing that answers it. Keep this disclosure front-and-center in the buyer report.
- **§9 "promoter-misconduct" reframe.** Sharp. If the flags detect deliberate extraction/looting, that's a different product and a different buyer than generic credit. Honest framing.
- **§6 validation suite (permutation, death-debris, sector jackknife, cluster bootstrap).** Right. Note: cluster bootstrap by company is correct for PPV CIs but the inference is at the company level, not the flag level. The team should know the difference.

### Specific edit requests (drop-in)

If the team wants a punch list, here it is:

1.**§2:** delete "score each subcohort company as of the current date (2026-07) using its most recent 12 months of filings." Replace with: "Score every subcohort company as of D₀ = 2024-01-01 using filings dated ≤ D₀. Identical scoring protocol for cases (anchored at T\_admit for development only) and subcohort (anchored at D₀)."

2.**§5:** delete "choose the score threshold that maximises F1 on the sample." Replace with: "Lock the operating point by flag-rate: top 1%, 5%, 10% of the subcohort. Do not pick a threshold. 5-fold CV is for model-coefficient stability diagnostics only."

3.**§5:** rewrite the headline metric to PPV in the subcohort at top 5% flag-rate. Delete "case + subcohort combined" precision language. State lift = PPV / base\_rate\_in\_subcohort explicitly.

4.**§1:** add the case-count handling as a hard gate. "If verified case count < 25 at the time of cohort construction, switch to scorecard model (1 point per flag, threshold ≥2). If 25-40, use scorecard + logistic sensitivity. If 40+, run the full logistic model." Pin the threshold before the team starts.

5.**§3:** move `going_concern_qual` out of the headline feature set. Keep as sensitivity, report gap.

6.**§8:** add a matched-control arm. For 10 cases × 1 control each, score on the 5 flags in the same `[T-18m, T-6m]` window. Kill if (TP rate − FP rate) < 0.3.

7.**§2:** add a one-line justification for the 18m vs 24m horizon. If 24m is feasible (it is), bump to 24m.

8.**§5:** delete "NPV" or define the cash flow model.

9.**§7:** move the forward FREEZE to start at Day 1 of the experiment, in parallel. Its value is that it was started before the backtest's results were known.

10.**Pre-registration:** regenerate the pass/fail bar in terms of the corrected metrics. The "30% headline precision" threshold in the current spec is meaningless under the corrected metric. Likely a higher number (5x base rate lift, ~30% recall) is the right replacement.

### One thing I want to add that the spec is missing

**The `rpt_spike` and `pledge_spike` features need pre-registered, exact numeric definitions written down before extraction begins.** The spec says "RPT ≥2× prior period AND ≥5% of revenue" and "pledge >50% OR rise ≥20pp" — these are good and concrete. But the cutoff is one of the easiest things to flex on after seeing the data. Pin them in the pre-registration doc, with a date stamp, before the engineer pulls filings. The pre-registration doc has §3 (features) and §9 (anti-flexibility) but the **exact numeric thresholds for the binary flags are not in §3** — they need to be added.

Similarly, the **9-month buffer for Tier 2 events** in §3 is a defensible choice but is not in the pre-registration. Add it. If the team later wants to use a 6m or 12m buffer, that's a post-hoc change that needs to be reported, not silently made.

**Bottom line:** the synthesis is 80% there. §1, §3 (mostly), §6, §7, §9 are good. §2 has a fatal flaw, §5 re-imports two of the original flaws, §1 has a statistical power issue, §8 has a methodological gap. One focused day of revision gets this to sign-off. Do not let the team start pulling data on this draft.

04:09

Given ~2-year data depth, and that the bankruptcy-court date lags real distress by months-to-years, is there any valid way to test a leading governance signal — or does the data reality already make this a null?

14:48

The user is asking a really sharp, important meta-question: given the data constraints (2 years of filing depth, court admission dates lagging real distress by months-to-years), is there ANY valid way to test for a leading governance signal? Or is the data already too thin to answer the question honestly?

This is a "is the question itself answerable" question. Let me think hard.

**The data constraints:**

- 2 years of filing history (2024-2026, since the current date is mid-2026)
- The "real" event we care about is genuine economic distress — promoter looting, covenant breach, fraud
- The observable events lag the real event:
	- Real distress → first visible signal in financials: variable, often 6-18 months
		- First rating downgrade: usually lags by 3-12 months
		- SMA-1 / SMA-2 classification: 30-90 days post-miss
		- Section 7/9/10 petition filing: 3-18 months post-real-distress
		- CIRP admission: another 1-6 months after petition
		- Going-concern qualification: 1-6 months pre-admission
		- Auditor resignation with concerns: variable
- Filing history depth: 2 years

**The core problem:** A "leading" signal needs to fire before any conventional signal (financials, ratings, public market). If the only data you have starts 2 years ago, and the typical distress-to-admission lag is 12-24 months, then:

- For cases admitted in 2024: filing history only goes back to 2022 (if you're lucky). You might capture 0-12 months of pre-distress filings.
- For cases admitted in 2025: filing history goes back to 2023. You might capture 6-18 months of pre-distress filings.
- For cases admitted in 2026: filing history goes back to 2024. You might capture 12-24 months of pre-distress filings.

But here's the kicker: the "filing" itself is what you observe. If the company's financials were already distressed in 2021, but you don't have 2021 filings, you can't observe that distress. The earliest visible signal in the FILINGS is the latest of (filing\_date, when\_distress\_started).

**Worse:** the regulatory filing lag is itself 30-90 days. Annual results are due 30-60 days after fiscal year-end. Board changes are filed within days. Auditor resignations within days. So even with the data, the "lookback" from a filing's content is roughly its filing date, not its coverage period.

**The real question:** can you test for a leading signal with this data?

**What "leading" means in this context:**

- The buyer's question: "act BEFORE conventional signals (ratings, financials) become visible"
- Conventional signals: rating downgrades, leverage spikes, current-ratio collapses
- Governance signal: must fire BEFORE the leverage spike is visible in the financials

**The problem with testing this:**

1.**You need both: a leading signal AND a benchmark (financial distress signal).** You have only 2 years of governance data, but you have... how much financial data? Financial filings also have 2 years of history. So you can compute "did governance flags fire before leverage became distressed in the filings?" But the leverage becoming distressed in the filings is itself lagged from real distress.

2.**The governance signal is "leading" only if it fires before the leverage/rating signal.** If both fire at the same time, governance is coincident, not leading. If leverage fires first, governance is useless.

3.**With 2 years of data, you can at best test a 12-month lead.** 24-month lead is structurally untestable.

4.**The 12-month lead you CAN test is contaminated by the failure process.** The company is in distress 12 months before admission. Filings reflect this. You're testing whether governance flags fire while the company is already distressed, not whether they fire before distress.

**Is the data reality a null?**

Let me think about this carefully. There are three possibilities:

**Option A: The data is a null for the buyer's question.** You cannot test a 24-month leading signal with 2 years of data. Period. Any positive result is necessarily a 0-12 month "leading" signal, which is mostly coincident with financial distress. The buyer wants to act before financials deteriorate, and you can't prove you can.

**Option B: The data is partial but not a null.** You CAN test a 12-month lead. The buyer might still buy a feed that fires 12 months early, even if they wanted 24. The price is lower, but it's a real product. The "leading vs coincident" question can be partially addressed by comparing governance flag timing to financial-distress timing in the filings.

**Option C: The data is sufficient if you reframe the question.** Stop asking "is the signal leading" and ask "does the signal add information given financials?" This is a different question — it's the marginal value question, not the lead time question. The data supports this question. The buyer gets a feed that scores governance + financials and acts on the combined score. Whether the governance piece is "leading" or "coincident" matters less than whether the combined score is more informative than the financial-distress score alone.

**My honest answer:**

The data reality does NOT make this a null. It makes the ORIGINAL framing of the question (24-month leading indicator) a null. There are three other questions you CAN answer:

1.**Marginal value question:** "Does adding governance flags to a financial-distress model improve PPV at fixed flag-rate?" Answerable with 2 years of data. This is the question a credit officer actually cares about.

2.**Short-lead question:** "Does the governance signal fire ≥3 months before the leverage-distress signal becomes visible in filings?" Answerable with 2 years of data. Useful even if "leading" is only 3-6 months.

3.**End-of-cycle amplifier question:** "Is the governance signal informative at the moment a company enters the failure process, conditional on it being in the failure process?" Answerable. Different product, different price.

**The deeper issue:**

The user's framing — "leading governance signal" — is part hype. A more honest framing is:

**A governance signal tells you about the QUALITY of management, not the TIMING of failure.** Companies with bad governance fail more often, but they fail at unpredictable times. The signal is diagnostic of vulnerability, not predictive of timing.

This is actually a well-known result in credit research: governance ratios predict the probability of distress over a 3-5 year horizon, but they don't tell you WHEN the distress will occur. A 24-month "leading" governance signal is a fiction — the governance is a slow-moving risk factor, not a sudden flash.

**What does the data actually support?**

The honest test is:

- "Of companies that are financially distressed as of date D, what fraction show governance red flags in the 12 months before D?"
- "Of companies that are NOT financially distressed, what fraction show governance red flags?"
- Compute the prevalence ratio.
- This is a CONDITIONAL test — given distress, do governance flags help? It's not a "leading" test.

**The real test for "leading":**

- "Of companies that enter CIRP/admission at time T, do governance flags at T-12m fire BEFORE the financial-distress signal at T-X?"
- Compute the lead time of governance flags vs the lead time of financial distress.
- If governance flags lead financial distress by ≥3 months on average, you have a leading signal. If they're concurrent, you have a coincident signal.

**This IS testable with 2 years of data, but it requires:**

- Defining "financial distress onset" precisely (first filing where leverage > threshold, or interest coverage < threshold, or current ratio < threshold, etc.)
- Defining "governance signal onset" precisely (first filing where any flag fires)
- Computing the time gap between them for each case

**The honest conclusion:**

The data is not a null. Three things you CAN test:

1.**Marginal value of governance conditional on financials** (always testable, always useful, never "leading" in a buyer's sense)

2.**Lead time of governance flag vs financial-distress signal** (testable with 2 years of data, gives you 0-12 month lead claim max, requires careful measurement of financial-distress onset)

3.**End-of-cycle amplification** (testable, useful for prioritizing cases already in trouble, NOT for early warning)

The data does NOT support:

- 24-month leading signal
- "Fire before any conventional signal" claims
- A feed that competes with leverage as a primary screener

**What's the right reframe?**

The product should be: **"a triage layer on top of leverage screening."** The fund already uses leverage / Altman. You add governance flags. Combined score > either alone. The buyer doesn't need governance to fire before leverage — they need the combined score to identify distressed companies with higher precision than leverage alone.

This is a totally different value proposition and it's testable. It's also more honest.

**Another angle: use the 2 years to test a "delayed" framing.**

With 2 years of data, the longest forward window you can test is 24m (cases admitted up to mid-2026, lookback to mid-2024). But the longest lookback you can test is also limited — 24m back from a 2024-01-01 D₀ is mid-2022, which is before your filing history starts.

But you could test a different framing: "for cases that were admitted in 2024, what was visible in filings 18-24 months before admission?" If filings start in 2024 and admission is in 2024, the answer is "nothing." If admission is in 2025, you can look back to 2023 — only 12 months. If admission is in 2026, you can look back to 2024 — 24 months.

So for cases admitted in 2026, you have 24 months of lookback. For cases admitted in 2024, you have effectively 0 months. The "leading" test is essentially a test on cases admitted in 2025-2026 with 6-18 months of lookback.

**Sample size problem:** 45 cases, of which maybe 5-10 have ≥12 months of lookback. 5-10 cases is a tiny sample. Any "leading" claim would be on a very small subset.

**Bottom line:**

The data is not a null, but it forces a reframe. The "leading" framing is dead. The "marginal value" and "short-lead (0-12m)" framings are alive. The "end-of-cycle amplifier" framing is alive and the most honest product description.

Let me structure my response.

I want to be:

- Honest about the limits
- Constructive about what CAN be tested
- Sharp about the buyer's question vs the testable question
- Concrete with timelines

Length: medium-long. The user asked a serious question, deserves a serious answer. I'll structure with clear sections.

Sections:

1.Direct answer: not a null, but the "leading" framing is

2.The data geometry — what 2 years actually lets you see

3.The reframe: three testable questions

4.What to drop from the original question

5.The honest product framing

6.The smaller experiment that answers the testable question

Let me write this up.

One more thought: the user said "the bankruptcy-court date lags real distress by months-to-years." This is true. The admission date is downstream of:

- Real distress (could be years)
- Visible financial deterioration (months)
- Rating downgrades (months)
- Petition filing (weeks-months)
- Admission itself (weeks-months)

So even the "lead time ahead of admission" is lead time ahead of a downstream event. The TRUE lead time ahead of real distress is longer than what you can measure.

This is a key point: even the 12-month lead you're measuring is 12 months ahead of an already-late event. The buyer's question is "act before the company is in real distress." The admission date is the END of the lead-time window, not the start. The real lead time could be 18-30 months if you measured to "first financial deterioration" instead.

OK, I have a clear picture. Let me write the response.

Format: I think Markdown with clear sections. No flattery. Direct.

I should also note — the user's question is sharp and deserves acknowledgment. The fact that they're asking "is this even testable" before running the experiment is exactly the right instinct. I'll affirm that instinct and then give the honest answer.

Let me draft.

OK, drafting the response now. I'll keep it tight and structured.

I want to make the central point very clearly: the data isn't a null, but it forces a reframe from "leading" to "marginal value + short-lead." The "24-month leading" claim is structurally untestable. The "12-month short-lead" claim is testable on a small subset of recent cases. The "marginal value" claim is testable across all cases. The "end-of-cycle amplifier" claim is testable and is the most honest product framing.

Let me also be concrete about what the timeline looks like.

If D₀ = 2024-01-01 and current date is 2026-07-02:

- For a case admitted in 2024-Q1: filing history goes back to mid-2024 at earliest. So you have ~0-3 months of pre-admission filings. Useless for "leading" claim.
- For a case admitted in 2024-Q4: filing history back to 2024-Q3 at earliest. So you have ~3-6 months. Still tight.
- For a case admitted in 2025-Q1: filing history back to mid-2024. So you have ~6-9 months. Marginal.
- For a case admitted in 2025-Q4: filing history back to mid-2024. So you have ~12-15 months. Workable.
- For a case admitted in 2026-Q1: filing history back to mid-2024. So you have ~18 months. Good.
- For a case admitted in 2026-Q2: filing history back to mid-2024. So you have ~21 months. Excellent.

So the "leading" test is essentially a test on cases admitted in 2025-Q3 to 2026-Q2. That's a subset of the 45 cases, maybe 15-25 of them. With 15-25 cases, you can do the lead-time analysis but with wide CIs.

The "marginal value" test (does governance add to leverage?) is testable on all 45 cases, because it doesn't require a long lookback — it just requires that the score be computable on data that's available.

Let me structure the response around this.

I'll also be honest: there's a path forward, but it requires dropping the "leading" framing as the primary claim and reframing around marginal value + end-of-cycle. The user will be disappointed, but the right thing.

Let me write it.

Short answer: **the data is not a null, but the framing "leading 24-month indicator" is a null.** What is testable — and genuinely useful — is a different question. Let me be concrete about which is which and why.

### The data geometry — what 2 years actually lets you see

Walk the timeline with me. The current date is mid-2026; filing history reaches back to mid-2024. For each case, the "lookback you actually have" = `T_admit − filing_history_start`, capped at your analysis window:

| Case admitted | Earliest filing you have | Real lookback | Usable for "leading"? |
| --- | --- | --- | --- |
| 2024-Q1 | mid-2024 | ~3 months | No. Useless. |
| 2024-Q4 | mid-2024 | ~6 months | Barely. |
| 2025-Q1 | mid-2024 | ~9 months | Marginal. |
| 2025-Q4 | mid-2024 | ~15 months | Workable. |
| 2026-Q1 | mid-2024 | ~18 months | Yes. |
| 2026-Q2 | mid-2024 | ~21 months | Strong. |

The "leading" test is structurally a test on the cases admitted in **2025-Q3 to 2026-Q2** — probably 15-25 of your 45 cases. The other ~20-25 cases contribute essentially zero pre-admission filings. Any "leading governance signal" claim based on the full 45-case sample is dominated by the most recent 15-25 cases, with the rest contributing noise.

This is not a fatal problem — it's a constraint you plan around. But it does mean the "leading" framing has to be retired for the older cases and reframed for the recent ones.

There's a second, worse problem. The IBBI/CIRP admission date is itself **downstream** of the real event you care about. The standard lag chain is:

text

```
real distress (promoter looting, covenant breach, fraud)
   ↓  3-18 months
visible financial deterioration (leverage spike, coverage collapse)
   ↓  1-6 months
rating action / SMA classification
   ↓  1-6 months
Section 7/9/10 petition filing
   ↓  1-6 months
CIRP admission
```

So when you measure "12-month lead ahead of T\_admit," you're measuring 12 months ahead of a date that is already 6-30 months downstream of the real event. **The true lead time ahead of "real distress" is 18-42 months, not 12.** And your 2 years of data can verify at most the back half of that.

**Conclusion: a 24-month leading indicator is a fiction. A 12-month lead (measured to T\_admit) is a 18-30 month lead measured to real distress, but you can only verify the back half.** Anything you claim is, at best, a 6-12 month lead.

### So is it a null?

**No, but only if you stop asking the original question.** Three questions are testable, in declining order of difficulty:

#### Q1 (testable, always): Does governance add information given financials?

This is the marginal-value question. You don't need a long lookback. You don't need to claim "leading." You just need: at fixed flag-rate, is `PPV(financials + governance) > PPV(financials)`?

- **Population-level, answerable with the 45 cases + 600 subcohort.** No lookback constraint.
- **The right metric for a buyer:** marginal lift = `PPV(B+G) / PPV(B)`. The buyer doesn't care if G is "leading"; they care if it improves the combined score.
- **Pass bar:** marginal lift ≥ 1.5x at top 5% flag-rate. This is the bar I wrote into the pre-registration, and it stands regardless of the leading-vs-coincident question.

This is the most defensible claim. The data fully supports it. **You should not run the experiment without committing to this as a real outcome** — even if the leading-vs-coincident story fails, a positive answer here is a real product.

#### Q2 (testable, partial): Does governance flag fire before the financial-distress signal in the filings?

This is the short-lead question. Testable only on the 2025-2026 cases with ≥9-12 months of lookback. With ~15-25 cases.

- Define "financial-distress onset in filings" = first filing where leverage > 2.0× prior period, OR interest coverage < 1.5, OR current ratio < 1.0, OR going-concern qualification.
- Define "governance-signal onset" = first filing with any of the 5 flags.
- For each case, compute `lead_time = t_governance − t_financial_distress`. Negative = governance leads. Positive = governance lags.
- Aggregate: median lead time, fraction with negative lead time, fraction with lead ≥ 3 months.
- **Pass bar:** median lead time ≥ 3 months, fraction with governance-leading ≥ 60%, conditional on having ≥9m lookback.
- **Caveat:** small sample (15-25 cases). Report with CIs. This is a "hypothesis-confirming" result, not a "production-grade" result.

#### Q3 (testable, partial): End-of-cycle amplification — does the signal fire while the company is in the failure process?

This is the "you are already in trouble; we help you prioritize" framing. The governance signal is used to rank companies that are already showing some distress (financial or otherwise), not to detect distress from a clean state.

- Restrict the subcohort to companies that have some distress signal (any of: leverage above median, late filings, rating below investment grade, etc.).
- Compute: of the distressed subcohort, what fraction enter CIRP/admission within 18m at top 5% governance score?
- This is a sub-population question, not a population question. Lift can be much higher (base rate is elevated).
- **Pass bar:** PPV @ top 5% in distressed subcohort ≥ 15% (vs ~2-3% base rate in distressed subcohort).

This is the **most honest product framing**: triage layer on top of leverage screening, not a primary screener. Different buyer, different price, but a real product.

### What to drop from the original question

Three things cannot be honestly claimed with this data. Drop them from the spec, the buyer report, and the marketing.

1.**"24-month leading indicator."** Untestable. Replace with "6-12 month lead ahead of admission, conditional on data depth."

2.**"Fires before any conventional signal."** Untestable — and probably false. The financials deteriorate before the admission. The governance signal may fire before, with, or after the financial deterioration. You measure it (Q2 above) and report what you see.

3.**"A primary early-warning feed for credit risk."** Even if the marginal-value test passes, governance is best positioned as a layer on top of leverage, not a replacement. The buyer has leverage. You add governance on top. Combined score > either alone.

### The honest product framing

Three product tiers, in declining order of honesty:

**Tier 1 (the only one you can ship): "Governance-amplified credit screen."** Combined score = `w₁ × financial_distress + w₂ × governance_score`. Lift over leverage-only baseline. The governance piece may be coincident or short-leading; you don't need to claim otherwise. **This is testable, defensible, and shippable today.** The marginal-lift number is the headline.

**Tier 2 (claim only with a strong Q2 result): "Governance flags lead financial deterioration by ~6 months in ~60% of cases."** Conditional on recent cases with sufficient lookback. Report with CIs. This is a useful secondary claim, and a fund will pay extra for it. But it's small-sample and regime-dependent.

**Tier 3 (don't claim): "Leading indicator of corporate insolvency."** This is the framing the buyer wants to hear and the framing the data cannot support. Selling it anyway is a credibility problem in 18-24 months when the feed's limits become obvious.

**The product question to ask a fund before you ship:** "If I sell you a feed that improves your PPV from 8% to 14% at the same flag-rate, on a 6-month lead, do you pay for it?" The honest answer is yes. The honest answer to "do you pay for a 24-month leading indicator" is "show me the data" — and you don't have it.

### The smaller experiment that answers the testable question

If you accept the reframe, the design simplifies. Strip out the parts that were trying to support the 24-month claim.

**Testable in ~7 days, not 2 weeks:**

1.**D₀ = 2024-01-01**, subcohort n = 1,000 (or 600 if you must), 12m lookback, 24m forward. Labels: 2024-01-01 to 2025-12-31. (This part doesn't change.)

2.**Run Q1 (marginal value) end-to-end.** This is the Tier 1 product. Pass = marginal lift ≥ 1.5x. If it fails, **the whole project is dead** — no point testing Q2.

3.**Run Q2 (lead time) on the 2025-2026 cases only** (~15-25 of them, all with ≥9m lookback). Compute median lead time and fraction-leading. Report with CIs. This is the Tier 2 supporting claim. **Don't promote to headline if sample size is small.**

4.**Run Q3 (end-of-cycle amplifier) as a sub-cohort analysis.** Restrict the subcohort to companies with above-median leverage, score on governance, report PPV at top 5%. This is the second supporting claim.

5.**Run the §7 forward FREEZE in parallel from Day 1.** This is the only thing that eventually disconfirms the "is this just a hindsight fit" concern. The freeze must start before the backtest is run, not after.

**Time budget if Q1 fails:** 5 days. You get a clean "no" with a defensible mechanism. Better than spending 14 days on a design that the data cannot support.

**Time budget if Q1 passes:** 14 days total to run Q1 + Q2 + Q3 + freeze-start. You ship a Tier 1 product with a Tier 2 supporting claim and a freeze-pending arm.

### One thing I want to flag directly

The question you asked — "is this a null?" — is the right question to ask before spending 14 days. **The original "leading 24-month governance signal" claim is structurally a null on this data.** That doesn't mean the project is dead; it means the framing must change. The marginal-value and end-of-cycle-amplifier claims are real, testable, and shippable. They are not what the buyer originally asked for, but they are what the data will honestly support, and they are still worth running.

The single highest-leverage decision you can make this week is: **commit to Tier 1 as the headline product, retire the "leading" claim from the spec, and run Q1 first.** If Q1 passes, you have something to ship. If Q1 fails, you stop, and you've saved the 14 days for something the data can actually answer.

14:49

Good. Now commit: design the specific test you would stake your reputation on, using ONLY the data we actually have — ~2 years of filings, fewer than 10 clean recent collapse cases, and an unreliable court-date "clock." Be concrete and executable: no fabricated numbers, no "assume we get more data." If your honest conclusion is that it CANNOT be validly tested with this data, say so plainly, and say what you would tell the customer instead.

14:58

The user is asking me to commit to a specific test that I would stake my reputation on, given the very tight data constraints:

- ~2 years of filings
- Fewer than 10 clean recent collapse cases
- Unreliable court-date "clock"

The user explicitly says: if the honest conclusion is that it cannot be validly tested, say so plainly. Don't fabricate. Don't pretend.

Let me think hard about this. With fewer than 10 cases and an unreliable clock, can you actually test this?

**Statistical power with <10 cases:**

- A 5-fold CV on 10 cases is barely meaningful (2 cases per fold)
- Logistic regression with 13 parameters on 10 cases is impossible (events-per-variable < 1)
- Any "score" you fit will be massively overfit
- The score formula derived from 10 cases will not generalize
- A hand-tuned scorecard (1 point per flag, sum them) has 1 parameter — but with 10 cases you still have wide CIs

**The clock problem:**

- If you can't trust the admission date, you can't compute lead time
- If you can't compute lead time, you can't claim "leading"
- The petition date is also unreliable
- The rating-action date is more reliable but only for listed companies
- The "real" event (first missed payment, first covenant breach) is unobservable

**What the data actually supports:**

With 10 cases and an unreliable clock, you have enough to:

1.**Sanity check whether the flags fire at all in the lookback window.** (Descriptive, not inferential)

2.**Compare flag prevalence in cases vs a control sample.** (Prevalence ratio, with very wide CIs)

3.**Hand-trace timelines for each case.** (Qualitative case study)

You do NOT have enough to:

1.Fit any model with confidence

2.Estimate population-level PPV with precision

3.Claim "leading" anything

4.Sell a feed

**My honest answer:**

With fewer than 10 clean cases and an unreliable clock, you cannot validly test the buyer's question. You have a qualitative signal worth investigating, not a quantitative signal worth shipping.

What I would tell the customer:

1."We don't have enough verified cases to fit a model and validate it. We have a hypothesis, not a result."

2."The clock is too noisy to claim 'leading' — we can only describe what we see in the lookback, not measure lead time."

3."What we can do in 2-3 days is a qualitative case study: for each of the 10 cases, hand-trace the timeline of governance flags and rating/financial signals. We can tell you whether the flags fire in the lookback and at what point relative to the (unreliable) admission date. This is informative but it's a case study, not a test."

4."The honest path to a sellable product is: invest 4-6 weeks verifying more cases (IBBI order-page work), then run the design I gave you earlier. We don't have that luxury today."

**The "test" I would stake my reputation on:**

If I HAD to commit to something testable, it would be a very simple, transparent thing:

**The "5x prevalence" sanity test.**

For each of the 10 cases, score the 5 governance flags in the 12-month lookback window ending at the (unreliable) admission date. Compare the flag prevalence in cases vs a matched control sample of ~50 companies (size/sector/listing matched, not leverage matched). For each flag, compute prevalence ratio. Compute the simple sum-of-flags score for each company.

**Pass condition:** Median sum-of-flags in cases ≥ 2. Median in controls ≤ 1. (Or some similar simple rule.)

This is a 1-parameter test (the threshold is fixed). With 10 cases and 50 controls, you have 60 data points and a single binary classifier. The expected number of false positives under the null is 50 × P(sum ≥ 2 | no flags fire). The expected number of true positives is 10 × P(sum ≥ 2 | cases have elevated flags).

You can do a Fisher's exact test on the 2x2 table: cases with sum ≥ 2 vs cases with sum < 2, controls with sum ≥ 2 vs controls with sum < 2. This gives a p-value.

**But the test has huge caveats:**

- With 10 cases, the test is barely powered to detect a 3x prevalence ratio at 80% power
- The "clock" doesn't matter much for this test because we're not measuring lead time, just flag prevalence
- The "leading" claim cannot be made — only "flags fire in the lookback"
- The "generalization" claim cannot be made — 10 cases is too few

**What I would tell the customer:**

1.The product is not shippable with this data. Period.

2.What we can do is a case study: do the 5x prevalence test above. If it passes (median case has ≥2 flags, median control has ≤1, p < 0.05), the hypothesis is supported and we should invest in more data.

3.If it fails, kill the project. Don't try to ship a feed.

4.Either way, the "leading governance feed" is not what we'd sell. What we'd sell is a "qualitative due-diligence overlay" — a manual review of governance flags for companies the fund is already considering. That's a service, not a model.

**Let me think about this more carefully.**

Actually, the case study framing is the honest answer. With 10 cases, the only thing you can do is:

- Hand-trace each case
- Describe the timeline of governance flags vs other signals
- Note any patterns
- Form a hypothesis for testing with more data

You cannot do a population-level inference. You cannot fit a model. You cannot validate. You cannot ship.

The case study is descriptive, not inferential. It's the right answer for this data.

**What about the "unreliable clock" problem?**

If the admission date is unreliable, then the lookback window is also unreliable. A flag that "fires 12 months before admission" might actually be firing 6 or 18 months before admission. This is measurement error on the lead time, which is fatal for any "leading" claim but acceptable for a "flags fire" claim.

The simplest fix: don't use lead time. Use the snapshot date. For each of the 10 cases, ask: "Was there a governance flag in the 12 months ending at admission (give or take 6 months)?" Compare to controls. The "give or take 6 months" is the clock uncertainty.

**Concrete test:**

**The "any flag in 12m ± 6m lookback" test:**

For each of the 10 cases, define a "lookback window" of `[T_admit - 18m, T_admit]` (asymmetric because we don't know the exact T\_admit — could be 6m early or 6m late, so widen the window). Count the governance flags in this window. Sum.

For each case, find 5 size/sector/listing-status matched controls from the universe. Define their "lookback window" as `[any_lookback_anchor - 18m, any_lookback_anchor]`. Use a fixed reference date for the controls (say 2025-01-01) — this is a bias, but a known one.

For each flag and for the sum-of-flags, compute prevalence in cases vs controls. Compute Fisher's exact p-value on the 2x2.

**Pass condition:** At least 3 of 5 flags have prevalence ratio ≥ 2 with p < 0.10 (uncorrected), AND the median sum-of-flags in cases is ≥ median in controls by ≥ 1.

**This is the most defensible test you can run with this data.** It's underpowered, it's biased (clock error, control timing mismatch), but it's honest. It can support a "the hypothesis is consistent with the data" or "the hypothesis is inconsistent" conclusion. It cannot support a "the product works" conclusion.

**The honest customer conversation:**

Customer: "Can you build me a governance feed?"

Me: "With what we have today — 10 verified cases, 2 years of filings, unreliable admission dates — I can run a sanity test. If the sanity test passes, the hypothesis is worth investing in. If it fails, the project is dead. Either way, I cannot ship a feed today. The product is not validated. Here's the plan:

1.Run the 5x prevalence sanity test in 3 days. (~$X cost.)

2.If it passes, invest 4-6 weeks verifying more cases (~$Y cost), then run the full design.

3.If it fails, kill the project.

I will not ship a product based on 10 cases and a noisy clock. I will not pretend the data supports what it doesn't. If you want a feed, fund the verification work. If you want a case study, I can do that today."

This is the honest, reputation-preserving answer. The user asked me to commit, and I will commit to: the case study is the only honest test, and I would tell the customer this directly.

**Format of my response:**

I want to:

1.Lead with the verdict: cannot be validly tested for the buyer's purpose

2.State the constraint clearly and the consequence

3.Specify the ONE test I would run — the case study / sanity test

4.Specify what I would tell the customer, word for word

5.Specify the kill conditions and the path forward

Length: medium. Direct. No hedging. The user wants commitment.

Let me write this. I'll be direct and concrete. I'll include the actual test protocol but make clear it's a sanity test, not the production test.

Let me also think: should I write this as a deliverable file, or just respond in chat? The user has been alternating. This is a "what would you do" question, not a "give me a deliverable" question. I'll respond in chat. If they want a file, they can ask.

One more thought: the user said "Be concrete and executable: no fabricated numbers, no 'assume we get more data.' If your honest conclusion is that it CANNOT be validly tested with this data, say so plainly, and say what you would tell the customer instead."

So the user is explicitly inviting me to say "this can't be tested" if that's the honest answer. Good. I'll commit to that.

Let me write the response.

Structure:

1.The verdict, plainly: it cannot be validly tested for the buyer's purpose

2.Why, in 3 reasons (sample size, clock, no validation)

3.The ONE thing I would run, because it's the only thing the data supports: a sanity test / case study

4.The exact protocol for that sanity test

5.The customer conversation, verbatim

6.The path to a real product (which requires more data)

I should also be clear: the test I would run is NOT the production test. It's a hypothesis-confirming sanity test. The output is "consistent with the data" or "inconsistent with the data." It is not a "buy / don't buy" decision for a feed.

Let me write it.

Actually, I want to think more carefully about the sanity test. With 10 cases, what can Fisher's exact test detect?

If the true prevalence ratio is 3 (cases have 60% flag prevalence, controls have 20%), and you have 10 cases and 50 controls, the expected cell counts are:

- Cases with flag: 6, cases without: 4
- Controls with flag: 10, controls without: 40

Fisher's exact p-value on this 2x2: well-powered, probably p < 0.01.

If the true prevalence ratio is 2 (cases have 40% flag prevalence, controls have 20%):

- Cases with flag: 4, cases without: 6
- Controls with flag: 10, controls without: 40

Fisher's p-value: marginal, maybe p < 0.10.

If the true prevalence ratio is 1.5 (cases have 30% flag prevalence, controls have 20%):

- Cases with flag: 3, cases without: 7
- Controls with flag: 10, controls without: 40

Fisher's p-value: probably not significant.

So the test can detect a 2-3x prevalence ratio at p < 0.10 with 80% power. That's actually meaningful — a 2-3x prevalence ratio is the threshold for "the flag is informative at all."

OK, the sanity test is meaningful. Let me write it up.

For the sanity test, I want to be very specific:

- 10 cases
- 5 controls per case (50 controls), matched on size/sector/listing status
- For each, hand-extract the 5 governance flags in `[T_event - 18m, T_event]` where T\_event = T\_admit for cases, fixed date for controls
- T\_event for controls: I'll use 2025-01-01 (a date with full filing coverage)
- For each flag, compute 2x2: case status × flag presence
- For each flag, compute Fisher's exact p-value
- For the sum-of-flags, compute case-vs-control distribution

Pass:

- At least 3 of 5 flags have prevalence ratio ≥ 2.0 with one-sided p < 0.10
- AND median sum-of-flags in cases is ≥ 1 above median in controls

Fail otherwise.

This is the test. Let me write it up.

Actually, with 10 cases, I want to be careful about multiple testing. 5 flags × 2x2 tests = 5 hypothesis tests. Bonferroni-corrected alpha = 0.10 / 5 = 0.02. That's harsh. But the test is for "hypothesis consistency," not "production validation." So I'll use the uncorrected threshold with a clear note that this is a sanity test.

OK, writing the response now.

I want to be tight. The user wants commitment, not hedging. Let me commit to:

- Verdict: cannot be validly tested for the buyer's purpose
- The one test I would run: a sanity test (the case study)
- The exact protocol
- The customer conversation
- The path forward (which requires more data)

Length: medium. The user is in decision mode, give them what they need to decide.

I will commit. The honest answer is the first one.

### The verdict, plainly

**With fewer than 10 verified cases, 2 years of filings, and an unreliable court-date clock, the buyer's question cannot be validly tested.** Not "is hard to test" or "needs more work" — cannot. The numbers don't add up. Any number I produced would not be the number a fund pays for; it would be a number I dressed up to look like one.

I'm going to say why in three specific lines, then specify the one thing I would run anyway (a sanity test, not a product test), then give you the customer conversation I would have.

### Why it cannot be validly tested, in three lines

1.**<10 cases means no model can be fit and validated.** A 5-flag score with 5 thresholds is 5 parameters. With 8 cases in a 5-fold CV, you have 1-2 cases per fold. The score formula will fit noise. You cannot detect this from inside the design — that's the failure mode. (A hand-tuned scorecard of 1 point per flag has 1 parameter and is feasible, but with 8 cases the binomial CI on the prevalence ratio is wide enough to be consistent with anything from "signal works" to "signal is illusory.")

2.**An unreliable clock means lead time is not measurable, and lead time is the whole claim.** If T\_admit is wrong by ±6 months, your "12-month lead" measurement is 6-18 months. A 6-month lead and an 18-month lead are not the same product. You cannot claim "leading" because you cannot bound the lead. (You can still measure whether the flag fires in a wide lookback, but that is a different and weaker claim.)

3.**No validation is structurally possible.** Out-of-time backtest needs ≥2 snapshots with non-overlapping forward windows — you have 1. Out-of-sample test needs held-out cases — you have 8 cases, holding out 2 leaves 6. Cross-regime test needs 2 macro regimes — you have 1 (the 2024-2026 Indian credit cycle, COVID-distorted). The protocol I designed earlier specified 5 validation arms. With this data, 4 of them are physically impossible.

**Combined:** even if I run the cleanest possible test, the result is a single descriptive statistic from <10 cases with a noisy clock. I cannot tell you if it's a real signal or a sample-size accident. **I would not stake my reputation on that number being the right number for a feed.**

### The one thing I would run anyway

I'm not going to leave you with nothing. The data supports a **sanity test** — a hypothesis-consistency check, not a product test. It can tell you "the hypothesis is consistent with what we see" or "the hypothesis is contradicted by what we see." It cannot tell you "build it." Run it before any commitment of engineering time.

#### The "5-flag prevalence" sanity test

**Setup, frozen before extraction:**

- 8 (or however many) verified cases with at least one of: T\_admit, T\_petition, T\_default. Use the earliest of the three as T\_event. Document the uncertainty on T\_event for each case (e.g., "T\_admit available, T\_petition unknown, T\_default 2025-Q3, uncertainty ±6m").
- For each case, find 5 non-case companies matched on size (within 0.5x-2x revenue), sector, and listing status. From the universe; do not require survival.
- For each company (case + control), look back 18 months from T\_event (cases) or a fixed reference date 2025-01-01 (controls). The "18-month lookback with a noisy clock" gives you 12-24 months of effective lookback for cases — wider is fine, narrower is the problem.
- Hand-extract the 5 flags in this window. Record which flags are present, which are "unclear," and which are "not extractable from available filings."

**The test:**

| Test | Computation | Pass condition |
| --- | --- | --- |
| Per-flag prevalence ratio | For each of the 5 flags: 2×2 table of (case vs control) × (flag present vs absent). Fisher's exact one-sided p-value. | At least 3 of 5 flags have prevalence ratio ≥ 2.0 with p < 0.10 (uncorrected) |
| Sum-of-flags distribution | For each company, count flags present. Compare distribution in cases vs controls (Mann-Whitney, one-sided). | Median sum in cases ≥ 1 above median in controls, p < 0.10 |
| Clock-sanity check | For each case, plot flag dates on a timeline anchored at T\_event. Note whether flags fire in `[T_event - 18m, T_event - 6m]` (the "still leading" zone) or only in `[T_event - 6m, T_event]` (the "death-debris" zone). | At least 5 of 8 cases have ≥1 flag in the leading zone |

**Decision rule:**

- **All three pass:** the hypothesis is consistent with the data. The signal may exist. **This is not a product. This is a license to invest in more data and re-test in 8-12 weeks.**
- **Two of three pass:** weak consistency. The signal is in the noise. Don't invest.
- **Zero or one of three pass:** the hypothesis is contradicted by what we see. **Kill the project.** The flags are either rare, late, or both.

**Time:** 3 days, one engineer + one analyst. Mostly data pulling, hand-tracing timelines for the 8 cases, and Fisher's exact tests.

**What this test cannot tell you:**

- Whether the signal is leading (only that flags fire in a wide lookback; the clock is too noisy to bound the lead time)
- Whether the signal generalizes (8 cases is not a population)
- Whether a fund would pay for a feed (this is a sanity check, not a market test)
- The expected PPV, recall, or lift in production (any such estimate from 8 cases is fiction)

**What this test can tell you:**

- Whether the hypothesis is consistent with the data we have
- Whether to invest in IBBI verification work to expand the case set
- Whether to invest in LLM-level extraction (only if the keyword test passes first)
- Whether the team should be looking for a different project

### The customer conversation, verbatim

I would say this, and not less:

> "Here's where we are. We have 8 verified cases and 2 years of filings. With that, I can run a sanity test in 3 days. The sanity test will tell me whether the hypothesis — that governance flags predict insolvency — is consistent with what we see in these 8 cases. It will not tell me whether to build the product.
> 
> If the sanity test passes, I'll come back and tell you: the hypothesis is worth investing in, and here's what it costs to find out for real — 4-6 weeks of IBBI order-page verification work to grow the case set to 30+ verified cases, then a 2-week quantitative backtest with a frozen protocol. Total cost: ~$\[X\]. Total time: ~10 weeks. The output will be a real PPV/lift number you can underwrite.
> 
> If the sanity test fails, the project is dead. I will tell you that plainly and we will not have spent the 4-6 weeks.
> 
> What I will not do is ship a product based on 8 cases and a noisy clock. I won't quote you a precision number, I won't quote you a lead time, and I won't take your monitoring fee. If someone else will, they are selling you a number they cannot defend in front of a hostile auditor in 18 months. I won't be that person.
> 
> Three days for the sanity test, decision on whether to invest the next 10 weeks. That's what I can offer honestly."

**That is the conversation.** It costs the customer 3 days and a small bill. It buys them the right answer to "is this real" without a 10-week commitment. It also buys me the right to walk away with my reputation intact if the sanity test fails — which is more likely than not, because the prior on any one specific signal at <10 cases is "we don't know yet."

### The path to a real product, conditional on the sanity test passing

If the sanity test passes, the path is concrete and was specified in the earlier design (engineer spec + pre-registration). The only thing that changes is the gate at the end of phase 1:

| Phase | Work | Time | Gate to next phase |
| --- | --- | --- | --- |
| 0 | Sanity test (this protocol) | 3 days | Pass = proceed; fail = kill |
| 1 | Expand verified case set to 30+ via IBBI order-page work | 4-6 weeks | ≥30 verified cases with T\_event and lookback coverage |
| 2 | Quantitative backtest per engineer spec | 2 weeks | Pre-registered pass bar held |
| 3 | Forward FREEZE in parallel from Day 1 of phase 2 | 12 months prospective | Live evaluation at +12m |
| 4 | Decide ship / no-ship | — | Tier 1 product only (marginal value); Tier 2 (lead claim) requires Q2 support |

The customer buys phases 0 and 1 today. Phase 2 is conditional on phase 1 producing enough cases. Phase 3 is free if you commit to it. **The buy decision on a feed is at the end of phase 3, not before.**

### One last thing, direct

You asked me to commit. I'm committing to this: **the buyer's question is not answerable with the data you have today, and I would not pretend otherwise.** The sanity test is the most I can honestly give you. If you want me to "just run something" and report a number, the answer I would give that number is "don't trust it." That isn't a refusal; it's a different kind of service.

If the sanity test passes, we have a 10-week path to a real product. If it fails, you save 10 weeks. Either way, the customer gets a defensible answer in 3 days, and I keep my name attached only to numbers I can stand behind.

That's the test. Run it or don't, but don't run anything else until you do.

15:00

MiniMax-M3