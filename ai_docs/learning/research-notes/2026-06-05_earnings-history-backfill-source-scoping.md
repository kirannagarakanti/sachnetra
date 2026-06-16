---
tags: [data-sourcing, data-gap, earnings, announcements, PEAD, SUE, exp16, BSE, recon-scope]
source: [[Exp16]], [[2026-06-05_earnings-announcement-data-sourcing]], [[2026-06-04_sue-leg-data-sourcing]]
authored_date: 2026-06-05
audience: Lijo, future Claude / Gemini recon sessions
purpose: Scope the "deep earnings-announcement history" data gap that caps Exp16 at 1.9y — where pre-2024 results-dates come from, at what cost, and the recon plan to confirm depth.
---

# Earnings-History Backfill — Source Scoping (2026-06-05)

## TL;DR

Exp16 is capped at **1.9 years** (events 2024-05-30 → 2026-05) not by prices (we have 150/150 midcaps
back to ~2009) but by **`india_bourse_announcements` only starting 2024-05-30** — because the V2-018
collector scrapes **NSE's live API, which only serves a rolling recent window**. To test mid-cap PEAD over
a meaningful span we need **pre-2024 quarterly-results announcement *dates*, per company, ~5–10 years back,
ISIN-mappable to our NSE symbols.**

**Prime candidate: the BSE corporate-announcements API** — it is free, accepts **arbitrary historical
`from_date`/`to_date` ranges** (NSE does not), filters by results category, maps via ISIN/scripcode, and our
codebase already has a `fetchBSE()` stub. **The one unknown is empirical archive depth**, which a bounded
recon probe must measure before we commit to a backfill.

> ⚠️ **Honest framing — this is NOT an Exp16 fix.** The EAR signal was ~+0.5% and *insignificant even gross*
> ([[Exp16]]); [[Exp17]] killed the intraday/latency capture (RED). More history does **not** rescue EAR.
> Deep history is worth building **only in service of the SUE leg** ([[2026-06-04_sue-leg-data-sourcing]]) —
> it powers a properly-sized SUE-drift test and the fading-anomaly recency test. Gate the spend on that.

---

## 1. The exact field we need

Per (company, fiscal quarter), going back ~5–10 years:

| Field | Why | Have it post-2024? |
|---|---|---|
| **Announcement date/time** (board-meeting outcome / results filing timestamp) | the event anchor — PEAD measures drift *from* this date | ✅ (`announced_at`) |
| **Symbol / ISIN** | join to `research_prices` (.NS) and to our midcap universe | ✅ (`symbol`, `isin`) |
| **Results category flag** | isolate "financial results" from other filings (same regex as Exp16) | ✅ (`category`/`subject`) |
| *(bonus)* **quarterly EPS/PAT (XBRL)** | the SUE *surprise* leg — separate, see [[2026-06-04_sue-leg-data-sourcing]] | ⚠️ XBRL only 2024+ |

The date-anchor is the minimum. The XBRL/EPS panel is a *second* data product (for SUE), also history-limited
today — both are unblocked by the same backfill source if it carries the filing + attachment.

---

## 2. Candidate sources

| # | Source | Depth | Granularity | Access | Cost | ISIN map | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **BSE corp-announcements API** (`AnnSubCategoryGetData/w`, `resultCalendar`) | **historical date-range supported** (depth TBD by recon) | per-filing date + category + PDF + ISIN/scripcode | unofficial scrape (cookie handshake), wrapper exists | **free** | yes (ISIN/scripcode) | **PRIME — recon then build** |
| 2 | NSE live API (current V2-018 source) | rolling ~recent only | per-filing | already built | free | yes | ❌ can't go back — the cause of the gap |
| 3 | Trendlyne / Tickertape / Screener | multi-year results & board-meeting calendars | per-company event dates | 3rd-party scrape, ToS-restricted, no official API | free tier / paid | derived | Park — fragile, ToS risk, redundant if #1 works |
| 4 | Paid vendors: Capitaline/Accord, CMIE Prowess, Refinitiv | deep, clean, academic-grade | full | licensed API/export | ₹₹₹ | yes | Park — overkill for a validation experiment |
| 5 | Wayback Machine of exchange results calendars | patchy | per-page | manual | free | weak | ❌ fallback only |

**Why #1 over #3:** BSE is the *primary venue's own filing feed* (same legal/quality posture as the NSE
scrape we already run for V2-018), supports clean date-range queries, and we already stubbed `fetchBSE()`.
Third-party aggregators (#3) are derived, rate-limited, ToS-restricted, and would still be a scrape — more
fragile for *more* legal exposure and no better data. Paid vendors (#4) are the right answer *if this becomes
a production strategy*, not for proving one.

**Dual-listing note:** ~all Midcap-150 names are listed on both NSE and BSE; the board-meeting/results
announcement is filed to both on the same date. BSE rows carry ISIN → join to our `sm_isin` and to
`research_prices` via the NSE symbol. Coverage should be near-complete for the liquid midcap band.

---

## 3. Recon plan (for the external Gemini agent — per [[feedback_external_agent_recon]])

I scope; **the agent runs the probes in `scratch/`; I do not hit BSE directly.** Questions to answer, in order:

1. **Archive depth** — query `AnnSubCategoryGetData` for a known midcap (e.g. a 2010-listed name) over
   2010-01-01 → 2015-12-31. Does BSE return rows, or empty? Find the earliest date that returns data. *This
   is the make-or-break question.*
2. **Results volume/year** — for ~10 sample Midcap-150 names, count results-category filings per year
   2012→2024. Is it ~4/yr/name (quarterly) with few gaps?
3. **Field + ISIN mapping** — confirm each BSE row carries date, ISIN, scripcode, category, attachment;
   map to our `india_bourse_announcements` columns.
4. **Handshake / rate-limit** — cookie/Referer warm-up, page size, pagination, polite delay (mirror the
   NSE adapter's posture in `_nse-announcements-source.mjs`).

Deliverable: a recon checklist in `scratch/` (like prior `V2-0xx_recon_checklist.md`), which I synthesize
into a backfill task that extends `fetchBSE()` + `backfill-india-announcements.mjs` to the BSE source.

---

## 4. Verdict — PARK (conditional PURSUE), gated on the SUE decision

- **Pursue IF** we decide the **SUE leg is worth one shot** ([[2026-06-04_sue-leg-data-sourcing]]): then
  deep BSE history is the precondition (powers SUE-drift + recency tests). Sequence: recon depth → build BSE
  adapter → backfill ≥5–7y → parse XBRL EPS panel → re-run PEAD on SUE (or top-SUE ∩ top-EAR).
- **Park / don't build IF** the SUE leg is judged a long shot too (the next-session canvas after Exp17 was
  flat): then this backfill has no live consumer and should wait. Per [[project_strategy_reset]], don't
  build data for a refuted bet.

**Gate check** (per RESEARCH_INSTRUCTIONS): (1) buildable on data/tools we have — yes, free BSE scrape;
(2) not kill-list/UI/SaaS — correct, it's a data-asset deepening; (3) **live consumer** — *only* the SUE
test, which must itself be greenlit first → hence *conditional*; (4) denominator — N/A (data-depth, not
coverage). **Default: Park until the SUE go/no-go.**

---

## Sources

- [BseIndiaApi (BennyThadikaran) — unofficial BSE API wrapper](https://github.com/BennyThadikaran/BseIndiaApi); the `announcements()` method calls `AnnSubCategoryGetData/w` with `from_date`/`to_date` (YYYYMMDD), category, scripcode, pagination; plus `resultCalendar()` for result dates — confirms historical date-range support.
- [Trendlyne NSE/BSE results & board-meeting calendars](https://trendlyne.com/equity/calendar/all/all/) — third-party aggregator of historical results/board-meeting dates (candidate #3).

## Artifacts / next
- Diagnostic that proved the gap: `scripts/research/scratch_exp16_depth.mjs` (prices deep to 2009; events 2024+).
- Next action: hand §3 recon plan to the Gemini agent **after** the SUE go/no-go decision.
