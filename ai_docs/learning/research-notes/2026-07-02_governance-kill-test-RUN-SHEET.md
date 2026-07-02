---
tags: [governance-signal, kill-test, run-sheet, executable, day-1-day-2, do-first]
date: 2026-07-02
status: READY TO RUN. This is the ~2-day hand-work gate that decides whether #2 governance-monitoring is a real
  early-warning signal or an echo of distress. Run this BEFORE any build. From v1 §8.
reads: 2026-07-02_governance-decisive-test-SPEC-v1.md · 2026-06-26_hand-trace-roster-VERIFIED.md ·
  2026-06-26_hand-trace-DATA-COLLECTION-SPEC.md
---

# Governance signal — 2-DAY KILL TEST run sheet

**What it answers (the crux):** do the governance flags *lead* the first public sign of distress, or just *echo* it?
If they lead → #2 is alive, build the full v1 test. If they echo → #2 dies here, for two days of hand-work (and it
feeds the "publish the nulls" piece either way).
**Read-only. No prod writes. No model needed** — this is hand-tracing, not modelling.

## Pre-flight (~20 min)
1. **Lock the case roster (17 clean KEEPs).** From `2026-06-26_hand-trace-roster-VERIFIED.md`, take the KEEP list
   **minus RHFL** (dropped to illustrative — pre-2024 shell, no healthy→distressed arc). Do **not** pad with FLAG cases
   or toward 45. *If a case fails verification on Day 1, drop it.*
   - **Authority note:** the roster is source of truth for the *case list*; `build-hand-trace-scoring.mjs` is **stale**
     (still lists RHFL; some T0 dates disagree — GENSOL/MARSHALL/BILVYAPAR/PARSVNATH — and it anchors windows to
     *admission*). Use the script only for **control proposals + announcement keyword hits**, never for T0/window
     anchoring. The authoritative `T0*` comes from the Day-1 table below.
2. **Resolve CIN for each case** (the roster has symbol + T_admission only; the IBBI order-page lookups need CIN). Get
   it from `assemble-roster-from-ibbi.mjs` / BSE-NSE master / manual IBBI search **before** Day-1 lookups.
3. **Coverage split (feeds the Day-2 draw).** Our filing data floor is **2024-05-30**. The 4 June-2025 blow-ups
   (SIGIND, GENSOL, PREMIER, XLENERGY) have ~half their `[T0*−18m, T0*−6m]` window — the *early* half where a leading
   flag lives — **before our data begins**, which biases `L` downward. **Draw the Day-2 10 from the ~13 full-coverage
   cases (T0 ≥ Nov 2025); treat the 4 truncated ones as a supplementary check** (or web-supplement their early flag
   dates from NSE archives / Screener / Trendlyne).
4. **Pick + record a 4-digit RNG seed** (also write it into v1 §0). **Draw procedure:** filter to full-coverage cases,
   sort by symbol, seeded shuffle, take the first 10; **log the 10 drawn symbols in the result file before tracing.**

---

## DAY 1 — Clock geometry ("is the measurement window even clean?")
**Goal:** for every verified case, get four dates and compute the lags. This tells us whether anchoring T0\* to the
petition still sits *after* the real economic default (which would contaminate the window and cap the lead-time claim).

**Where each date comes from:**
| Date | Source | How |
|---|---|---|
| `T_admission` | already in roster / IBBI order page `ibbi.gov.in/claims/order-process/{CIN}` | have it |
| `T_petition` | same IBBI/NCLT order page (states the CP/petition-filing date) | manual, ~2 min/case |
| `T_default` (first) | rating rationale (CRISIL/CARE/ICRA/India Ratings press release: "delays in debt servicing since…" / "downgraded to D on…") or SEBI/exchange default disclosure | manual web lookup |
| `T_rating_to_D` | rating agency history | manual web lookup |

**Fill this table (one row per case):**
```
# | symbol | company | CIN | T_admission | T_petition | T_default | T_rating_to_D | admit−petition (days) | petition−default (days)
```

**Compute + decide:**
- `median(T_admission − T_petition)` and `median(T_petition − T_default)`.
- **Buffer rule (feeds v1 §2):** if `median(T_petition − T_default) > 6 months` → the 6-month buffer is too short
  (the window still catches post-default filings) → **widen the buffer to 9 months** in v1 §2 before Day 2.
- **Structural-ceiling flag:** if for >50% of cases `T_admission − T_default > 12 months` (the formal admission lags
  the real economic default by over a year), the lead-time claim is structurally capped at "months, not a year+" —
  record it as a hard caveat (not a kill). *(Measured against admission, the late clock: `T_default` cannot precede
  `T0*`, since `T0* = min(T_petition, T_default, T_rating_to_D)`.)*

*This half also directly re-confirms the deepest fresh-eyes catch: how badly admission lags the real event.*

---

## DAY 2 — Lead-time + specificity (the actual KILL/PROCEED decision)
**Goal:** for 10 cases + 1 matched control each, hand-build the governance-flag timeline and check (a) do flags LEAD
the first conventional distress signal, and (b) do controls fire the same flags (specificity — a flag that fires for
everyone is useless).

**Steps:**
1. **Draw 10 cases** with the RNG seed (if the verified roster < 10, use all).
2. **One matched control per case:** same NSE macro-sector + nearest size bracket + same listing status, NOT in CIRP,
   alive at the case's T0\*. (Reuse the control-proposal logic in `scripts/research/build-hand-trace-scoring.mjs`;
   confirm each by hand.) Control's window = the **matched case's T0\*** (pseudo-T0\*).
3. **Extract flags WITH DATES** in `[T0*−18m, T0*−6m]` for all 20 companies:
   - `auditor_resign`, `cfo_cs_id_exit` → **reuse `build-hand-trace-scoring.mjs`** (does F1/F3/F4 keyword extraction
     from `india_bourse_announcements`) — **extend it to (a) emit the flag DATE, not just a count** (lead-time needs the
     date) and **(b) recompute the window from T0\*, not the script's admission T0**. ~1hr script tweak.
   - `late_results_change` → **manual** (v1 §3 defines it as *late in window AND on-time in the earliest observable
     period* — a change from baseline; the script's F6 regex only detects delay keywords, not the baseline flip).
   - `pledge` (listed only) → Trendlyne/Screener shareholding history — manual, the flag DATE = first quarter the
     spike appears.
   - `rpt_spike` → annual-report/RPT disclosure — manual.
   - `CFDP` (financial-distress text: default/overdue/SARFAESI/NPA/covenant/liquidity-crunch) at ~T0*−18m → keyword
     scan of the same filings.
   - *(`going_concern_qual` is deliberately excluded — death-debris, written *because* the firm is failing; v1 §3/SE-4.)*

**Definitions (pin these before tracing — avoid inconsistent execution):**
- `T0* = min(T_petition, T_default, T_rating_to_D)` = the "first conventional distress signal." **Recompute each
  company's window `[T0*−18m, T0*−6m]` from T0\*, NOT from the script's admission date.**
- `flag_leads_by (months) = (first_conventional_signal − earliest_gov_flag_date)` → **positive = flag leads.** (Any
  flag inside the window is ≥6m before T0\* by construction — the 6-month buffer *is* the ≥6m-lead test, so `L`
  reduces to "how many cases have a tier-1 flag in-window.")
- **`L` flag set = tier-1 only: `pledge`, `rpt_spike`, `auditor_resign`** (matches v1 §8). Personnel/late-results
  flags do **not** count toward `L`.
- **`S` flag set = any of the 5 headline flags** in-window (`any_gov_flag_in_window`), same set for case and control.
- **`R` denominator = cases with any gov flag in-window;** `R` = fraction of those with `CFDP=1` at the single point
  `T0*−18m` (redundancy = financial distress already visible *before* the governance flags; this point-in-time measure
  matches v1 §8, distinct from v1 §4's baseline window — intentional).

**Fill this table (one row per company — case AND its control):**
```
# | symbol | role | T0* | first_conventional_signal (min of T_default/T_rating/T_petition) | earliest_gov_flag_date | which_flag | flag_leads_by (months) | leads ≥6m? Y/N | any_gov_flag_in_window? Y/N | CFDP=1 at T0*−18m? Y/N
```

**Compute the three decision numbers:**
- `L` = # of the 10 CASES whose earliest pledge/RPT/auditor flag leads the first conventional signal by **≥6 months**.
- `S` = (fraction of 10 cases with any gov flag in window) − (fraction of 10 controls with any gov flag in window).
- `R` = fraction of *flagged* cases that already had `CFDP = 1` at T0*−18m.

## THE PRE-REGISTERED DECISION (decide now, don't move it after seeing numbers)
- **KILL** if `L < 4` **OR** `S < 0.3`. → #2 has no leading edge / no specificity. Stop; write it into the nulls piece.
- **PROCEED** to the full v1 build if `L ≥ 4` **AND** `S ≥ 0.3`.
- **AMBER** (proceed but reframe) if it passes but `R > 0.8` → the signal leads but is redundant with financial
  distress → it's a "confirms what leverage already says" product, not an independent edge. Price/position accordingly
  (ties to v1 §9 "promoter-misconduct" framing).

## Write-up (do not skip)
Record the run in **`2026-07-02_governance-kill-test-RESULT.md`**: the Day-1 clock-geometry table, the seed + the 10
drawn symbols (logged *before* tracing), the Day-2 timeline table, the three numbers `L`/`S`/`R`, and the resulting
**KILL / PROCEED / AMBER** verdict (per §"THE PRE-REGISTERED DECISION"). Either verdict feeds the "publish the nulls" piece.

**Total effort:** Day 1 ≈ manual date lookups for 17 cases (½ day). Day 2 ≈ 1hr script tweak + hand-tracing ~20
companies (½–1 day). No prod writes, no model, no capital.
