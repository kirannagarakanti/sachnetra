---
date: 2026-06-04
problem: Exp16 uses the announcement-day price reaction (EAR) as the earnings-surprise proxy because we lack consensus/SUE data. Does EAR-based drift actually CONTINUE (PEAD, tradeable) or REVERSE (overreaction, the opposite)? This is the load-bearing design assumption of Exp16.
status: researched — CONFLICTING EVIDENCE (flagged, not resolved)
lane: Lijo
tags: [research-note, PEAD, EAR, SUE, exp16, overreaction, reversal, design-risk]
sources_consulted: [
  "Brandt, Kishore, Santa-Clara & Venkatachalam (2008) — Earnings Announcements are Full of Surprises (UCLA Anderson PDF / SSRN 909563) — PDF NOT parseable locally (no pdftoppm); claims taken from WebSearch summary of the paper",
  "Rockstead Capital — Capturing Post-Earnings Drift: A Two-Factor Approach — PAGE-VERIFIED 2026-06-04 (HTML, a replication/backtest)",
  "Bathke et al. (2019) — Investor Overreaction to Earnings Surprises and Post-Earnings-Announcement Reversals (Contemporary Accounting Research) — search-summary",
  "Quantpedia PEAD page (page-verified earlier) — uses the SUE×EAR intersection",
  "Internal: wiki/experiments/exp16_brief.md; research-notes/2026-06-04_pead-size-liquidity-resolution.md"
]
---

# Research: Is Exp16's EAR-only surprise proxy sound — or does it capture reversal?

> Exp16 (`exp16_brief.md`) can't compute SUE (no analyst-consensus DB), so it proxies the earnings surprise
> with the **announcement-day abnormal return (EAR)**. This note stress-tests that single design choice.
> **Result: the evidence CONFLICTS** — and that conflict is the finding. (New note; edits nothing.)

## Problem & current state
- **Problem**: Exp16 longs mid-caps that post a top-quintile EAR, betting the move *continues* (drift). But
  a day-0 price spike could instead be *overreaction that mean-reverts* — in which case the strategy is
  backwards. We have no SUE leg to fall back on.
- **"Solved"** = a sourced answer on whether EAR-based drift continues or reverses, and what that implies
  for Exp16's design and acceptance gates.

## What I searched
- The seminal EAR paper (Brandt/Kishore/Santa-Clara/Venkatachalam 2008) — primary; PDF couldn't be parsed
  locally, so its claims are from the WebSearch summary, not page-verified.
- A practitioner replication (Rockstead) — page-verified HTML.
- The overreaction-reversal literature (Bathke 2019) — search-summary.

## The conflict (stated plainly, not resolved in our favour)

| Source | EAR single-factor | SUE single-factor | Reversal? | Combined |
|---|---|---|---|---|
| **Brandt et al. 2008** (primary; search-summary, US 1974–2004) | **+7.55%/yr, STRONGER than SUE** | lower | **EAR does NOT reverse** (continues) | ~12.5%/yr |
| **Rockstead** (replication; page-verified HTML, period/universe unstated) | **−3.39% spread — REVERSES** ("market overreacts… fades") | **+3.91%** (the leg that works) | +5.48% (corr ≈ 0.004) |

These **directly disagree on the one thing that matters for Exp16**: does an EAR-sorted long continue (drift)
or reverse (overreaction)? Both can't be right for our use case.

### How to read the conflict (honestly)
- **It could be decay / replication failure.** Brandt et al. is 1974–2004 US. Published anomalies frequently
  weaken or invert post-publication (cf. the India size anomaly *fading*, Sharma et al. 2021). Rockstead's
  more recent replication finding EAR *reverses* is consistent with EAR-overreaction having decayed/inverted.
- **It could be definition/sample differences** (Rockstead's exact EAR window, universe, period are not
  stated on the page; Brandt uses day −1..+1 vs a matched FF benchmark — same as our plan).
- **The overreaction literature (Bathke 2019) independently documents PEAD *reversals*** driven by
  representativeness/overreaction to extreme surprises — i.e. reversal is a real, documented regime, not a
  fluke.
- **Both agree on one thing: SUE and EAR are near-independent** (corr ≈ 0.004). And Rockstead says the **SUE
  leg is the one carrying positive drift** — which is exactly the leg **we cannot build** without a
  consensus/fundamentals collector.

## What this means for Exp16 (the actionable part)
1. **EAR-only is the weakest link in Exp16 — elevate it from "limitation footnote" to "primary test."**
   Exp16 must **first** establish, on Indian mid-caps, whether top-EAR names *continue or reverse* over
   {5,10,15}d. If they reverse, the long-only-winners design is backwards and the experiment should pivot
   (e.g. fade extreme EAR) or stop — not be tuned until it "works."
2. **Add an explicit reversal check to the Exp16 gates**: report the CAR sign and the day-by-day path, not
   just the cumulative — a positive 5-day CAR that is a decaying spike (reverses by day 15) must be
   distinguished from genuine monotonic drift.
3. **The SUE leg may be the one that actually works** (per Rockstead). This **raises the priority** of a
   to-be-filed consensus/fundamentals collector from "Park, nice-to-have" toward "the missing piece that
   may carry the alpha." Worth a roadmap line even if not built now.
4. **Don't assume the Brandt 7.55% transfers.** It's old, US, and contradicted by a recent replication; on
   Indian mid-caps the prior should be *agnostic*, tested, not assumed-positive.

## Verdict (gate-checked)
- **Recommendation: PARK Exp16's EAR-only design as HIGHER-RISK than the brief implied — keep the pilot, but
  re-scope its first gate to "continue vs reverse," and treat a reversal result as a valid (informative)
  outcome, not a failure to be optimized away.** Still G4-blocked regardless.
- **Gate**: data tier ❌ (G4) · kill list ✅ · live consumer ✅ (sharpens Exp16) · right denominator ✅ (the
  added reversal check is the *correct* discriminator).
- **Confidence**: HIGH that the evidence conflicts (both sources fetched/summarized); the *resolution* is
  unverifiable from the literature alone — it must be tested on our own Indian mid-cap data (post-G4).

## Open questions / what I couldn't verify
1. **Primary-source page verification** — the Brandt et al. PDF couldn't be parsed locally (no `pdftoppm`).
   Route to Gemini recon (browser) to confirm the 7.55% / "no reversal" claims and the exact sample, OR find
   a text/HTML mirror. Until then the "EAR continues" side is *search-summary only*.
2. **Rockstead's sample/period/universe** — not stated on the page; without it, its "EAR reverses" result is
   suggestive, not authoritative. Worth pinning down.
3. **India-specific EAR-vs-SUE** — neither source is India. Harshita (India) used SUE, not EAR. There may be
   no India EAR-drift study; if so, Exp16 *is* the first test — which is fine, but means agnostic priors.

---
*Reflection: this is the most important "what might not work" of the whole PEAD thread, and it cuts against
the plan. The signal we CAN build (EAR) is the one a recent replication says reverses; the signal that works
(SUE) is the one we CAN'T build without new data. Exp16 stays worth running — but as an honest test of
continue-vs-reverse on our own data, not as a foregone "capture the drift." Document the conflict; don't
resolve it by picking the convenient citation.*
