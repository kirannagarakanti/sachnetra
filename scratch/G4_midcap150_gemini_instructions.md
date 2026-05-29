# G4 — Nifty Midcap 150 Symbol List — Gemini Research Agent Instructions

**Status:** NEEDED — blocks a clean G4 dry-run. The price backfill script is wired and ready; only the symbol list is missing.
**Date:** 2026-05-29
**Your job:** Research + deliverable only. Do NOT implement code. Do NOT run anything against Railway prod.
**Output location:** Write the JSON array to `shared/nifty-midcap150.json` (and a short source note in this file's §6 changelog).

---

## 0. Why you're doing this

SachNetra's price table (`research_prices`) currently holds **only the Nifty 50** (~47 symbols). Because
~96% of corporate filings are for mid/small-caps we can't price, every event study starves — Exp 14
found only **2 of 712** filings landed on a priced symbol. Adding the **Nifty Midcap 150** is the
single highest-leverage data fix; it directly revives the #1 strategy (mid-cap governance-shock
arbitrage).

The backfill script `scripts/research/backfill-midcap-prices.mjs` is finished and disk headroom is
confirmed (5 GB volume, ~3% used). The **only** thing missing is an authoritative list of the 150
constituent tickers. That's your deliverable.

**Why this matters precisely:** the list feeds a Yahoo Finance fetch. A wrong, guessed, or
mis-formatted symbol either fetches nothing or — worse — silently pulls the wrong company's prices
into the table. **Accuracy beats completeness.** A flagged "couldn't confirm" symbol is fine; a
hallucinated one is not.

---

## 1. Source — authoritative only (do NOT hand-type or recall from memory)

- **Primary:** the NSE / niftyindices.com official index-constituents list for the index
  **"Nifty Midcap 150"** — the file `ind_niftymidcap150list.csv` from niftyindices.com, or the
  constituents table on the niftyindices.com factsheet / NSE index page.
- The index has **exactly 150 constituents**. If your source returns a number other than 150, **stop
  and report it** — do NOT pad or trim to force 150.
- Record the **"as of" date** of the list you used. Constituents change at the semi-annual review, and
  we'll want to know which snapshot the prices came from when we re-run Exp 14.

---

## 2. Symbol format — this is what breaks things if wrong

- Use the **NSE trading symbol** (the EQ-series ticker), NOT the company name and NOT the BSE numeric
  code.
- **Preserve the symbol exactly as NSE lists it**, including any `&` or digits (write `M&M.NS`,
  `L&TFH.NS` verbatim — do NOT strip or substitute characters). A "helpful" cleanup of `M&M` → `MM`
  just produces 404s.
- **Append `.NS`** to every symbol (Yahoo Finance suffix for NSE).
- Uppercase, no spaces, no surrounding quotes-within, no trailing punctuation.

---

## 3. Deliverable — `shared/nifty-midcap150.json`

A **single JSON array of strings**, nothing else (no comments, no trailing commas). This is the exact
format the script's `--symbols-file` loader expects:

```json
[
  "BHARATFORG.NS",
  "LICHSGFIN.NS",
  "FEDERALBNK.NS"
]
```

(The loader also accepts `[{ "ticker": "X.NS" }]` and `{ "registry": [...] }`, but the flat array is
the least error-prone — use it.)

---

## 4. Self-check before returning (state each result explicitly)

- [ ] Count **== 150** (report the actual number you found).
- [ ] Every entry ends in `.NS`.
- [ ] No duplicates.
- [ ] No entry is a company name, a BSE numeric code, or contains spaces.
- [ ] Any symbol you could **not** confirm from the official source is listed separately and flagged —
      it is NOT included in the array. (Guessing poisons the table.)

A quick validation you can run on the finished file:

```bash
node -e "
const arr = require('./shared/nifty-midcap150.json');
const bad = arr.filter(s => typeof s !== 'string' || !s.endsWith('.NS') || /\s/.test(s));
const dupes = arr.filter((s,i) => arr.indexOf(s) !== i);
console.log('count:', arr.length);
if (bad.length) console.error('BAD FORMAT:', bad);
if (dupes.length) console.error('DUPLICATES:', [...new Set(dupes)]);
if (!bad.length && !dupes.length) console.log('OK — all entries are .NS, unique, no spaces');
"
```

---

## 5. What happens next (so you know the bar)

Once `shared/nifty-midcap150.json` exists, Lijo/James run a **dry-run** (writes nothing) to eyeball it:

```bash
node scripts/research/backfill-midcap-prices.mjs --dry-run --symbols-file=shared/nifty-midcap150.json
```

The script prints the symbol count and per-symbol bar counts, and will **warn if >20% of symbols miss**
("symbol list is likely wrong-format"). Your list is accepted when that dry-run shows ~150 symbols and
near-zero misses. Then the real backfill runs and the dashboard "Price Universe" tile climbs 47 → ~200.

---

## 6. Out of scope (do not do)

- Do NOT implement or modify code in `scripts/` or `shared/` (other than writing the JSON list itself).
- Do NOT run SQL or any script against Railway prod.
- Do NOT include guessed/unconfirmed symbols in the array — flag them separately instead.
- Do NOT touch sacred files (`src/config/variants/full.ts`, etc.).

---

## 7. Success criteria

Accepted when:
- `shared/nifty-midcap150.json` is a flat JSON array of exactly the confirmed Midcap 150 tickers in
  `SYMBOL.NS` form, with the "as of" date noted.
- The §4 self-check passes (count, `.NS` suffix, no dupes, no junk).
- The dry-run in §5 shows ~150 symbols and near-zero misses.

---

## Changelog
| Date | Note |
|------|------|
| 2026-05-29 | Created. Awaiting Gemini/MinMax to produce `shared/nifty-midcap150.json` (record the source page + "as of" date here on delivery). |
| 2026-05-29 | Delivered `shared/nifty-midcap150.json` (150 symbols). Source: https://nsearchives.nseindia.com/content/indices/ind_niftymidcap150list.csv (As of: 2026-05-29). |
