---
date: 2026-06-04
problem: Resolve the load-bearing open question from the PEAD follow-up — is Indian earnings drift actually LARGER in mid/small-caps (the entire rationale for the mid-cap pilot), or not?
status: researched
lane: Lijo
tags: [research-note, PEAD, event-study, size-effect, liquidity, mid-cap, small-cap, resolution]
sources_consulted: [
  "Harshita, Singh & Yadav (2018) — PEAD Anomaly in India (SCIRP open-access full text) — PAGE-VERIFIED 2026-06-04",
  "Quantpedia — Post-Earnings Announcement Effect strategy page — PAGE-VERIFIED 2026-06-04 (quantpedia.com/strategies/post-earnings-announcement-effect)",
  "Sharma, Subramaniam & Sehgal (2021) — Are Prominent Equity Market Anomalies in India Fading Away? (SAGE, Global Business Review) — search-summary only (paywalled)",
  "Sehgal & Bijoy (2015) — Stock Price Reactions to Earnings Announcements: Evidence from India (SAGE) — search-summary only",
  "Philadelphia Fed WP 21-07 PEAD.txt (2021) — 403, NOT fetched",
  "Internal: 2026-06-04_pead-mid-small-caps-followup.md; Harshita page-verification"
]
---

# Research: Is Indian PEAD bigger in mid/small-caps? (resolving the load-bearing question)

> Continues the PEAD thread (`2026-06-04_pead-mid-small-caps*.md`). Those notes flagged ONE unresolved
> gap that gates the whole mid-cap pilot (Exp16): **is the drift actually larger in mid/small-caps, or
> did we just assume it?** This note resolves it with page-verified sources. (New note — does not edit
> the prior ones.)

## Problem & current state (with evidence)
- **Problem**: The mid-cap PEAD pilot's entire premise is "less analyst coverage on mid/small-caps →
  slower repricing → bigger drift." The first follow-up's "2.43%/mo illiquid-quintile" figure was a
  **search-summary error** (withdrawn after page-verifying Harshita). So as of the last note the premise
  was **unresolved** — Sehgal & Subramaniam's liquidity split was never extracted.
- **What was verified before this note**: Harshita et al. (2018), India, Nifty 500, 2002–2017 — **~6%
  long-short SUE drift over 64 days, survives controls** for beta/size/P&B/illiquidity/idio-vol. Critically:
  its **SUE × Illiquidity (Amihud) interaction is INSIGNIFICANT**, but its **SUE × Size interaction is
  significant negative (−0.06, 5%) in 2008–17** — i.e. drift is *enhanced in smaller stocks* on the size
  axis, but not cleanly along the pure-illiquidity axis.
- **"Solved"** = a defensible, sourced answer to "is drift bigger in mid/small-caps?" with the size-vs-
  liquidity distinction made explicit, so Exp16 is designed against reality, not assumption.

---

## What I searched
- **Quantpedia** PEAD strategy page (page-verified) — the canonical practitioner synthesis of the global
  PEAD literature, including the size/liquidity gradient and long-vs-short decomposition.
- **India-specific**: Harshita 2018 (already page-verified); Sehgal & Bijoy 2015 and Sharma/Subramaniam/
  Sehgal 2021 (search-summary — SAGE paywalled, no open mirror found this pass).
- **US rigor**: Philadelphia Fed WP 21-07 (PEAD.txt) — 403, could not fetch; route to recon if needed.

---

## Findings — what works / what might not

| Claim | Source(s) | Evidence quality | Verdict |
|---|---|---|---|
| **Drift is substantially stronger in small, less-liquid stocks** | Quantpedia (page-verified): "main performance contributors are small-capitalization stocks… caution during implementation"; global lit consensus | Tier A (canonical synthesis of many peer-reviewed studies) | **Supported (global)** |
| **In India specifically, drift is enhanced in *smaller* firms** | Harshita 2018 (page-verified): SUE×Size −0.06 significant (5%) in 2008–17 | Tier A (peer-reviewed, page-verified) | **Supported on the SIZE axis** |
| **In India, drift scales with *illiquidity* (Amihud)** | Harshita 2018: SUE×Illiquidity **insignificant** every sub-period | Tier A | **NOT supported** — size ≠ liquidity here |
| **Most PEAD return comes from the LONG side → long-only viable** | Quantpedia (page-verified): "most of the returns come from the long side, so it is not a problem to implement it as long-only" | Tier A | **Supported** — independently corroborates our SLB-driven long-only conclusion |
| **The India size/volume anomaly is FADING over time** | Sharma, Subramaniam & Sehgal (2021): "size and volume anomalies… have faded substantially over time" | Tier B (search-summary, paywalled) | **Likely — a real decay risk** |

### The resolution (size vs liquidity — the distinction that was being conflated)
- **The premise is broadly CONFIRMED, but on the SIZE/coverage axis, not the pure-liquidity axis.** Both
  the global literature (Quantpedia) and the one page-verified India paper (Harshita SUE×Size) agree the
  drift is **bigger in smaller firms** — consistent with the "less analyst coverage → slower repricing"
  mechanism the mid-cap thesis rests on.
- **BUT** Harshita's insignificant Amihud interaction means the drift does **not** cleanly increase with
  *illiquidity* per se. This matters: the earlier "sweet spot" logic framed it as a liquidity gradient
  (huge drift in illiquid names, eaten by cost). The truer framing is a **size/coverage gradient** — and
  size and Amihud-illiquidity are correlated but not identical. So the right target is **smaller, under-
  covered names that are still liquid enough to trade** (which is also where cost is bearable) — the
  premise and the cost argument point at the *same* band for *different* reasons, which is reassuring.
- **Long-only is doubly confirmed**: Quantpedia says the long side carries PEAD returns regardless of the
  SLB constraint we already documented. So long-only isn't just a workaround for the dead SLB book — it's
  where the alpha is anyway.
- **New caveat surfaced**: the India size anomaly appears to be **fading** (Sharma et al. 2021). Any Exp16
  must test on the **most recent** sub-period, not just the full 2002–2017 window, or it risks validating
  a decayed edge. This is a DSR/recency discipline issue, not a kill.

---

## Verdict (gate-checked)
- **Recommendation: the mid-cap PEAD premise is RESOLVED as broadly supported (size axis) — Exp16 is worth
  designing.** Still **PARK on execution, gated on G4** (no midcap prices yet). This note removes the
  "premise unverified" blocker that was hanging over Exp16; it does not remove the G4 data blocker.
- **Gate**:
  - **Data tier ❌ (execution)** — needs Midcap-150 prices in `research_prices` (G4). Unchanged.
  - **Kill list ✅** — proprietary quant research, not UI/SaaS.
  - **Live consumer ✅** — directly feeds the mid-cap event-arbitrage bet and the Exp16 design.
  - **Right denominator ✅** — CAR net of cost floor; plus a NEW recency requirement (test latest sub-period for decay).
- **What changed vs the last note**: the premise moved from *unverified* → **supported on the size/coverage
  axis** (page-verified Harshita SUE×Size + Quantpedia), with the explicit correction that it is **not** a
  pure-illiquidity gradient. Long-only is reinforced as the alpha-bearing leg, not just an SLB workaround.

---

## Open questions / what I couldn't verify
1. **India size-stratified drift magnitudes** — Harshita gives an interaction *sign/significance*, not
   decile drift levels. A paper with explicit small-vs-large CAR levels for India (Sehgal & Bijoy 2015 may
   have it) is paywalled; route to Gemini recon (browser) for a page-level extraction.
2. **Decay magnitude** — Sharma et al. (2021) "fading" is search-summary; the actual size-anomaly half-life
   / recent-period returns need page-verification before Exp16's recency gate is calibrated.
3. **EAR vs SUE proxy** — Quantpedia uses BOTH a SUE quintile AND an Earnings-Announcement-Return (EAR)
   quintile intersection. Our Day-0-proxy plan only has the EAR side (no consensus DB for SUE). Worth
   testing whether EAR-only retains most of the drift (Quantpedia's construction suggests the intersection
   matters) — feeds Exp16 design.

---
*Reflection: page-verification again changed the framing — the premise survives, but as a SIZE/coverage
effect, not the pure-illiquidity gradient the first pass asserted. The cost argument and the alpha argument
happen to point at the same band (small-but-still-liquid), and long-only is where the return is anyway. The
one genuinely new risk is anomaly decay (fading), which becomes a recency requirement on Exp16.*
