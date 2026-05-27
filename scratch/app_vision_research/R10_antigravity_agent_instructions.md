# R10 — Antigravity Agent Instructions (OSINT + self-evolve)

**Your job:** Deep gap research for **Lijo as user #1** — make money + invest in product + **ASAP**.  
**Brief:** `scratch/app_vision_research/R10_founder_monetization_gaps_osint.md`  
**Output:** `scratch/app_vision_research/output/R10/`

---

## 0. Read FIRST

1. `scratch/app_vision_research/lijo_answers.md` — **§12 Founder priorities (LOCKED)**
2. `scratch/app_vision_research/R10_lijo_questionnaire.md` — **FILLED 2026-05-27**
3. `scratch/app_vision_research/R10_lijo_context_note.md` — Lijo never traded; ₹50k/30d; SEBI plain English
4. `scratch/app_vision_research/output/R00/R00_product_north_star_memo.md` — context only, **do not override** §12
5. `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md` §7
6. `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md` — revenue products A/B/C
7. `ai_docs/sachnetra v2/V2_roadmap.md` or `CLAUDE.md` V2 task list — map gaps to real task IDs
8. Browse **sachnetra.com** — honest current UX (do not oversell)

**Mandatory:** Primary path = **paper trading alpha signals** from SachNetra data (Lijo never live traded). Inventory signal types in DB today; gap registry must include signal definition, paper-trade log, P&L attribution, walk-forward rules. Compare vs B2B pilot as **secondary**. 30-day win = reproducible paper loop, not necessarily ₹50k.

**Mandatory:** Lijo OK with **sales calls**; **cannot** promise stable **30-day historical data** (pipeline/schema always changing). Gaps must include **export snapshot / schema versioning / pilot contract wording**. Pilot offers = forward collection + point-in-time sample only unless gap closed.

**Hard rules:**

- **Exp 11:** out of scope.
- **Legal:** flag SEBI RA / investment advice / unregistered research risks on any “trade off this signal” recommendation.
- **No illegal OSINT** — public sources only (web, LinkedIn public, job posts, pricing pages, GitHub, Reddit, Telegram public, press). No hacking, no paywalled credential stuffing.
- Every gap must say **how it blocks Lijo making money** (personal or business).
- Separate **facts** vs **hypotheses**; tag `confidence`.

---

## 1. Mission

> Find every **gap** between SachNetra today and Lijo’s goal: **use it to make money, fund the product, fastest path first.**

Success = Lijo can read `R10_executive_summary_for_lijo.md` and know **what to build this month** and **how to earn ₹ first**.

---

## 2. OSINT methodology (mandatory depth)

### Layer 1 — Internal (codebase + docs)

| Source | Hunt for |
|---|---|
| V2 tasks | Shipped vs partial vs filed |
| `india_news_signals` | What columns exist; exportable? |
| G1 / V2-031b | Precision blockers for *Lijo’s* tickers |
| V2-017, V2-018 | Flows/filings in UI vs DB only |
| Site | What Lijo sees at 9:00 |

### Layer 2 — Market (who pays, how fast)

| Source | Hunt for |
|---|---|
| Pricing pages | Heckyl, Tijori, NSE data vendors, Koyfin India |
| Job posts | “alt data”, “India sentiment”, “NSE filings API” |
| Inc42 / Entrackr | Indian data startup funding + product |
| LinkedIn (public) | “sold dataset”, “data API India markets” |
| GitHub | India market data repos with stars/issues |
| Reddit / Twitter | “paid for X data India” |

### Layer 3 — Founder-operator (personal)

Use questionnaire answers to simulate **one week in Lijo’s trading/investing life**. Every gap = a moment he **opens Moneycontrol instead of SachNetra** or **loses money**.

---

## 3. Self-evolve loop (minimum 3 iterations)

Maintain `R10_osint_iteration_log.md`:

```markdown
## Iteration N (date)
**Hypothesis:** ...
**Searches run:** (queries)
**Findings:** (bullets + URLs)
**Gaps opened/closed:** gap_id list
**Next hypothesis:** ...
```

**Iteration 1:** Start from questionnaire + internal audit → draft gap registry v0.  
**Iteration 2:** OSINT on “fastest ₹” — who bought similar data in India; refine P0 gaps.  
**Iteration 3:** Stress-test P0 — “if Lijo only has 20 hrs/month, what 3 builds matter?”; final 90-day stack.

After each iteration, **update** `R10_gap_registry.csv` (version in log, don’t delete rows — mark `status: open|closed|deferred`).

---

## 4. Prioritization rules (P0 = ASAP)

Tag **P0** only if ALL true:

1. Unblocks **Lijo personally** making or saving money within **≤90 days**, OR  
2. Enables **first paying customer** with **≤4 weeks** outreach using **existing DB**, AND  
3. Build effort **≤ medium** (no terminal, no mobile app rewrite unless Lijo said yes in questionnaire).

Tag **P3** = R00-style long-term (Hindi full UI, Neudata license, etc.) unless Lijo questionnaire says otherwise.

---

## 5. Deliverables (all required)

| File | Purpose |
|---|---|
| `R10_lijo_workflow_map.md` | Part A |
| `R10_gap_registry.csv` | Part B — ≥25 rows |
| `R10_fastest_revenue_paths.md` | Part C |
| `R10_osint_buyers_and_sellers.csv` | Part D — ≥15 rows |
| `R10_osint_iteration_log.md` | §3 — ≥3 iterations |
| `R10_investment_roi_scenarios.md` | Part E |
| `R10_90_day_stack.md` | Part F |
| `R10_executive_summary_for_lijo.md` | 1 page: top 5 gaps, top money path, week 1–2 actions |

Update `research_log.md`, `_index.md`, tick R10 brief checklist.

**Do not** edit `app_vision_2026.md` — Claude merges after Lijo reviews.

---

## 6. Suggested search seeds (evolve these)

```
India alternative data startup pricing API 2025 2026
Heckyl Tijori FactSet India news sentiment API cost
solo quant sell historical news dataset India
NSE corporate filing alert API startup India
retail trader monetize stock screener newsletter India
SEBI registered research analyst sell subscription India rules
India fintech data licensing deal press release
site:linkedin.com India market data API founder
site:reddit.com paid for Indian stock news data API
Zerodha trader workflow morning routine India 9 AM
how prop shops buy news sentiment data India
Gumroad Indian stock market dataset
```

Add Hindi queries if Lijo trades on vernacular sources.

---

## 7. Quality gate

- [ ] ≥25 gaps; ≥5 P0; each P0 links to `blocks_lijo_money_how`
- [ ] ≥3 OSINT iterations logged with new hypotheses each time
- [ ] Fastest revenue path picks **90-day primary** (not “build for 3 years”)
- [ ] V2 task IDs cited where gaps map to existing work
- [ ] SEBI/regulatory callouts on tips/advice/affiliate paths
- [ ] Executive summary readable in 5 min plain English
- [ ] Questionnaire gaps marked `unknown` — list **questions for Lijo** at end of executive summary

---

## 8. End message to Lijo

5 bullets + **numbered questions** still unanswered from questionnaire.
