---
date: 2026-06-12
problem: P1d — given the full article body (now obtainable, per P1c), can a Flash-class specialist turn it
  into the structured per-article record the Mind needs (entity, event_type, stance, novelty, surprise,
  confidence, rationale) accurately enough that Lijo trusts it as a building block?
status: BRIEF — pre-registration. Sample harness + Antigravity run NOT YET DONE. Probe-grade (no Exp ID;
  Phase-1 gate, per the build blueprint). Mirrors the exp21_brief shape: hypothesis → pre-registered pass
  reads → locked bucket taxonomy → method (fill-in schema for the external agent) → traps → execution.
lane: Claude (sample harness + scoring) · Lijo (the 30-record audit — the gate) · Antigravity Gemini 3.5
  Flash (fills the records; mirrors the production specialist tier)
tags: [probe, p1d, news-brain, specialist-quality, structured-record, pre-registration, fresh-eyes-shape,
  antigravity, error-taxonomy]
sources: [
  "build blueprint Phase-1 (P1d row) + report-card v0.2 §3(i) information-quality bar (≥95% factual / sane);",
  "news-brain what-it-does spec §3 (the per-company status; the per-article record fields are the blueprint's
   stance/novelty/surprise/confidence/rationale/model_id);",
  "P1c results (full body now obtainable via own-fetch JSON-LD on 4/5 load-bearing sources)"
]
---

# P1d — Brief: specialist record-quality probe

## 1. Why this, why now
P1a proved the directional *signal* exists; P1c proved we can *read* the full article cheaply (own-fetch
JSON-LD). P1d tests the third leg of "the agent extracts, a tested rule decides": **can the agent extract?**
If a Flash-class model can't reliably turn body text into a faithful structured record, the whole specialist
layer (C4) is unsafe to build on — better to learn it now, at ~zero cost, on ~30 articles. This is the last
"does the core mechanism work" probe before the reading spine (Phase 2) gets built.

## 2. Hypothesis (written before looking)
- **H-P1d (extraction is reliable):** On real Indian company-news articles, Gemini Flash emits a structured
  record whose **primary entity, event_type, and stance *direction*** are correct, with a rationale faithful
  to the text and **no fabricated facts**, on the large majority of articles.
- **Failure mode we most fear (pre-named):** *hallucinated specifics* — a confident number/date/claim not in
  the source. This is graded in its own bucket because it's the one error that silently poisons downstream
  status, and a high rate kills the specialist design regardless of overall accuracy.

## 3. Pre-registered pass reads (LOCKED before the run)
The audit is **30 records, hand-graded by Lijo** into the §5 buckets. Decision:

| Outcome | Trigger |
|---|---|
| ✅ PASS | (A+B) ≥ 80% **AND** hallucination bucket D ≤ 5% **AND** no systematic stance-direction bias (not >⅔ of errors in one direction) → C4 is safe to build; proceed to Phase 2 |
| 🟡 CONDITIONAL | (A+B) 65–80%, or D in 5–10% — usable only with a stricter prompt / a corroboration gate; re-run the probe once after the prompt fix before Phase 2 |
| ❌ FAIL | (A+B) < 65% **or** D > 10% → Flash is not good enough for autonomous extraction; escalate model tier (Pro/Claude) for C4 and re-cost, or narrow event_type scope |

(The ≥80% bar is the report-card v0.2 §3(i) information-quality direction; the D≤5% floor mirrors the
report card's placebo/false-rate floors. Probe-grade, not experiment-grade — small N, first read.)

## 4. The record schema the specialist fills (per article)
```jsonc
{
  "primary_entity":   "TICKER or company name",      // the company the article is mainly about
  "event_type":       "results|order_win|mna|fundraise|rating|pledge|management_change|regulatory|guidance|legal|other|none",
  "stance":           0.0,                            // -1.0 (clearly bad for the company) .. +1.0 (clearly good)
  "magnitude":        "low|med|high",                 // how material to the company
  "novelty":          0.0,                            // 0 = already-known/stale .. 1 = genuinely new info (Tetlock)
  "surprise":         0.0,                            // 0 = in line with expectations .. 1 = big surprise vs expectations
  "confidence":       0.0,                            // 0..1 the model's confidence in THIS record
  "factor_touches":   [ { "factor": "crude|inr|repo|monsoon|...", "sign": "+|-" } ],  // optional; [] if none
  "rationale":        "one sentence, grounded ONLY in the article text",   // MANDATORY
  "model_id":         "gemini-3.5-flash"              // stamped by the runner / agent
}
```
Rule carried from the blueprint: **rationale is mandatory and must be grounded only in the article** — it is
what makes the record auditable and the hallucination bucket gradable.

## 5. Error taxonomy — the LOCKED grading buckets (Lijo assigns one per record)
| Bucket | Meaning | Counts as |
|---|---|---|
| **A — Clean** | primary_entity, event_type, and stance *direction* all correct; rationale faithful; no invented facts | pass |
| **B — Minor slip** | entity + direction correct, but a field is off (magnitude/novelty/surprise mis-scaled, or rationale thin) — still usable | pass |
| **C — Wrong call** | stance direction wrong, OR wrong primary entity, OR event_type misclassified — would mislead downstream | fail |
| **D — Hallucination** | asserts a specific fact (number/date/claim) NOT in the article — the trust-killer | fail (own floor) |

A record can only be one bucket; D dominates (any hallucination → D even if direction was right).

## 6. Method
> **Method correction (2026-06-12, found at build time):** the pipeline stores **google-news redirect URLs**
> for ET/BS/LiveMint/FE (they enter as gnews proxies), which JSON-LD cannot read. But the Mind's C1 is an
> **own RSS reader over the publishers' DIRECT feeds** (the P1c path) — so the faithful sample **harvests
> recent articles straight from the direct publisher feeds** (ET, Moneycontrol, LiveMint, Business Standard),
> not from `india_news_signals`. This mirrors the production input exactly. `our_tag` is dropped (it was only
> context, never the arbiter — Lijo reads the article).

1. **Sample (Claude, read-only):** harvest recent articles from the **direct publisher feeds** (ET company +
   markets, Moneycontrol business + results, LiveMint, Business Standard), **stratified across source**. For
   each, fetch the full body via the P1c JSON-LD path; **keep only articles with ≥120 body words** (a
   thin-body record can't be graded fairly). Emit `p1d_sample.json`: `{ id, source, headline, url, body }`
   per article + one pasteable specialist prompt.
2. **Fill (Lijo via Antigravity, Gemini 3.5 Flash):** run the body+prompt → one §4 record per article. No API
   quota burned (the P1c lesson). Paste the records back.
3. **Score (Claude):** attach each record to its article; **Lijo grades 30 into the §5 buckets** (the gate).
   Claude tallies A/B/C/D, checks the §3 triggers, writes `2026-06-12_p1d-results.md` with the verdict +
   the error examples (esp. every D, verbatim, with the offending source sentence).
4. **`our_tag` is context, not ground truth** — the pipeline's existing ticker tag is shown to sanity-check
   primary_entity, but Lijo's read of the article is the arbiter (the pipeline tagger has its own FP issues).

## 7. Traps & caveats (locked in advance)
1. **Antigravity Flash ≠ the production API specialist** — same model family/tier, but a different harness.
   A pass here is necessary-not-sufficient; the production C4 re-runs this audit on its real prompt (Phase-4
   gate). P1d is the *go/no-go on the premise*, not the final acceptance.
2. **Small N (~30)** — first read, gate-grade. A borderline result (🟡) means re-run larger, not ship.
3. **Single-ticker selection bias** — easier articles than multi-entity ones; if Flash fails even here, the
   verdict is decisive; if it passes, multi-entity is the known harder follow-on (note, don't chase now).
4. **Grader is one human** — Lijo. Bucket definitions are locked here to keep the call honest; ambiguous
   records get noted, not silently bucketed.
5. **stance/novelty/surprise are subjective** — graded on *direction/sanity*, not exact decimals (B exists
   precisely to absorb reasonable scaling disagreement).
6. **Body via JSON-LD only** — HBL-class (no JSON-LD) sources are out of this sample by construction; their
   record quality is untested until the Readability fallback exists.

## 8. Execution plan
1. Claude: `scripts/research/p1d-sample-builder.mjs` (read-only; pulls + fetches bodies + writes
   `output/p1d/p1d_sample.json` + the prompt). 
2. Lijo: Antigravity run → paste records.
3. Claude: score; Lijo: 30-record bucket audit → `2026-06-12_p1d-results.md` + verdict against §3.
4. On ✅ → Phase 2 (the reading spine). On 🟡 → prompt fix + one re-run. On ❌ → escalate C4 model tier.

---
*Pre-registered probe design only. Tests whether a Flash specialist can extract a faithful structured record
from full body text; it does not test whether the resulting status predicts price (that is the Phase-7 report
card). Probe-grade — no Exp ID.*
