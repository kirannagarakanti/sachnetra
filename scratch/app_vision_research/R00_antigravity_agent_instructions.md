# R00 — Antigravity Agent Instructions (copy-paste to agent)

**Your job:** Synthesis only — **no new web scraping unless filling a specific gap.** Pull from R03–R09 deliverables first.  
**Brief file:** `scratch/app_vision_research/R00_sachnetra_product_north_star.md`  
**Output folder:** `scratch/app_vision_research/output/R00/` (create if missing)  
**Date baseline:** May 2026

---

## 0. Read these files FIRST (in order)

1. `scratch/app_vision_research/_quality_standards.md`
2. `scratch/app_vision_research/lijo_answers.md` — **§11** (not a terminal); primary user was **undecided** — R00 **recommends**, Lijo confirms
3. `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md` — **full §2–§5.4** (merged synthesis — your main source)
4. `scratch/app_vision_research/output/R03/R03_india_market_snapshot_2026-05.md`
5. `scratch/app_vision_research/output/R04/R04_product_implications.md`
6. `scratch/app_vision_research/output/R06/R06_sachnetra_relevance.md`
7. `scratch/app_vision_research/output/R07/R07_product_implications.md` (if present; else `R07_whitespace` / episode memo in `output/R07/`)
8. `scratch/app_vision_research/output/R08/R08_positioning_memo.md`
9. `scratch/app_vision_research/output/R09/R09_whitespace_memo.md`
10. `scratch/app_vision_research/output/R09/R09_positioning_vs_r08.md`
11. `scratch/app_vision_research/output/R09/R09_feature_matrix.csv` + `R09_feature_matrix_notes.md`
12. `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md` — align or challenge B2B arc
13. `scratch/app_vision_research/R00_sachnetra_product_north_star.md` — task spec

**Hard rules:**

- **Exp 11:** out of scope.
- **Do not contradict R03 facts** (FII/DII MTD, sector YTD, STT Apr 2026).
- **Do not invent a 9:00 IST wedge** Lijo has not confirmed — list as **options with evidence**, not committed roadmap.
- **Separate:** evidence (R03–R09) vs **recommendation** vs **open questions for Lijo**.
- No tips channel, GMP core product, or terminal positioning.

---

## 1. What you are answering

> **After R03–R09, what should SachNetra become for the next 12 months — who is it for, what is it not, and what should we build first?**

This is the **capstone brief**. You are **not** re-running competitor web research — you are **deciding** from existing evidence.

---

## 2. Part A — Persona matrix (PRIMARY table)

**Deliverable:** `R00_persona_matrix.csv`

**Columns:** `persona, job_to_be_done, current_tools, pain_vs_incumbents, sachnetra_fit_1_to_5, willingness_to_pay, trust_bar, evidence_briefs, recommend_tier`

**Minimum personas (all rows required):**

| Persona | Map from |
|---|---|
| Salariat / SIP-only retail | R04, R08, R09 (Groww, Finshots) |
| Active swing trader (ex-F&O) | R04, R08, R09 |
| Intraday F&O speculator | R08 deprioritize; R09 Sensibull/Opstra |
| Serious fundamental investor | R08 primary; R09 MC/ET pain |
| Quant / systematic / B2B buyer | R08 §4, R09 vendor landscape |
| Sell-side / terminal user | R08, R09 tier D — **non-target** |
| Journalist / policy reader | R06, R04 macro themes |

**recommend_tier:** `primary` | `secondary` | `deprioritize` | `non-target` — **one primary only**.

---

## 3. Part B — Product archetype map

**Deliverable:** `R00_archetype_map.md`

For each archetype, 1 paragraph: who uses it, winner in India, SachNetra relationship (`win` | `partial` | `avoid`):

- News aggregator
- Market terminal lite
- Broker app (execution + bundled news)
- Alt-data / sentiment B2B
- Research PDF / WhatsApp informal

Answer explicitly: **Where does SachNetra win without becoming a broker?** Cite R09 broker-bundle risk.

---

## 4. Part C — Feature tension matrix

**Deliverable:** `R00_tension_matrix.csv`

**Minimum 8 tension rows** from brief Part C, each with:

`tension, pole_a, pole_b, retail_prefers, pro_prefers, sachnetra_choice, evidence`

Examples to include: speed vs depth, free vs paid, Hindi vs English UI, retail simplicity vs pro density, collector vs consumer polish, B2C vs B2B focus.

---

## 5. Part D — "See India clearly" promises

**Deliverable:** `R00_measurable_promises.md`

For each promise below: `promise, user_quote_or_paraphrase, external_product_that_tried, user_rating, sachnetra_status_today, build_priority`

| # | Promise |
|---|---|
| 1 | Understand *why* Nifty moved without narrative spin |
| 2 | Less duplicate syndicated headlines |
| 3 | Correct ticker on headline (G1 precision) |
| 4 | Filing visible near news (lead time) |
| 5 | Macro + flows in one pane (FII/DII, oil, USDINR) |

Use R04/R09 for external examples (MC, ET, Trendlyne). **≥3 promises** must cite a brief path.

---

## 6. Part E — North star memo (PRIMARY narrative)

**Deliverable:** `R00_product_north_star_memo.md`

Required sections:

### 1. One-paragraph north star (May 2026 → 12 months)

Plain English. What SachNetra **is** and **is not**. No marketing fluff.

### 2. Primary + secondary persona (one sentence each)

Must align with R08+R09 unless you document **conflict** with evidence.

### 3. Non-goals (2026)

Minimum 5 bullets — include: not broker, not terminal, not tips/GMP, not F&O-first product.

### 4. Three-year arc

`collector → validated signals → B2B API` — align or challenge `sachnetra_quant_pivot.md` in 1 table.

### 5. Top 5 features (evidence-ranked)

Rank by **R03–R09**, not aspiration. Format: `feature | why | brief | shipped? (Y/partial/no)`

Suggested candidates to evaluate: G1 precision, FII/DII tile, filing links, story threads, macro tiles, outage monitor (optional), Hindi explainers, B2B event API.

### 6. Top 5 risks

Include: G1 false positives, broker bundling, distribution/SEO, regulatory (advice), precision vs speed myth.

### 7. Open questions for Lijo (bullet list)

Minimum 5 — things only Lijo can decide (monetization, Hindi UI vs explainers, outage tracker yes/no, confirm primary persona).

### 8. 9:00 IST wedge — options not commitment

Table: `option | evidence | incumbent gap | effort | recommend? (Y/N/maybe)`

### 9. What we will **not** do in 2026

Short list tied to R09 do-not-build.

---

## 7. Part F — Decision packet for Lijo

**Deliverable:** `R00_lijo_decision_packet.md`

Single page Lijo can read in 5 minutes:

- [ ] Checkbox: Confirm primary persona (fill recommended answer)
- [ ] Checkbox: Confirm secondary persona
- [ ] Checkbox: Accept non-goals list
- [ ] Checkbox: Top 3 features for next quarter
- [ ] Checkbox: Monetization path (consumer / B2B / both / undecided)
- [ ] Checkbox: Hindi — full UI vs explainers-only first

Each checkbox has **one line of evidence** from R03–R09.

---

## 8. Deliverables checklist (all required)

Save under `scratch/app_vision_research/output/R00/`:

- [ ] `R00_persona_matrix.csv`
- [ ] `R00_archetype_map.md`
- [ ] `R00_tension_matrix.csv`
- [ ] `R00_measurable_promises.md`
- [ ] `R00_product_north_star_memo.md`
- [ ] `R00_lijo_decision_packet.md`

Then update:

- [ ] `scratch/app_vision_research/R00_sachnetra_product_north_star.md` — tick §Status checklist
- [ ] `scratch/app_vision_research/research_log.md` — one-line verdict
- [ ] `scratch/app_vision_research/_index.md` — mark R00 `[x]`; note wiki merge pending Claude

**Do not** edit `app_vision_2026.md` — Claude merges §1 + §6 + final north star after review.

---

## 9. Quality gate before you finish

- [ ] **Primary persona = exactly one** (not "everyone")
- [ ] Recommendations **cite** R03–R09 paths (no orphan opinions)
- [ ] R08+R09 persona rec addressed explicitly (agree / adjust / conflict)
- [ ] Non-goals include terminal + tips + F&O-core
- [ ] No Exp 11; no committed monetization without "Lijo decides" label
- [ ] Plain English in north star paragraph (12-year-old readable)
- [ ] Open questions list is **actionable** for Lijo

---

## 10. One-paragraph summary for Lijo (end of walkthrough)

5 bullets:

1. Recommended **north star** sentence  
2. **Primary + secondary** persona  
3. **Top 3 build** priorities for next 12 months  
4. **Top 3 do-not-build**  
5. **Biggest open decision** only Lijo can make
