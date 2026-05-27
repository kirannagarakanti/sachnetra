# R10 — Week 1 Paper-Trade Starter (Lijo)

*No code required. Start before Signals tab (V2-035) ships.*

---

## Day 1 (30 min)

1. Copy template → new Google Sheet: **SachNetra Paper Journal**.
2. Columns: `date | signal_type | ticker | headline_or_filing | entry_price_paper | T+1_return% | T+5_return% | notes`
3. Read `R10_lijo_workflow_map.md` §1 — **cash equity only**, Nifty 50 names first.
4. Open [Zerodha Kite](https://kite.zerodha.com) → enable **paper trading** (or use NSE prices manually in sheet).

---

## Day 2 — Define 3 rules (GAP-10-012)

Write one sentence each — only trade when these fire:

| Rule ID | Example (edit to match your data) |
|---|---|
| **S1 Filing** | Material NSE announcement on Nifty 50 name (auditor change, pledge, order win) |
| **S2 Sentiment** | Cluster sentiment ≤ -0.5 or ≥ +0.5 on tagged ticker (verify in DB/Sheet first) |
| **S3 Flow day** | FII/DII ratio day when you publish the tile (later); skip until V2-017 UI |

**Max 1 paper trade per rule per day** — avoids overtrading while learning.

---

## Days 3–7

- Each market day: check SachNetra (or James export) for S1/S2 triggers.
- Log **even “no trade”** days (discipline).
- Target: **≥5 logged rows** by end of week 1.

---

## Parallel (James / optional you)

- SEBI disclaimer on site (V2-032)
- 7-day CSV sample for future B2B (V2-033)

---

## 30-day success (paper track)

**Not ₹50k.** Success = **≥15 paper logs** + you can answer: “Did S1 or S2 look profitable on paper?”

B2B ₹ is Track B — see `R10_executive_summary_for_lijo.md`.
