# Lijo — Application Vision Research (Answer Sheet)

*Filled 2026-05-27 from Lijo's answers. Antigravity + Claude read this before running/synthesising briefs.*

---

## 1. Product north star (one paragraph)

What should a user feel in the first 30 seconds on SachNetra?

> **Founder-first (2026-05-27):** Lijo is **user #1**. The app must help **Lijo make money** (markets and/or SachNetra revenue) and justify **investment in the product**, **as fast as possible**. External personas (R00) inform distribution later — not before founder workflow works.

**Current identity (locked):** News aggregator + background data collection (`sachnetra_quant_pivot.md`). **R10** maps gaps between today and founder money goals.

---

## 2. Primary user (pick one, secondary optional)

- [ ] SIP / passive investor
- [ ] Active swing trader
- [ ] Intraday / F&O retail
- [ ] Serious fundamental investor
- [ ] Quant / data buyer (B2B)
- [ ] Journalist / policy reader
- [ ] Undecided — generic market
- [x] **Founder-operator (Lijo)** — **user #1**; product must work for Lijo’s own investing + business first

**External personas (R00 — for later GTM, not blocking founder):**

| Tier | Persona |
|---|---|
| Evidence-based | Serious fundamental investor + swing secondary |
| B2B | Quant / data buyer when API is sellable |

Questionnaire for gap hunt: [`R10_lijo_questionnaire.md`](./R10_lijo_questionnaire.md)

---

## 3. "War" / shock timeline for R07

- [x] **All major shocks since 2020** (broad)
- [x] **Must include:** COVID (Mar 2020), demonetization (reference if pre-2020 context needed), Adani–Hindenburg (Jan 2023)
- [ ] Single-war narrow scope — not chosen

**R07 is UNBLOCKED.** See updated `R07_geopolitics_war_india_markets.md` for mandatory episode list.

---

## 4. Language priority

- [x] **Research:** Hindi + Hinglish + English **equal weight** on Reddit/Telegram/social (Gemini can process all three)
- [x] **Product/UI:** English-first until V2-007 ships

*Claude note:* Tag every social citation with `lang: en | hi | hinglish`. Do not drop Hindi/Hinglish threads as "noise" — they often lead English coverage on India retail mood.

---

## 5. Monetization horizon (2026)

- [ ] Undecided
- [ ] Consumer subscription soon
- [ ] B2B data feed is the real business now
- [x] **Priority: make money ASAP** — personal trading edge **and/or** SachNetra revenue **and/or** ROI on capital invested in the app (paths ranked in **R10**)

R00 “undecided monetization” superseded for execution priority by §12 — still pick one primary path after R10.

---

## 6. What SachNetra must NOT become

> Not fully specified. Default guardrails from project rules: **not a broker, not a tip/signal channel, not a pump-and-dump funnel.** Research should flag if market voices push toward those models.

**Also (from R08, plain English):** Do **not** try to be Bloomberg / Cogencis — see §11.

---

## 7. Research priority — what "top 3 briefs" means

**Meaning:** If Antigravity time is limited, **which 3 brief `.md` files to run first** (not related to Exp 11).

**Lijo did not rank — Claude default for current posture (aggregator + unsure direction + community talk):**

| Order | Brief | Why |
|---|---|---|
| 1 | **R03** | Facts baseline — what India markets look like *today* |
| 2 | **R06** | Telegram general talk — themes, useful vs noise for us |
| 3 | **R07** | Shock chronology since 2020 — how narrative and prices moved |

**Run next (week 2):** R04 (Reddit), R08 (pro vs retail), R09 (competitors).  
**Defer until product sharpens:** R01 (OSS), R05 (quant firms), R00 (north star — needs R03–R09 inputs).

Override order anytime in `research_log.md`.

---

## 8. Antigravity setup

- Model / agent name: *(Lijo fills if needed)*
- Output: per-brief folders under `scratch/app_vision_research/output/` → Claude merges to **single wiki**
- Sources: **public Telegram + Reddit only** — no paid groups
- Telegram scope: **general discourse** — what are people talking about; is any of it **actionable for SachNetra** (topics, entities, timing), not channel promotion
- Banned: *(none specified)*

---

## 9. Tie to Exp 11

- [x] **Fully separate** — this research has **nothing to do with Exp 11**. Do not change experiment design, gates, or universe from app-vision briefs.

---

## 10. Final synthesis target

- [x] Single wiki doc: `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md`
- Claude writes synthesis **after** Antigravity deliverables land in `scratch/.../output/`
- Stub exists until research is done — do not invent conclusions in the wiki early

---

## 11. "Do not compete with Bloomberg / Cogencis" (plain English)

*Added 2026-05-27 after R08 — so research docs don't sound like jargon.*

### What is a "terminal"?

**Bloomberg** and **Cogencis** are like a **super-expensive control room** for people whose **full-time job** is money:

- They sit at a desk all day.
- Their **company** pays **lakhs per year** (sometimes per month) for the software.
- They need **everything instantly**: every price tick, every news wire, every chart, every company number — often before normal people see it.
- They use it to move **huge amounts** of money and write reports for big funds and banks.

### What "do not compete" means

It does **not** mean "ignore professionals" or "those users are enemies."

It means: **do not try to be their main tool.**

Do **not** build SachNetra as:

- "We replace Bloomberg"
- "We're a cheaper terminal"
- "We have every tick, every screen, every pro chart"

**Why:** They already have the best and will keep paying. Matching that costs enormous data fees, speed, and years of features. That is a **different game** (desk traders, 8 hours/day, completeness + latency).

### Who we *should* aim at instead

People more like:

- **Serious investors** who care about news, filings, and flows but **don't** have a ₹50L/year terminal.
- **Active swing traders** who left or are leaving noisy F&O and want **cleaner India context**.
- Anyone who wants **India-focused clarity** without terminal prices.

**Analogy:** We are not building the F1 pit crew's garage. We are building a **really good map + newspaper** for smart drivers who don't have a pit crew.

| | Terminal user (Bloomberg/Cogencis) | SachNetra-style user |
|---|---|---|
| Job | Markets all day | Markets part of life / investing |
| Who pays | Employer | Self / small team |
| Main need | Everything, instantly | **Trustworthy India news + structured data** |
| SachNetra role | Side snack, not main meal | **Could be main place for news + context** |

### One sentence

**Don't try to out-Bloomberg Bloomberg** — serve **smart India investors and swing traders** who want **clean news and useful data**, not a wall of pro trading screens.

*R08 evidence:* `output/R08/R08_positioning_memo.md` §1 (unviable pro terminal space) and §5 (not an investment terminal).

---

## 12. Founder priorities (LOCKED 2026-05-27)

| Priority | Lijo statement |
|---|---|
| **User #1** | Myself (founder) — **builder, never traded**; not a prop trader today |
| **Goal** | **Paper trade** SachNetra **alpha signals** → prove edge → real money later; **₹50k/month** long-term target; **no live trading yet** |
| **Capital** | Invest in product (time + ₹ TBD) |
| **Timeline** | **First ₹ in 30 days** |
| **Cut scope** | Defer Hindi UI, mobile app, perfect UI |

| Boundaries | Status |
|---|---|
| No broker | **Keep** |
| No tips channel | **Keep** |
| SEBI RA | **No** — no public buy/sell calls |
| B2B sales | **Cold call / outreach OK** for paid pilot |
| Pilot data | **No stable 30-day export** — pipeline always changing; sell forward feed + honest sample, not frozen history |

**Filled questionnaire:** [`R10_lijo_questionnaire.md`](./R10_lijo_questionnaire.md) · Plain terms: [`R10_lijo_context_note.md`](./R10_lijo_context_note.md)

**Research:** [`R10_founder_monetization_gaps_osint.md`](./R10_founder_monetization_gaps_osint.md) + [`R10_antigravity_agent_instructions.md`](./R10_antigravity_agent_instructions.md)
