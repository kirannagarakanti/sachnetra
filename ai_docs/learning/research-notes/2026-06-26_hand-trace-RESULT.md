---
tags: [hand-trace, result, governance-signal, blow-up, verdict, inconclusive, feature-sparsity]
date: 2026-06-26
status: RESULT — the first real verdict on the governance blow-up early-warning signal. 13 hand-traced primary
  pairs (case vs matched control), scored F1-F6 against the locked pre-registration. VERDICT: 🟡 INCONCLUSIVE
  (directionally real, just under the strict bar). Reproducible: scripts/research/analyze-hand-trace.mjs.
related: 2026-06-26_governance-blowup-PREREGISTRATION.md, 2026-06-26_hand-trace-roster-VERIFIED.md,
  ai_docs/holdings/_pledge_tally.md, [[project-pivot-governance-door]]
---

# Hand-Trace RESULT — governance blow-up early-warning

## The numbers (13 primary pairs, composite F1+F2+F3+F4+F6, window [T0-18m, T0-6m])
- **Composite: 8 W · 4 T · 1 L → strict separation 61.5%** (case > control). Non-strict (case ≥ control) = **92.3%**.
- Pre-registration bar (§5.1): PASS ≥65% · KILL <55% · 55–65% INCONCLUSIVE. → **🟡 INCONCLUSIVE (borderline).**
- **Dumb-benchmark (pledge / F2 alone): 15.4%** strict (2 W, 11 T) → **fails badly.** The composite BEATS pledge-alone
  by 4× → the multi-factor score adds real signal; pledge alone is NOT the discriminator.

## What it means (honest)
1. **The signal is directionally REAL.** 12 of 13 cases scored ≥ their matched healthy control; only ONE loss
   (Signet, whose window was 53% truncated). Blow-ups DO carry more governance friction than lookalikes — that's a
   genuine, first positive-leaning result for the whole pivot.
2. **But it doesn't cleanly clear the pre-registered strict bar** (61.5% < 65%). The reason is **TIES, not losses** —
   4 pairs tie at low counts (both case and control have 0–1 flags). I.e. the binding constraint is **feature
   SPARSITY**: regex-on-headlines is too coarse to separate at fine granularity. This is a *measurement* limit, not a
   thesis failure — and it's exactly what richer extraction would fix.
3. **Pledge (F2) is a minority signal** — only 3 of 13 blow-ups had high pledge (Gensol 78%, Winsome 95%, SAB Events
   55%); the other 10 went bankrupt with ~0 pledge (operational/financial distress, not promoter over-leverage). The
   "obvious" feature underperformed; the unglamorous ones (auditor change, KMP exit, delayed results) carry it.

## The path to conclusive (cheap → expensive)
- **Resolve the 2-3 questionable-arc cases** (Winsome 95%-pledge & SAB Events — possible old/already-distressed
  shells like the dropped RHFL/XL Energy; and Signet, the one loss, with a truncated window). Result is fragile to these.
- **Add F5 (RPT)** where available, and the 3 degenerate-check pairs (AGS/BIL Vyapar/FSC controls) for more N.
- **The real unlock = richer feature extraction.** The ties come from sparse headline regex. **LLM / body-text
  extraction (the parked SachManas router) would detect more governance events per company and break the ties** —
  pushing a directionally-real 61.5% toward a conclusive read. *This connects the result straight back to the
  "structuring is the moat" thesis: better extraction → better signal.*

## Bottom line
Not a clean win, not a kill — **"directionally real, gated on richer extraction."** The governance blow-up signal has
genuine content (12/13 directional), pledge is a weak minority feature, and the cheap regex version is one notch under
the bar because it's too coarse. That's an honest, useful place to land — and it's the FIRST evidence in the pivot
that points *up*, not at another null.

## Next (per pre-reg §7): the ATTACK ROUND
Feed this locked pre-registration + these real numbers back to the 10-model crew to red-team: is 61.5%/92.3% real or
an artifact? are Winsome/SAB Events legit? would a risk desk care about a directional-but-not-strict signal? Then
decide: invest in the LLM-extraction upgrade to firm it up, or hold.
