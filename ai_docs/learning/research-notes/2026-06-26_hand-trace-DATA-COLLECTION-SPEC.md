---
tags: [hand-trace, data-collection, spec, governance-signal, sources, what-i-need]
date: 2026-06-26
status: SPEC — exactly what data the hand-trace needs, split into (A) what Claude pulls read-only from our filings
  and (B) what needs a manual/external lookup, with the precise source for each. Plus refined T0 dates + the
  Google-search validation of the 3 DROPs.
related: 2026-06-26_hand-trace-roster-VERIFIED.md, 2026-06-26_governance-blowup-PREREGISTRATION.md
---

# Hand-Trace — exactly what we need, and from where

## Google-search validation (2026-06-26) — the 3 DROPs were RIGHT
- **Embassy Developments** — NCLAT quashed all insolvency 2026-05-04 (Indiabulls support-letter misconstrued as a
  guarantee); operations normal, ₹4,600cr pre-sales. ✅ correctly dropped.
- **Jaiprakash Power (JPPOWER)** — JPVL is OUTSIDE insolvency; it was the PARENT **Jaiprakash Associates (JAL)** that
  went to CIRP (Adani ₹14,535cr plan, Mar 2026). Our CIRP filing was JPVL disclosing the parent's process. ✅ dropped.
- **Dharan Infra-EPC** (ex-Karda/KBC Global) — admitted 2025-12-12 (Tata Capital ₹28cr), NCLAT stay 2026-01-06, dues
  settled, **Sec-12A withdrawal** in motion. ✅ dropped (and it's the textbook <90-day-withdrawal case).

## Refined T0 (admission) dates from the search — use these over our first-filing proxy
| Symbol | Company | T0 (authoritative admission) | was (first-filing proxy) |
|---|---|---|---|
| GENSOL | Gensol Engineering | **2025-06-13** (SEBI fraud → IREDA/PFC apps, ₹1,000cr) | 2025-06-18 |
| MARSHALL | Marshall Machines | **2025-08-25** (PA 2025-09-02) | 2025-09-11 |
| RHFL | Reliance Home Finance | **2025-09-16** (CBI fraud ₹7,623cr; Invent ARC 81.87% CoC) | 2025-09-19 |
| FSC | Future Supply Chain | **2025-10-27** → resolved: Reliance Retail ₹171cr, **equity cancelled + delisted** | 2025-10-27 |
| BILVYAPAR | BIL Vyapar (ex-Binani Inds) | **2025-11-13** | 2025-11-28 |
| PARSVNATH | Parsvnath Developers | **2026-04-30** (PA 2026-05-13; homebuyers = FC) | 2026-05-12 |

## Newly-flagged small-caps (search was vague — VERIFY these are full CIRP admissions, not lesser proceedings)
AGS Transact ("stable operationally, legacy litigation"), Sanco / Signet / Premier / XL Energy ("NCLT asset
attachments OR debt restructuring" — softer than admission), Aksh Optifibre / Sab Events (soft language). Our filings
show CIRP-category trails for all, but confirm each via its IBBI order-process page before locking.

---

## (A) What CLAUDE pulls read-only from OUR filings — NO manual work needed
Four of the six friction features are already in `india_bourse_announcements`. I can extract them per case (and per
control) in the pre-registered window `[T0−18m, T0−6m]`, automatically:
- **F1 auditor resignation** ✅ in our data
- **F3 sudden CFO/CS/KMP exit** ✅ in our data
- **F4 independent-director resignation** ✅ in our data
- **F6 delayed/non-submitted results** ✅ in our data
→ I'll build a scorer that outputs F1/F3/F4/F6 counts at T0−12m for every case + control. This is the bulk of the
score, done from data we own.

## (B) What needs a MANUAL / external lookup — the genuinely human part
Only TWO inputs aren't cleanly in our data, plus control selection:

**1. F2 — promoter PLEDGE % at ~T0−12m  (THE key manual input)**
- *What:* the % of promoter holding pledged, from the quarterly shareholding pattern for the quarter nearest
  `T0 − 12 months` (and one or two quarters around it, to see the trend). Pre-reg F2 fires if level >50% OR +10pp rise.
- *Where (free), in order of ease:*
  1. **Screener.in** → company page → "Shareholding" → Promoter pledge % by quarter (fastest, has history).
  2. **Trendlyne** → company → Shareholding → Pledge (also has history + alerts).
  3. **Authoritative:** NSE company page → "Shareholding Pattern" (quarterly) → Pledge/encumbrance table; or BSE
     corp-filings → Shareholding Pattern. Use this to confirm if the aggregator looks off.
- *Per:* each KEEP case + each matched control (~18 cases + ~18 controls ≈ 36 quick lookups).

**2. F5 — related-party-transaction (RPT) spike  (LOW priority — optional)**
- *What:* RPT value as a share of revenue, from the annual report / half-yearly RPT disclosure near T0−12m.
- *Where:* Screener.in (annual report link) or the company's RPT filing. Thin in our data; mark low-confidence — the
  pre-reg already treats F5 as weak. Skip on the first pass if time-pressed.

**3. Matched CONTROL per case  (I propose, you confirm)**
- *What:* one surviving company, same NSE macro-sector + nearest market-cap bracket as of T0−18m, with NO Tier-1
  event in [T0−18m, T0+6m].
- *Where:* I'll propose 1–2 candidates per case from our own universe (sector via the filing `industry` field + size);
  you confirm or swap. Then the control gets the same F1–F6 + pledge% treatment.

**4. (refine) precise admission date T0**
- *Where (authoritative):* **IBBI order-process page** — `ibbi.gov.in/claims/order-process/{CIN}` (the search surfaced
  several, e.g. RHFL `…/L67190MH2008PLC183216`). Use it to confirm the dates in the table above.

---

## The output: one scoring sheet
I'll generate `hand_trace_scoring.csv` with one row per case + control, columns:
`symbol, role(case/control), company, sector, T0, F1_auditor, F3_kmp, F4_director, F6_delayed (← I fill from our data),
F2_pledge_pct, F5_rpt (← you fill from Screener/NSE), friction_score, notes`.
You only hand-fill the **F2_pledge_pct** (and optionally F5) cells. Then we compute the score + run the §5 kill criteria.

## So, concretely, the human asks total
- ~18 case pledge% lookups + ~18 control pledge% lookups (Screener.in, ~1 min each) = the main task.
- Confirm ~18 controls (I pre-fill candidates).
- (optional) RPT for any cases where pledge is borderline.
Everything else (F1/F3/F4/F6, the roster, T0, the scoring math, the kill tests) is mine/automated.
