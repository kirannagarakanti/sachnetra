# Task G1 — Alias-FORM normalization (news→ticker recall hardening)

*SachNetra quant data layer — recall fix on the V2-031 tagger. Distinct from V2-031b (which fixed PRECISION). This fixes the alias-FORM recall gap. Unblocks Pillar A (mid/small-cap news-latency edge).*

**Lane**: James (build + matcher edit) · Lijo (prod verify). **Claude authored this spec READ-ONLY — it does NOT edit `build-equity-master.mjs` or `_india-market-keywords.mjs`.**
**Depends on**: V2-031 ✅ (deployed 2026-05-26), V2-031b ✅ (precision hardening). Class: **V2-031c (recall)** — a sibling of, not the same as, the deferred body-text/NER V2-031c.
**Estimated**: 3–4 h engineering + 24h Lijo prod observation.

---

## Why this task exists (diagnosis — already done, read-only)

Source: `ai_docs/learning/research-notes/2026-06-04_g1-tagging-gap-diagnosis.md` (verified against live files 2026-06-05).

- The **master is essentially COMPLETE** — `shared/nse-equity-master.json` ≈ 2,386 tickers ≈ the full active NSE universe. **Stop expanding the master.** "Missing microcaps" is no longer the dominant gap.
- The dominant remaining company-news recall gap is **alias-FORM mismatch**, proven by a concrete case:
  - Headline: "**AB Cotspin** India consolidated net profit declines 7.11%" → **untagged**.
  - Master HAS it: ticker `ABCOTS`, aliases include "**A B Cotspin**" (spaced).
  - The matcher uses word-boundary regex `\bA B Cotspin\b` (case-insensitive) → **fails on the spacing difference** ("AB" vs "A B"). The name is present; the *form* doesn't match.
- Confirmed current normalization state (2026-06-05):
  - **Build** `scripts/build-equity-master.mjs` → `normalizeAlias(s)` (line 121) does only `s.trim().replace(/\s+/g,' ')` — whitespace collapse, case preserved.
  - **Match** `scripts/_india-market-keywords.mjs` → builds `\b<alias.toLowerCase()>\b` regexes, tests them against `normalizeQuotes(title)` (curly→straight quotes only).
  - **Neither side** handles: spaced↔unspaced initials, `&`↔"and", HTML entities (`S&#038;P`), or `Ltd`↔`Limited`.

**"Solved" =** the matcher tags `ABCOTS` on "AB Cotspin …" (and the equivalent form-variant classes below) **without** introducing new false positives, measured by **recall-among-market-moving** (NOT headline coverage — the systemic/macro floor is irreducible).

### The form-mismatch classes to close (all deterministic)

| Class | Headline form | Master form | Example |
|---|---|---|---|
| Spaced/unspaced initials | `AB Cotspin` | `A B Cotspin` | ABCOTS (proven) |
| Ampersand vs "and" | `L and T`, `S and P` | `L&T`, `S&P` | LT, … |
| HTML entity | `S&#038;P`, `M&#38;M` | `S&P`, `M&M` | headline-only artifact |
| Corp suffix | `Acme Ltd` | `Acme Limited` | partly handled by cascade |
| Punctuation | `Foo-Bar`, `(S.A)` | `Foo Bar`, `S A` | stray dots/hyphens/parens |

Residual genuine-coverage gap (SME-platform / BSE-only / very-recent-IPO names not on the NSE main-board active list — Wires & Fabriks, Helpage Finlease, etc.) is **out of scope / Park**: those are low-liquidity and would fail Exp16's liquidity filter anyway.

---

## What this task does

Add **one deterministic `normalizeForm()`** and apply it **symmetrically** — build-time (alias variants) + match-time (title + HTML-entity decode). No LLM, no fuzzy match, no hot-path NER. Keep the word-boundary matcher; widen what it can see.

Two interlocking changes (do BOTH — symmetry is the point):

### Change A — Build-time: generate deterministic alias variants
In `scripts/build-equity-master.mjs`, add `aliasFormVariants(alias)`. For each generated alias, emit:
- **Initial-spacing both ways:** collapse runs of single-letter+space ("A B " → "AB "), AND the spaced form of leading unspaced initials ("AB Cotspin" → "A B Cotspin"). Bounded to leading initial-runs only.
- **`&` ↔ "and":** "L&T" → "L and T" (and the reverse for aliases written with "and").
- **`Ltd` ↔ `Limited`** fold (extend the existing `STRIP_SUFFIXES` cascade rather than duplicating it).
- Keep storing via `normalizeAlias` (whitespace/case) as today — the variants are *additional* keys, not a replacement.

**Apply it in TWO passes — this is mandatory, not optional (verified against `main()` 2026-06-05):**

The build assembles aliases from sources that straddle the collision filter, so a single pre-filter pass is **insufficient** — it would miss the abbreviation/overlay forms, including this task's own `L and T → L&T` target. Current `main()` order:

```
1. buildPerTickerAliases        cascade aliases (from company NAME)
2. overlayProposal
3. applyHardeningActions
4. applyCollisionFilter         ← Pass 1 variants must exist BY HERE
5. applyIntentionalMultiTag     ← injects "L&T"→LT, "SBI", "HDFC" … POST-filter
6. applyPositiveOverlays        ← injects hand-added forms POST-filter
7. attachDenylist
```

- **Pass 1 (pre-filter):** generate variants for the **cascade aliases** inside/right after `buildPerTickerAliases` (step 1–3), so they enter `entry.aliases` **before** step 4. These inherit the Decision 6(a) collision filter automatically — the FP guard the spacing class (ABCOTS) needs.
- **Pass 2 (post-overlay):** after `applyPositiveOverlays` (step 6), run `aliasFormVariants` again over the aliases injected at steps 5–6 (`INTENTIONAL_MULTI_TAG` + positive overlays). These are **deliberately collision-exempt** (that's why the existing code attaches them post-filter), so their variants must be too — do **not** re-run the full collision filter over them; reuse only the min-length / leading-initials / cap guards from §FP-guards. This pass is what makes `L&T → "L and T"` and overlay `&`/initial forms actually generate.

> **Why both:** verified on live data — `LT` currently holds `["L&T","LT","Larsen & Toubro","Larsen & Toubro Limited","Larsen and Toubro"]`. `"L&T"` is injected at step 5 (post-filter) and has **no** `"L and T"` form; `"Larsen and Toubro"` exists only because it was hand-added in the overlay. A pre-filter-only pass leaves both abbreviation gaps open. Surface quantified: **28** leading spaced-initial aliases (cascade side, Pass 1) + **293** `&`-bearing aliases (mixed; the abbreviation subset needs Pass 2).

### Change B — Match-time: normalize the title symmetrically (minimal)
In `scripts/_india-market-keywords.mjs`, extend the existing title preprocessing (the `normalizeQuotes` step) into a `normalizeTitle()` that ALSO:
- **Decodes HTML entities** relevant to names: `&amp;`/`&#38;`/`&#038;` → `&` (then the `&`→"and" build variants match), plus the numeric-entity general case. *(Entities appear in headlines, not the master — so this is match-side only.)*
- Leaves word-boundary matching otherwise intact. **No alias-map load change in the hot path.**

> Architecture note (why build-side variants, not title-side collapse): the matcher matches alias regex against the *raw* title, so collapsing initial-spaces inside the title would break word boundaries. Generating the variant aliases at build time keeps the 10-min cron hot path a simple word-boundary scan — consistent with V2-031b's "harden at the build" decision. HTML-entity decode is the one match-side normalization because the artifact only exists in headlines.
>
> Word-boundary check (verified): a generated `&`-form alias matches fine — `\bS&P\b` works because `&` is not a regex metachar (not in the L43 escape set) and `\b` sits at the S…P boundaries. The first-word-preemptive collision arm keys off `entry.name`, not aliases, so a generated alias like `AB Cotspin` cannot introduce a new first-word collision — only the multi-ticker-claim arm guards variants, which is the intended FP guard.

### Explicit non-goals
- No master expansion (it's complete). No SME/BSE-only ticker additions.
- No fuzzy / token-set matching on the hot path (Park — offline second pass only, never primary; V2-031 Decision 2 stands).

> **External validation (git-repos research):** the deterministic-alias-fix-over-LLM-NER choice is independently confirmed by `ai_docs/learning/git-repos/harshbokadia-financial-sentiment-intelligence.md` ("do not swap tagger for Groq"; recall fix is "via **alias**", Replace-dict-tagger-with-Groq-NER = **Kill**) and `ai_docs/learning/git-repos/llmquant-quant-mind.md` (LLM ticker tagger/NER = **Kill**, too slow/costly for the 10-min cron). Both reach G1's exact design: dict + word-boundary regex stays primary; recall is fixed by deterministic alias-form widening, not NER.
- No change to `seed-india-signals.mjs`, no DDL, output stays **bare NSE symbols** (V2-031 Decision 4 / D7).

---

## False-positive guards (mandatory — widening recall is the FP risk)
1. **Run every generated variant through the existing Decision 6(a) collision filter** (bare forms shared by 2+ tickers are dropped) and keep per-entry `denylist_context`. New variants must not bypass these.
2. **Min-length guard:** do not generate spacing variants for very short aliases (≤ 3–4 chars) — reuse the V2-031b short-ticker discipline (`scratch/v2-031b_short_tickers.csv`) to avoid "AB"/"S A"-type collisions.
3. **Leading-initials only** for the spacing rule (don't collapse spaces mid-name across normal words).
4. **Variant-count cap** per ticker; log generated/dropped counts at build time (mirror the V2-031b build logging + phantom guard).

---

## Files to open before starting
| File | Why |
|---|---|
| `scripts/build-equity-master.mjs` | Primary surface — `normalizeAlias` (L121), `generateCascadeAliases` (L125), collision filter, `INTENTIONAL_MULTI_TAG` |
| `scripts/_india-market-keywords.mjs` | Match-side `normalizeQuotes` (L57) → extend to `normalizeTitle` + HTML-entity decode |
| `shared/nse-equity-master.json` | Current alias map (review the variant diff) |
| `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md` | Reuse build-logging, collision filter, smoke-test pattern |
| `scratch/v2-031b_regression_checklist.csv` | Extend with alias-form rows (do not regress precision) |
| `ai_docs/learning/research-notes/2026-06-04_g1-tagging-gap-diagnosis.md` | Full diagnosis + candidates table |

---

## Phases
**Phase 1 — Build (`build-equity-master.mjs`)**
- [ ] Add `normalizeForm()` + `aliasFormVariants(alias)` (spacing both-ways, `&`↔and, Ltd↔Limited)
- [ ] **Pass 1 (pre-filter):** feed cascade-alias variants into the alias set BEFORE `applyCollisionFilter` (step 4); apply min-length + leading-initials + cap guards
- [ ] **Pass 2 (post-overlay):** after `applyPositiveOverlays` (step 6), run `aliasFormVariants` over the `INTENTIONAL_MULTI_TAG` + overlay aliases; reuse the §FP-guards but do NOT re-run the full collision filter (these are deliberately collision-exempt)
- [ ] Log variants generated / dropped-by-collision / dropped-by-min-length (per pass)
- [ ] Rebuild `shared/nse-equity-master.json` (+ `.collisions.log`); verify ABCOTS now carries an "AB Cotspin" form **and** LT carries an "L and T" form

**Phase 2 — Match (`_india-market-keywords.mjs`)**
- [ ] Extend `normalizeQuotes`→`normalizeTitle` with HTML-entity decode (`&amp;`/`&#38;`/`&#038;`→`&`, numeric-entity general case)
- [ ] Confirm no other hot-path change; `extractCompanies` still returns `[{name, ticker}]` bare symbols

**Phase 3 — Local regression smoke (extend, do not replace)**
- [ ] Add alias-form rows to the checklist: `AB Cotspin` → ABCOTS; an `L&T`/`L and T` pair; an `S&#038;P`/`S&P` entity case; one `Ltd`/`Limited` case
- [ ] Re-run `scripts/smoke-test-tagger-v2-031b.mjs` (or a new `smoke-test-tagger-g1-form.mjs`) — **precision must not regress** (still ≥27/30 on the V2-031b rows) AND the new form rows must tag
- [ ] `npm run typecheck` + `npm run lint` + existing `scripts/smoke-test-tagger.mjs`

**Phase 4 — Lijo prod verify (NOT agent; 24h window)**
- [ ] Deploy; wait 24h; run `node scripts/research/exp11-coverage-check.mjs` + `exp11-coverage-slice.mjs`
- [ ] Eyeball precision on the §11.3 sample (target ≥90% held) and recall-among-market-moving improvement
- [ ] Re-run a read-only untagged-market-moving probe to quantify residual form-mismatch share (open question #1 in the diagnosis)

---

## Acceptance gates
| # | Gate | Threshold | Measured by |
|---|---|---|---|
| G1a | AB-Cotspin class tags | the proven case + new form rows pass | local smoke |
| G1a2 | Post-filter forms tag (Pass 2) | `L and T`→LT tags (the multi-tag/overlay class, not just cascade) | local smoke |
| G1b | Precision not regressed | ≥27/30 V2-031b rows still pass; 0 new seed FPs | local smoke |
| G1c | Build phantom/collision guard | 0 phantom tickers; collisions still dropped (`reliance`,`tata`,…) | build log |
| G1d | Post-deploy precision | ≥90% held | Lijo eyeball |
| G1e | Recall-among-market-moving | measurable rise vs pre-deploy (NOT headline %) | `exp11-coverage-check` |

---

## Boundary & sacred files
- **Sacred files: none.** Does not touch `src/config/variants/*`, `scripts/seed-insights.mjs`.
- Prod boundary `memory/feedback_v2_prod_execution`: agent writes code + local smoke; **Lijo runs deploy + prod verification.**
- **Claude's role here was read-only diagnosis + this spec.** The matcher/build edits are James's.

## Completion log
| Date | Who | What |
|---|---|---|
| 2026-06-05 | Claude | Spec authored READ-ONLY from the G1 diagnosis + live confirmation that the matcher does only quote-normalization. No code edited. |
| 2026-06-05 | Claude | Sanity-checked spec vs live `build-equity-master.mjs` / `_india-market-keywords.mjs` + master JSON. Line refs accurate, ABCOTS case + all test artifacts confirmed. **Patched Change A to a two-pass model** (pre-filter cascade + post-overlay multi-tag/overlay) — single pre-filter pass would have missed the abbreviation/overlay class incl. this task's own `L and T → L&T` target. Added G1a2 gate. READ-ONLY on matcher code. |
| 2026-06-05 | Claude | **Phases 1–3 IMPLEMENTED (James away → Claude writes code + local self-checks; Lijo deploys).** Phase 1: `aliasFormVariants()` + `collapseLeadingInitials`/`expandLeadingInitials` + two-pass wiring in `build-equity-master.mjs`; rebuilt `nse-equity-master.json` = **+3,403 aliases, 0 removals** (purely additive — no recall regression), 3,402/3,406 variants survived collision filter, all 9 ambiguous groups still guarded. Phase 2: `decodeHtmlEntities()` + `normalizeTitle()` in `_india-market-keywords.mjs` (named + numeric entities; match-side only). Phase 3: new `scripts/smoke-test-tagger-g1-form.mjs` (9/9). **Gates met:** G1a ✅ (ABCOTS tags), G1a2 ✅ (`L and T`→LT), G1b ✅ (v2-031b **30/30**, general **15/15** — precision held), G1c ✅ (0 phantoms; collisions intact). typecheck 0, biome clean on all 3 files. **Remaining: G1d/G1e = Lijo deploy + 24h `exp11-coverage-check`.** Changed files: `build-equity-master.mjs`, `shared/nse-equity-master.json`(+`.collisions.log`), `_india-market-keywords.mjs`, `smoke-test-tagger-g1-form.mjs`. |
