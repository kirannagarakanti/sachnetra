# G1 — Gemini Tag-Validation Plan (precision/recall at scale)

**Date:** 2026-05-29
**Owner lane:** G1 (news→ticker tagging) only.
**Purpose:** Replace the 30-row human eyeball (G4 precision gate) with an independent
Gemini labeler over a real week of `india_news_signals`, producing measured
precision + recall and a per-ticker false-positive cluster report.

**Boundary (`feedback_external_agent_recon` + `feedback_v2_prod_execution`):**
Claude builds the read-only export + the diff/scoring harness and synthesizes results.
Lijo/James run Gemini and any prod-touching command. Claude does NOT call the Gemini API.

---

## Why

- Current G4 = human eyeballs ~30 rows of `coverage_check.md` §11.3 → not reproducible, doesn't scale.
- A week of headlines (~20k rows) labeled blind by Gemini gives:
  - **Precision** (our tags Gemini agrees with) — the real G4 number.
  - **Recall / coverage** (companies Gemini found that we tagged) — the real G5 number.
  - **FP cluster report** — residual junk tickers (NH, DOLLAR, RETAIL…) surfaced precisely for V2-031c.
- Reusable: re-run after every master rebuild.

---

## Stage 1 — Export (Claude builds; read-only)

`scripts/research/g1-export-for-gemini.mjs` (NEW, read-only — SELECT only, no DDL/writes):

- Pull last 7 days of `india_news_signals`: `id`, `published_at`, `headline`, `nse_tickers`.
- Write TWO files to `scratch/g1_gemini_validation/`:
  - `headlines_blind.csv` — `id,headline` ONLY (no tags → Gemini labels blind).
  - `our_tags.csv` — `id,nse_tickers` (held back for Stage 3 join; Gemini never sees it).
- Sample guidance: full 7d if ≤ a few k rows; otherwise stratified sample (all tagged rows
  + random untagged sample) so recall is measurable, not just precision.

## Stage 2 — Gemini labels (Lijo/James run; output to scratch/)

Feed `headlines_blind.csv` to Gemini with this contract. Output `gemini_labels.csv`:

| column | meaning |
|---|---|
| `id` | row id (carried through) |
| `gemini_tickers` | NSE symbols the headline is genuinely about (`;`-separated, `[]` if none). Use the NSE equity master as the allowed symbol set if provided. |
| `category` | one of: `company-news`, `markets-macro`, `cricket-ipl`, `politics`, `weather-disaster`, `sports-other`, `entertainment`, `other` |
| `confidence` | high / med / low |

Prompt rules for Gemini:
- Tag a company ONLY if the headline is about the listed entity, not a same-spelled common word
  (e.g. "IPL 2026" cricket ≠ India Pesticides; "Mamata Banerjee" ≠ Mamata Machinery).
- `category` is mandatory even when `gemini_tickers=[]` — it's how systemic FPs are caught.
- Prefer the bare NSE symbol; no `.NS` suffix.

## Stage 3 — Diff & score (Claude builds)

`scripts/research/g1-gemini-diff.mjs` (NEW): join `our_tags.csv` ⨝ `gemini_labels.csv` on `id`.

Emits `scratch/g1_gemini_validation/g1_validation_report.md`:

- **Precision** = |our_tags ∩ gemini_tickers| / |our_tags|  → G4
- **Recall** = |our_tags ∩ gemini_tickers| / |gemini_tickers| → G5/coverage
- **FP table**: every ticker we emitted that Gemini rejected, grouped + counted, with the
  dominant `category` of the FP (e.g. `IPL → 96 rows, category=cricket-ipl`).
- **FN table**: companies Gemini found that we missed → recall fixes (positive overlays).
- Normalize `.NS` → bare before comparison (legacy rows are pre-G2; D7).

## Stage 4 — Act

- Each confirmed FP ticker → `drop_bare_symbol_alias`/`drop_alias` in `v2-031b_negative_keywords.json`
  → rebuild → re-smoke (Step A). No runtime stoplist unless build-time can't fix.
- Each confirmed FN → `positive_aliases.json` / `INTENTIONAL_MULTI_TAG`.
- Feeds the G3–G6 gate table; precision number is defensible for unblocking Exp 11.

---

## Guardrails

- Read-only on prod (Stage 1 SELECTs only). Run `check-db-space.mjs` is NOT needed (no writes).
- No edits to `seed-india-signals.mjs`, `src/`, sacred variants.
- Gemini gets headlines only (no PII, no tags) — blind labeling preserves independence.
- This validates; it does not change prod. Master changes still go through `build-equity-master.mjs` + smoke.

## Open questions for Lijo

1. Window: 7d as written, or longer (30d) for a bigger FP sample?
2. Should Gemini receive the 2,386-symbol NSE master as its allowed set, or label free-form
   then we map? (Allowed-set is cleaner but biases toward our universe.)
3. Run the read-only `exp11-coverage-check.mjs` now to pin deploy status before exporting?
