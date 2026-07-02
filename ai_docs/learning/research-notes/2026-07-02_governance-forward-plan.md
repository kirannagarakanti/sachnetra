---
tags: [governance-signal, forward-plan, freeze, deep-history-rebuild, parked, publish-nulls]
date: 2026-07-02
status: >
  LIVING. Post-kill-test forward plan. VERDICT was NULL for a retrospective leading credit-early-warning feed on our
  current 2-year corpus (see 2026-07-02_governance-kill-test-RESULT.md). Two arms decided by Lijo 2026-07-02:
  (A) FORWARD FREEZE + publish nulls = do now. (B) DEEP-HISTORY REBUILD = parked, resume when time.
reads: 2026-07-02_governance-kill-test-RESULT.md · 2026-07-02_governance-decisive-test-SPEC-v1.md ·
  2026-07-02_governance-kill-test-RUN-SHEET.md
---

# Governance signal — forward plan (post kill-test)

The kill test returned an **EARNED null** for a retrospective, sellable, *leading* credit-early-warning feed on our
current data. *(Corrected after a repo-aware red-team: the fresh-eyes panel was **primed, not blind** — it ratified
premises we supplied, so "triangulated three ways" is retracted; the null is now **measured**, not asserted — the
re-anchored specificity probe returned **S = 0.153 < 0.3** for the 4 keyword flags, and ~62% of survivors also flag;
the moat point is a listed-only caveat, not a blanket kill.)* The only live remnant = the **"looting" flags
(pledge/RPT)**, which aren't in filing text and stay untested → **Arm B**. This doc holds the two forward arms.

---

## ARM A — FORWARD FREEZE (do now; the only skeptic-proof arm)

**Why:** every retrospective design is dismissible as hindsight (the flags were chosen from famous blow-ups). A
sealed, timestamped forward prediction is the one thing a skeptic can't argue with — and it's cheap because it reuses
the extraction pipeline. Unanimous across the panel; already v1 §7.

**Procedure (pre-register all of this now, before scoring):**
1. **Freeze the pipeline:** the tier-1/2 flag definitions from v1 §3 (pledge, rpt_spike, auditor_resign,
   cfo_cs_id_exit, late_results_change), the **equal-weight additive score** (NO fitted weights — <20 cases can't
   support fitting), and the operating point (**top 5% of the scored universe**, or score ≥ 2). Pin the git commit
   hash of `build-hand-trace-scoring.mjs` (extended to score the whole universe, not just the roster) + the
   `india_bourse_announcements` snapshot date.
2. **Score the live universe:** run the frozen pipeline over all currently-active listed companies in
   `india_bourse_announcements` using only filings dated ≤ today. Read-only SELECTs + local output.
3. **Seal it:** write the ranked list to a file, **hash + timestamp it via a public git commit** (commit the hash /
   the list itself — not a public name-and-shame, to avoid defamation exposure).
4. **Pre-register the evaluation rule (decide NOW):** at **+12 months (~2027-07)**, check how many *new* IBBI/NCLT
   admissions (and, better, first-default/rating-D events) landed in the top-5% frozen list vs the base rate. BUILD
   signal = lift ≥ 3× base rate with the flags dated *before* the distress event; else the door closes for real.
5. **Caveat baked in:** with ~2yr depth this proves at best a ~12-month-lead "end-of-cycle monitor," never a 24-month
   leading indicator (v1 §9). And the moat problem stands (see below) — a positive freeze proves *signal exists*, not
   *that we have an edge over a Reg-30 feed*.

**Execution note:** scoring the universe is a real (though read-only) pipeline run — extending
`build-hand-trace-scoring.mjs`. Per the prod-execution boundary, Claude can write + run the read-only scorer and
produce the hashed list; the "commit the seal" is a deliberate act to do together. **Not yet built — offer stands.**

---

## ARM B — DEEP-HISTORY REBUILD (PARKED — resume when time)

**The insight that reopens it (fresh-eyes catch #2):** our 2-year floor is a *scraping-scope choice*, not a hard wall.
BSE/NSE corporate-announcement archives go back ~20 years; CRISIL / India Ratings / ICRA / CareEdge default & rating-
transition studies go back to the 1990s–FY15. With deep history, the retrospective test the current corpus can't
support becomes possible.

**Resume-ready spec (do these in order when picked up):**
1. **Rebuild the case roster from TRUE admission dates** — not from our filing data (which fabricates false admission
   dates for pre-floor CIRPs; that's the Day-1 root cause). Source: IBBI CIRP registry order pages, verified. Filter to
   genuinely-fresh, real-operating listed blow-ups; drop shells (RHFL, BIL Vyapar) and OC-nuisance petitions.
2. **Scrape deep filing history:** BSE "Corporate Announcements" archive + NSE + MCA, ~10–20 yr, per company. This is
   the multi-week build and it re-enters our **unsolved extraction/structuring problem** — go in with eyes open.
3. **Cascade clock (NOT admission):** anchor T0* = earliest of {first-default disclosure · rating-action-to-D · SEBI
   Reg-30 default disclosure · Section 7/9/10 petition-filing}. Admission is last resort. (Day 1 + all 6 models agree.)
4. **Within-company self-control** (Claude/MiniMax): use each case's own healthy 24–36m-pre-distress filings as the
   control — gives statistical traction with few cases and controls for firm fixed-effects.
5. **Then re-run the v1 test / kill-test** on the clean deep roster with the frozen equal-weight score, case-cohort
   weighting, and the CFDP baseline (§4). Focus signal on the **looting flags (RPT + pledge)** — the only ones that
   plausibly lead — but note pledge is listed-only.

**Why parked, not killed:** it's the principled path to a *real* answer, but it's weeks of extraction work that
re-enters the structuring swamp, and even a clean positive still faces the moat problem below. Resume only with
bandwidth + a real driver.

---

## Carry-forward reality-checks (do not lose these)
- **The "pivot to a DaaS / monitoring-alert product" is a trap for us** — collides with positioning_v2's B2B-kill and
  inherits the unsolved structuring problem. The panel recommended it near-unanimously *because it can't see our
  history.* Do not adopt reflexively.
- **The moat problem is orthogonal and unsolved:** our flags are SEBI Reg-30 24-hour mandatory disclosures — a credit
  desk sees them the same day. A real edge would require predicting the disclosures from *precursor* churn (a harder,
  different product), not re-serving the disclosure feed.
- **Re-anchoring to rating-D / default helps listed names, not the private/small-caps** where most fresh cases sit
  (they often have no rating and no clean default disclosure).

## Pointers
- Kill-test result + fresh-eyes grading: `2026-07-02_governance-kill-test-RESULT.md`
- Nulls write-up (ch. 2 = this credit-early-warning null): `ai_docs/publications/2026-06-27_governance-blowup-honest-negative-result.md`
- Reviewer transcripts: `ai_docs/gov signal prompt 1/` + `ai_docs/gov signal prompt 2/`
- Spec + run sheet (retained for the rebuild): `2026-07-02_governance-decisive-test-SPEC-v1.md`, `…-RUN-SHEET.md`
