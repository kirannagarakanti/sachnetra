# G7 Phase 2 Recon Findings — Bourse Announcements Depth & Classification

This document summarizes the findings from the Phase 2 data-availability and classification recon on the NSE corporate announcements feed, conducted via the `scratch/test-nse-announcements-depth.mjs` and `scratch/test-nse-classification.mjs` tools.

---

## 1. Upstream Source and Backfill Depth

- **Upstream Source**: The NSE corporate announcements endpoint:
  `GET https://www.nseindia.com/api/corporate-announcements?index=equities`
- **Query Parameters**: The endpoint accepts `from_date=DD-MM-YYYY` and `to_date=DD-MM-YYYY` parameters to filter by date range. It does not require pagination; it returns a single flat JSON array for the requested window.
- **Historical Depth**: Tested date ranges going back **3 years** (e.g., May 2023, May 2024, May 2025, Nov 2025, and May 2026). The endpoint successfully responds with full datasets for all periods, confirming that **at least 3 years of historical data is active and queryable**.

---

## 2. Classification Schema Stability

Older records carry the exact same schema, categories, and subject structures as current filings:
- **Category field (`desc`)**: Values like `"Change in Auditors"`, `"Resignation of Statutory Auditor"`, and `"Resignation"` have been populated consistently from 2023 to 2026.
- **Subject field (`attchmntText`)**: Contains detailed text regarding auditor changes (e.g., `"MIRC ELECTRONICS LIMITED has informed the Exchange about Resignation of Statutory Auditor"`) and promoter pledging.
- **Regex Compatibility**: Test classification against the Exp 14 rules showed that the regex filters (`/auditor/` and `/pledg|encumbr/` combined with sub-tags `/resign/`, `/vacated/`, etc.) categorize historical filings perfectly.

---

## 3. Volume and Target N Estimates

A test scan of **30 days** of history (from April 29, 2026 to May 29, 2026) returned the following metrics:
- **Total Filings Fetched**: 23,570
- **Total Governance Filings**: 764 (~3.2% of all filings)
- **Primary Governance Shocks identified**:
  - `auditor_resignation` (SHOCK): **27**
  - `pledge_increase` (SHOCK): **3**

### Backfill Scoping (2-Year Target):
- Over 30 days, we found **27** auditor resignations.
- Scaling this up:
  - **1 Year (365 days)**: ~320 auditor resignations and ~35 promoter pledge increases.
  - **2 Years (730 days)**: ~650 auditor resignations and ~70 promoter pledge increases.
- **Conclusion**: A 2-year backfill is **well-powered** to get the primary governance shock units (`auditor_resignation` and `pledge_increase`) past the **N ≥ 20** threshold.

---

## 4. CAVEAT — raw filing counts ≠ usable (priced) events (added 2026-05-29, Claude review)

The counts above (~27/30d → ~650/2yr auditor resignations; the later 180-day scan found 72) are
**raw governance filings**, regardless of whether we can price the company. Exp 14's *usable* N has
two further gates that these scans do **not** apply:

1. **Priced-symbol gate** — the symbol must exist in `research_prices`. In the post-G4 Exp 14 run,
   `auditor_resignation` usable N was **0** despite raw resignations existing, precisely because they
   sat on unpriced small-caps. Phase 1 (Smallcap 250 prices) is what raises this overlap — the two
   phases must land **together** to move usable N.
2. **Survivorship ceiling** — the worst shocks happen at firms that later delist/blow up, and Yahoo
   only serves *currently-listed* names. Those events stay unpriceable on free data.

**Tempered read:** raw resignations will be in the hundreds, but **usable N = raw × priced-overlap**,
still capped by survivorship. The honest expectation is "this should clear N ≥ 20 once Smallcap 250
prices are in," **not** "hundreds of usable events." Confirm against the actual Exp 14 funnel after
both backfills, not against the raw scan counts.
