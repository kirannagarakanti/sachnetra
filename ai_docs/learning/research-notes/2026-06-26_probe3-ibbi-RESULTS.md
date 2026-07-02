---
tags: [probe, results, ibbi, cirp, insolvency, blow-up-labels, governance-signal, case-roster]
date: 2026-06-26
status: RESULTS — Probe 3 (external Gemini recon) answered. The clean CASE-label source + a structural trick that
  makes the listed-company filter trivial. The hand-trace roster is now assemblable.
related: 2026-06-26_probe3-ibbi-cirp-registry-recon-brief.md, 2026-06-26_governance-blowup-PREREGISTRATION.md,
  2026-06-26_probe2-bhavcopy-RESULTS.md, [[project-pivot-governance-door]]
---

# Probe 3 — IBBI CIRP registry: the clean blow-up labels (FEASIBLE)

## Verdict
The authoritative blow-up list is **free, structured, and listed-filterable in one move.** This replaces the
too-noisy announcement-text labels. The case roster for the hand-trace is now assemblable.

## The blueprint (from the recon — method is sound; verify specific values against the real file)
1. **Source = IBBI Quarterly Newsletter annexures** (`ibbi.gov.in` → Resources → Publications → Quarterly
   Newsletters). Each quarter ships a structured **Excel master list of all CIRPs** with clean columns: *Corporate
   Debtor Name, CIN, Date of Admission, Current Status* (Ongoing / Resolution Approved / Liquidation / Withdrawn).
   **Do NOT scrape the live HTML tables** (paginate infinitely, break).
2. **THE LISTED-COMPANY CHEAT CODE (the gem):** an Indian CIN is 21 chars; **listed companies' CIN starts with `L`,
   unlisted with `U`.** Filter `CIN LIKE 'L%'` → instantly drop ~95% private-market noise and keep exactly our
   universe. Free, reliable, structural — far better than name/ISIN guessing.
3. **False-alarm filter (early settlements):** companies that settle exit via **IBC Section 12A** — status
   "Withdrawn under Sec 12A." Drop those where (withdrawal − admission) < ~90 days (matches our §1 pre-reg rule).
4. **CIN ↔ symbol bridge:** low pain. BSE "List of Securities" master (`Equity.csv`) maps Scrip Code ↔ **ISIN**; the
   filtered listed-blow-up set is only ~50–100 names all-time, so the join is small. **Our own
   `india_bourse_announcements` already carries an `isin` column → ISIN is the natural join key** between IBBI and
   our filings (cleaner than symbol-name matching).
5. **Equity-wipeout insight (important for labelling):** "**Resolution Approved**" is NOT a survivor — the company
   was bought out of bankruptcy and the **original equity holders were wiped to zero** (e.g., DHFL, Bartronics). So
   for our purpose **Ongoing + Resolution Approved + Liquidation all count as blow-ups (equity wipeout)**; only the
   <90-day 12A withdrawals are excluded.

## Anchor reality-check (Claude)
- **The `L`-CIN filter is genuinely elegant** — a free, structural, reliable listed filter. Adopt it.
- **Verify the sample values, trust the method.** The recon's sample table (Aksh Optifibre, Future Brands, Astron
  Paper, Future Retail, Jet, DHFL, Bartronics) is right in SHAPE, but several admission dates look uniform/rounded
  (two at "20-Jun-2026") — likely LLM-approximated. Pull the real Excel and take dates/CINs/status from it, not from
  the recon prose. (Standard discipline: method from the agent, exact numbers from the source file.)
- **Join lands in our data:** because we hold `isin` on filings, IBBI(CIN)→ISIN→our filings is a clean key. Trivial
  read-only next check: confirm `isin` is populated for the distressed symbols (RHFL, IVRCL, ERAINFRA, AKSHOPTFBR…).
- **Calendar split (unchanged):** recent admissions (mid-2025 → 2026) = the PRIMARY arm (we hold ~12m of prior
  filings); famous pre-2024 deaths (DHFL '19, Jet '19, Future Retail '22) = the illustrative arm (manual archival).
- **The end-note nuance is real and worth adopting:** trading is often **suspended months BEFORE** the NCLT admission
  date. So the true "blow-up moment" (T0) may precede admission. For honesty, define **T0 = earliest of {first hard
  distress flag, trading suspension, NCLT admission}**, and keep the 6-month min-gap measured from that earliest T0 —
  otherwise we'd overstate lead time. (Tightens, doesn't loosen.)

## Second recon (independent run) — corroborates + two refinements
A second agent independently gave the same blueprint (IBBI quarterly Excel → 12A filter → BSE-master bridge),
strengthening confidence. Two useful refinements:
1. **Simpler bridge — the BSE "List of Scrips" master carries CIN *directly* in the same row as Scrip Code.** So the
   join is **CIN ↔ CIN** (IBBI ↔ BSE master) → Scrip Code → (optional ISIN for NSE). No ISIN-only hop needed; NSE
   files often drop the CIN, BSE keeps it. (Cross-check: our filings hold `isin`, so either CIN→ISIN or CIN→ScripCode
   →ISIN lands in our data.)
2. **Event-Zero discipline — use the ADMISSION date, NOT the delisting date.** A stock often keeps trading in the "Z"
   group for months/years *after* admission before formally delisting; delisting is "ancient history" for the signal.
   This **reconciles with recon-1's "suspension precedes admission" note** as follows (now locked in §1): **T0 =
   admission date** (the clean legal death-moment); **lead-time reported conservatively also against any earlier hard
   distress flag**; never anchor on delisting. ~20–30% of all CIRPs are 12A withdrawals (many in the first 30 days =
   vendors using NCLT as a debt-collection lever) → the <90-day drop matters.

## What this unblocks → the roster recipe is now concrete
1. Download the IBBI quarterly CIRP Excel(s) covering admissions ~2024 → 2026.
2. Keep `CIN LIKE 'L%'`; drop <90-day Sec-12A withdrawals; keep Ongoing/Resolution/Liquidation.
3. Bridge CIN→ISIN (BSE master) → join to our `india_bourse_announcements.isin` → keep names where we hold ≥~12m of
   prior filings (admission in our window) = the **PRIMARY case roster**; the rest (famous, pre-2024) = illustrative.
4. For each case, set T0 = earliest of {distress flag / suspension / admission}; hand-pick a matched survivor control;
   hand-collect promoter-pledge % at T0−12m; score F1–F6 vs the locked pre-registration → kill criteria → attack round.

## Status of inputs (all green now)
- Labels (blow-ups): **IBBI CIRP, `L`-CIN filter** ✅ (this probe)
- Universe (survivorship-free): **bhavcopy archives** ✅ (Probe 2)
- Pledge feature: **quarterly shareholding-pattern %** ✅ (Probe 1b)
- Other features + default label: **already in our filings** ✅ (Probe 1)
→ Nothing data-side blocks the hand-trace. Next session = pull IBBI Excel → assemble roster → hand-trace.
