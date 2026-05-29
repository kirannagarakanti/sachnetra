# G7b — Nifty Microcap 250 Symbol List — Gemini Research Agent Instructions

**Status:** NEEDED — automated fetch blocked (niftyindices.com bot-walls; nsearchives 404 for this file).
**Date:** 2026-05-29
**Your job:** Research + deliverable only. Do NOT implement code. Do NOT run anything against prod.
**Output location:** Write the JSON array to `shared/nifty-microcap250.json`; note source + "as of" date in §5 below.

---

## 0. Why

Exp 14 re-run 3 (post-G7) finally produced a signal — `pledge_increase` POST −312 bps, p<0.05 — but
the primary units didn't clear the **N≥20** SUPPORTED gate (`pledge_increase` N=9, `auditor_resignation`
N=15). Of ~50 raw pledge-increase filings in the 2-year window, only 9 are usable because the other ~41
sit on names below the Smallcap 250 with no price. **Extending `research_prices` one tier down to the
Nifty Microcap 250** should price enough of those to push `pledge_increase` past N≥20.

The price backfill script is ready (`backfill-midcap-prices.mjs --symbols-file=…`); the **only** missing
piece is an authoritative Microcap 250 ticker list. The automated CSV fetch failed (source bot-blocking),
so it falls to you — same as the Midcap 150 list earlier this session.

## 1. Source (authoritative only — do NOT hand-type or recall from memory)

- The NSE / niftyindices.com official constituents list for the index **"Nifty Microcap 250"**
  (file `ind_niftymicrocap250list.csv`, or the constituents table on the niftyindices.com factsheet).
- The index has **exactly 250 constituents**. If your source returns a different number, **stop and
  report it** — do NOT pad or trim to force 250.
- Record the **"as of" date** of the list you used.

## 2. Symbol format (this is what breaks the Yahoo fetch)

- Use the **NSE trading symbol** (EQ-series), NOT company name, NOT BSE code.
- Preserve it exactly as NSE lists it, including any `&`/digits (e.g. `M&MFIN.NS` verbatim).
- Append `.NS`. Uppercase, no spaces, no trailing punctuation.

## 3. Deliverable — `shared/nifty-microcap250.json`

A single flat JSON array of strings, nothing else:
```json
["AETHER.NS", "AVANTIFEED.NS", "..."]
```

## 4. Self-check before returning (state each result)

- [ ] Count **== 250** (report the actual number).
- [ ] Every entry ends in `.NS`; no duplicates; no spaces; no company names / BSE codes.
- [ ] Any symbol you can't confirm from the official source: list it separately and flag it — do NOT
      include guessed symbols (they silently pull the wrong company's prices).

Validation snippet:
```bash
node -e "const a=require('./shared/nifty-microcap250.json');const bad=a.filter(s=>typeof s!=='string'||!s.endsWith('.NS')||/\s/.test(s));const d=a.filter((s,i)=>a.indexOf(s)!==i);console.log('count:',a.length);if(bad.length)console.error('BAD:',bad);if(d.length)console.error('DUPES:',[...new Set(d)]);if(!bad.length&&!d.length)console.log('OK');"
```

## 5. What happens next (the bar)

Once `shared/nifty-microcap250.json` exists, Claude runs:
```bash
node scripts/research/check-db-space.mjs
node scripts/research/backfill-midcap-prices.mjs --dry-run --symbols-file=shared/nifty-microcap250.json
```
Accepted when the dry-run shows ~250 symbols and near-zero misses. Then the prod backfill + Exp 14 re-run.
(Note: micro-caps will have more Yahoo misses than large-caps — some are illiquid/newly-listed; >20% misses
means the list is wrong-format, not that the script broke.)

## 6. Out of scope

- No code in `scripts/`/`shared/` beyond writing the JSON. No prod writes. No sacred files.

---

## Changelog
| Date | Note |
|------|------|
| 2026-05-29 | Created after automated fetch hit niftyindices bot-wall + nsearchives 404. Awaiting Gemini to produce `shared/nifty-microcap250.json` (record source + "as of" date on delivery). |
