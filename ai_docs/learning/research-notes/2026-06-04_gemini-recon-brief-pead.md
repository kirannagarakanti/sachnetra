---
date: 2026-06-04
problem: Several load-bearing figures in the PEAD research thread are search-summary only (WebFetch can't reach anti-bot NSE/SEBI pages or parse some PDFs). Hand Gemini (browser access) a precise, checkable list to page-verify before any of these go to the wiki as fact.
status: recon-brief — FOR GEMINI (browser/chrome-devtools recon)
lane: Gemini recon agent (browser); Lijo to paste this
tags: [research-note, recon-brief, gemini, page-verification, PEAD, SLB, EAR]
sources_consulted: ["Internal: all 2026-06-04 PEAD research-notes + exp16_brief"]
---

# Gemini recon brief — page-verify the PEAD thread's search-summary figures

> **For the Gemini recon agent (it has browser/chrome-devtools access; Claude Code's WebFetch is blocked on
> anti-bot NSE/SEBI sites and can't parse some PDFs).** Open each source **directly**, extract the exact
> values, and report each as **PAGE-VERIFIED** (with the value + a short quote) or **COULD-NOT-ACCESS**.
> Do **not** fabricate; a "couldn't open it" is a valid, useful answer. Write results into a new note
> `research-notes/2026-06-04_pead-recon-results.md` (do not edit the existing notes).

## Why this exists
Claude page-verified what it could (Harshita SCIRP, Quantpedia, 2026 STT, SEBI Aug-2024 F&O criteria,
LODR-XBRL, the NSE master files). These items remain **search-summary only** and gate real decisions —
verify them at the page level.

## Verification targets (priority order)

### 1. SLB market liquidity (gates the long-only conclusion) — HIGH
- **Claim to verify**: India SLB is thin/large-cap-skewed; *March 2026* ≈ **11.87 cr shares lent, 341 active
  scrips, ₹57.32 cr total monthly rental**; borrow fees 0.5–10% annualized; Zerodha SLB is offline-only.
- **Where**: NSE Clearing SLBS page + monthly SLB reports (`nseclearing.in/clearing-settlement/slbs`);
  cross-check Dhan / ScanX / InvestYadnya SLB pages.
- **Extract**: the latest monthly SLB total turnover/volume, # active securities, and whether mid/small-cap
  (Midcap-150 / Smallcap-250) names appear in the borrowable list at all.
- **Why it matters**: if SLB is genuinely this thin and large-cap-only, the long-only verdict is confirmed.

### 2. Brandt/Kishore/Santa-Clara/Venkatachalam (2008) EAR primary (gates Exp16's design) — HIGH
- **Conflict to resolve**: WebSearch summary says EAR-drift is ~7.55%/yr and **does NOT reverse**; a
  Rockstead replication (page-verified) says EAR **reverses** (−3.39%) and SUE (+3.91%) is the leg that
  drifts. These contradict.
- **Where**: the UCLA PDF `anderson.ucla.edu/documents/areas/fac/finance/ear.pdf` (Claude couldn't parse it
  locally — no PDF renderer); SSRN abstract `papers.ssrn.com/sol3/papers.cfm?abstract_id=909563`.
- **Extract**: (a) the EAR-sorted vs SUE-sorted annualized abnormal returns; (b) the **exact sentence on
  whether EAR drift reverses or continues**; (c) sample period & universe; (d) the EAR definition (day
  window). Then find **Rockstead's** sample/period/universe to explain the conflict (decay? different data?).
- **Why it matters**: Exp16 can only build the EAR leg; if EAR reverses, Exp16's first gate must be
  continue-vs-reverse (see `ear-proxy-risk-for-exp16.md`).

### 3. Sehgal & Subramaniam (2018) liquidity/size split (the one Gemini half-verified before) — MEDIUM
- **Claim to verify**: does the paper **stratify PEAD drift by liquidity or size** (decile/quintile drift
  levels), or only confirm PEAD exists? The prior recon marked it "page-verified" but only confirmed PEAD
  existence — the **liquidity split was never extracted**, leaving "drift bigger in illiquid names" UNRESOLVED.
- **Where**: SAGE (paywalled) — try institutional access, ResearchGate, or an author preprint mirror.
- **Extract**: any table of CAR by size/liquidity group. If not present, say so explicitly.

### 4. Current F&O / SLB-eligible list size (gates the "liquid Midcap-150 half") — LOW
- **Claim to verify**: ~208–250 F&O-eligible stocks as of 2026; SEBI Aug-2024 criteria (MQSOS ₹75L, MWPL
  ₹1,500cr, ADDV ₹35cr, impact ≤1%).
- **Where**: NSE F&O securities list (`nseindia.com`); the SEBI Aug-30-2024 circular.
- **Extract**: the current count of F&O-eligible names, and how many overlap the Nifty Midcap 150.

## Acceptance criteria for the results note
For each target: **value + one short quote + source URL + PAGE-VERIFIED / COULD-NOT-ACCESS**. Flag any number
that *differs* from the search-summary figure above (those are the corrections that matter most — as happened
when Claude page-verified Harshita and the "2.43%/mo" figure turned out to be fabricated).

---
*This brief exists because the evidence ceiling for anti-bot sources is "search-summary" until a browser
opens them. Gemini closes that gap; Claude will re-integrate the verified values (and correct any notes that
relied on a wrong search-summary number).*
