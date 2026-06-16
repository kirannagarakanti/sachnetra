---
date: 2026-06-04
problem: Pillar A (the latency edge) only monetizes on mid/small-caps once news→ticker tagging coverage rises there. The older view was "microcap names missing from the master." Is that still the bottleneck, or has it moved?
status: researched
lane: James (build) + Lijo (validate)
tags: [research-note, G1, tagging, NER, alias-matching, entity-resolution, pillar-a, news-ticker]
sources_consulted: [
  "shared/nse-equity-master.json (READ 2026-06-04: 2,386 tickers w/ name+aliases)",
  "shared/nse_all_active.json (READ: 2,385 active NSE symbols)",
  "scripts/research/output/exp11/recall_diagnosis.md (the untagged-but-market-moving sample)",
  "WebSearch: financial NER / ticker entity-resolution / fuzzy alias matching (John Snow Labs, FactSet, O'Reilly Financial Data Engineering)",
  "memory/project_g1_post_deploy_state; project_g1_execution_plan"
]
---

# Research: Where is the G1 tagging gap NOW? (it moved — it's alias-form, not master size)

> Pillar A of the mid-cap bet (`midcap-event-arbitrage-dossier.md`) is gated on G1 — raising news→ticker
> coverage on mid/small-caps. This note re-diagnoses the gap against the *current* files. (New note; edits
> nothing. Reading code/data only.)

## Problem & current state (verified against files this session)
- **Old framing** (recall_diagnosis, 2026-05-29; memory): coverage ~8% (24h), real gap = "small/microcap
  earnings missing from the master + untaggable macro."
- **What changed**: the G1 universe scaffolding (`nse_all_active.json`) landed. **The master is now
  essentially COMPLETE**:
  - `nse-equity-master.json` = **2,386 tickers** (each with name + aliases)
  - `nse_all_active.json` = **2,385 active NSE symbols**
  - i.e. the master covers ~the entire active NSE universe. **"Missing microcap names" is largely no longer
    the bottleneck.**
- **"Solved"** = an accurate, evidence-based statement of what actually limits company-news recall now, and
  the highest-leverage fix.

## The real gap (proven with a concrete case)
The recall_diagnosis listed "**AB Cotspin India** consolidated net profit declines 7.11%" as untagged-but-
market-moving. Grepping the master:
- The company **IS in the master**: ticker `ABCOTS`, name "A B Cotspin India Limited", aliases include
  "**A B Cotspin**", "A B Cotspin India".
- The headline writes "**AB Cotspin**" (no space between the initials). The alias is "**A B Cotspin**"
  (spaced). **A word-boundary regex match fails on the spacing difference.** The name is present; the *form*
  doesn't match.

**So the dominant company-news recall gap is alias-FORM mismatch, not master coverage.** Common variants the
current matcher likely misses:
- Spaced vs unspaced initials: "AB Cotspin" vs "A B Cotspin"; "L T" vs "LT" vs "L&T".
- `&` vs "and"; HTML entities (`S&#038;P`) — the hygiene issue flagged in the quant-mind review.
- "Ltd" vs "Limited" vs omitted; punctuation ("(S.A)", ".", "-").
- Suffix/segment words ("India", "Industries") present in master but dropped in headlines (or vice-versa).

The other recall_diagnosis names (Wires & Fabriks, Helpage Finlease, Arihant Academy, Zappfresh, Current
Infraprojects) did **not** grep-match the master → a residual genuine-coverage gap for **SME-platform /
BSE-only / very-recent-IPO** names that aren't in the NSE main-board active list. Smaller than the alias
issue, but real.

## Candidates — what works / what might not

| Fix | Domain | Works because | Might NOT work because | Verdict |
|---|---|---|---|---|
| **Alias normalization** (collapse initial-spaces, `&`↔and, strip punctuation/HTML entities, Ltd/Limited fold) at build time + match time | tagging | Directly fixes the proven AB-Cotspin class; deterministic, fast, no LLM; fits the existing word-boundary matcher | Over-normalization can create false positives (e.g. "AB" matching unintended text) — needs the V2-031b stoplist discipline | **Pursue (P0, James)** |
| **Generate spacing/punctuation alias variants** in `nse-equity-master.json` build | tagging | One-time expansion; keeps the hot-path matcher simple | Master grows; must regen on universe change | **Pursue (P1)** |
| **Fuzzy match** (token-set ratio) as a *second pass* on untagged market-moving rows | tagging | Catches residual variants | Fuzzy = precision risk; must gate hard (≥ threshold) and keep deterministic as primary (V2-031 D2) | **Park** (offline-only; never hot path) |
| **Add SME/BSE-only names** to the universe | tagging/data | Closes the residual genuine-coverage gap | SME names are low-liquidity — even if tagged, they fail the Exp16 liquidity filter anyway | **Park** (low ROI for the liquid-midcap bet) |
| **Change the coverage denominator** | research | The 95% systemic/macro news is *irreducibly untaggable* (no single ticker in "Sensex crashes") — measure **recall among market-moving**, not headline coverage | — | **Pursue (already established; keep)** |

## Verdict (gate-checked)
- **Recommendation: PURSUE alias normalization (P0, James lane)** — it's the highest-leverage, deterministic
  fix and the AB-Cotspin case proves it's a real chunk of the gap. **The master itself is done — stop trying
  to expand it.** Accept the untaggable-macro floor and track **recall-among-market-moving**, not headline %.
- **Gate**: data tier ✅ (operates on data we have) · kill list ✅ (pipeline tagging, not UI) · live consumer
  ✅ (Pillar A / the mid-cap latency edge) · right denominator ✅ (recall-among-market-moving, not the
  rejected 20% headline gate).
- **Boundary**: the fix is a James-lane change to `_india-market-keywords.mjs` / the master build — Claude
  diagnosed read-only here; does not edit the matcher.

## Open questions / what I couldn't verify
1. **How much of the recall gap is alias-form vs genuine SME/BSE-only absence?** Needs a labelled pass over
   the untagged-market-moving rows (read-only on `india_news_signals`) classifying each as form-mismatch vs
   not-listed. The AB-Cotspin case proves form-mismatch exists; the *share* is unquantified.
2. **Does the current matcher already normalize anything?** It has `normalizeQuotes()` (per quant-mind
   review) but apparently not initial-spacing — confirm by reading `_india-market-keywords.mjs` matching
   logic before James implements (avoid double-work).
3. **HTML-entity decode** — the `&#038;` artifact (quant-mind note) overlaps this fix; do them together.

---
*Reflection: the G1 story has moved. The master is complete (2,386 ≈ full active universe), so the old
"missing microcaps" framing is stale. The live gap is alias-FORM matching — proven by "AB Cotspin" (headline)
≠ "A B Cotspin" (master) — plus the irreducible untaggable-macro floor. Fix = deterministic alias
normalization, not a bigger master. This is the cheapest unblock for Pillar A.*
