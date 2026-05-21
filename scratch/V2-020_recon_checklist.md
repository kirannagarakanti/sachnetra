# V2-020 Recon Checklist — BIS India Activation (BIS SDMX statistics)

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture
raw output + sample files. Claude transcribes the confirmed findings into the V2-020
task file's Research Appendix — never runs these probes itself
(`feedback_external_agent_recon`).*

---

## READ THIS FIRST — how V2-020 differs from V2-017/018/019

**This is NOT a scrape-the-anti-bot-wall recon.** Unlike NSE (cookie warm-up), NSDL,
or RBI (F5 WAF + dated XLSX), the BIS statistics API is a **clean, public, documented
SDMX REST API** that already works with plain Node `fetch()` in our own codebase.

**India is ALREADY being fetched.** `scripts/seed-bis-data.mjs` already includes
`IN` (Reserve Bank of India) in its country list and already pulls THREE India series
every 12 h into Redis:

| Series | BIS dataset | SDMX key used today (`scripts/seed-bis-data.mjs`) |
|---|---|---|
| Central-bank policy rate | `WS_CBPOL` | `M.<countries>?startPeriod=…&detail=dataonly` |
| Effective exchange rate (REER) | `WS_EER` | `M.R.B.<countries>?startPeriod=…&detail=dataonly` |
| Credit-to-GDP | `WS_TC` | `Q.<countries>.C.A.M.770.A?startPeriod=…&detail=dataonly` |

Base URL in use: `https://stats.bis.org/api/v1/data`, `format=csv`, `User-Agent: <Chrome UA>`.

**So the recon is NOT "can we fetch BIS?" (we can). It is an INVENTORY + SPEC job:**
> **The decisive question**: *What is the COMPLETE set of quant-relevant BIS series
> available for India (`REF_AREA=IN`), what is each one's EXACT SDMX query key, history
> depth, release cadence, and unit?* — so we can decide which to persist and how to
> backfill. The 3 series above are the floor, not the ceiling.

Do **not** spend time re-confirming the warm-up/handshake — there is none. Spend the
time on **completeness** (every India series that matters) and **exactness** (the
literal SDMX key string + dimension codes that return data).

---

## Part A — BIS India series inventory (PRIMARY — the whole point)

The BIS Data Portal / SDMX API exposes many datasets. Confirm, **for each**, whether
India (`IN`) data exists, and capture the cleanest working query. Probe via either the
BIS Data Portal (`data.bis.org`) or the SDMX REST API (`stats.bis.org/api/v1`).

For EACH dataset below: **(i)** does India data exist? **(ii)** the exact working
SDMX key string that returns India rows; **(iii)** sample CSV → `scratch/bis_<dataset>_india.csv`.

### A1. Already-fetched (confirm the India row + history depth only)
- [ ] `WS_CBPOL` — policy rate. Confirm India (`IN`) returns RBI repo rate; record
  earliest available `TIME_PERIOD` (how far back for a backfill) + cadence (monthly?).
- [ ] `WS_EER` — effective exchange rates. India REER + NEER. Confirm both the REAL
  (`R`) and NOMINAL (`N`) variants exist for India; record the dimension that switches
  them (current script hardcodes `M.R.B.` — what is the nominal key?). History depth.
- [ ] `WS_TC` — total credit / credit-to-GDP. Confirm the `Q.IN.C.A.M.770.A` key
  returns India; record what each dimension means (borrowing sector, lending sector,
  valuation, unit `770`=%GDP?) and whether a **credit gap** series exists too.

### A2. NOT-yet-fetched, high-value-for-India (the real prize — inventory these)
- [ ] **Debt service ratios** (`WS_DSR` or current equivalent) — private non-financial
  sector DSR for India. Confirm India coverage + exact key + cadence (quarterly?).
- [ ] **Residential / commercial property prices** (`WS_SPP` / `WS_RPP` / selected
  property price series) — India residential property price index. Key + history + unit
  (index vs % change). Note if real vs nominal.
- [ ] **Long-term / govt bond interest rates** — any BIS series carrying India 10-yr
  or long-term rates (vs the policy rate we already have). Key + cadence.
- [ ] **Total credit breakdown** (`WS_TC` other dimensions) — credit to households vs
  non-financial corporates vs government, in ₹ and as %GDP. Which dimension keys split
  these for India?
- [ ] **US-dollar exchange rate / bilateral** — any BIS USD-INR spot series (vs the
  effective-rate index we already store). Key if it exists.
- [ ] **Consumer prices** (`WS_LONG_CPI` or equivalent) — India CPI series if BIS
  carries it. Key + cadence. (Low priority — we may get CPI elsewhere — but record it.)
- [ ] Skim the **full dataset list** at the SDMX `…/api/v1/dataflow` (or the Data Portal
  dataset index) and **flag any OTHER dataset that returns India rows** which a quant
  macro model would want. List dataset code + one-line description for each.

### A3. For every series confirmed above, capture the field/dimension map
The current parser keys off `REF_AREA` / `TIME_PERIOD` / `OBS_VALUE`. For each new
dataset confirm:
- [ ] The **reference-area dimension name** (is it `REF_AREA`, `BORROWERS_CTY`, or
  other? — `seed-bis-data.mjs:92` already handles two; flag any third).
- [ ] The **frequency dimension** (`FREQ`: `M`/`Q`/`A`) and which India uses.
- [ ] The **unit dimension / `UNIT_MEASURE`** and the literal unit string (% , index,
  ₹ crore, USD, ratio) — wrong unit silently poisons a macro series.
- [ ] Any **multiplier / decimals** dimension (`UNIT_MULT`, `DECIMALS`).
- [ ] The exact `OBS_VALUE` column name in CSV output.

---

## Part B — API mechanics & query construction (confirm, don't reverse-engineer)

- [ ] Confirm the base + format the current script uses still works:
  `GET https://stats.bis.org/api/v1/data/<DATASET>/<KEY>?startPeriod=YYYY-MM&detail=dataonly&format=csv`
  → HTTP 200, CSV body. Record status with a plain Chrome-UA `fetch()` (no cookies).
- [ ] Confirm whether `data.bis.org` (the newer portal) and `stats.bis.org` (the API
  the script uses) are the **same backend** or diverging — record the canonical,
  stable API host to target. (Fragility flag: BIS migrated portals before.)
- [ ] **History / backfill**: does `startPeriod=` (omit `endPeriod`) return the full
  history back to series inception in one call, or is there a row cap / pagination?
  Record the earliest `TIME_PERIOD` returned per key (sets backfill feasibility).
- [ ] **JSON option**: is `format=jsondata` (SDMX-JSON) available + cleaner than CSV?
  Record both; we currently parse CSV but JSON may be more robust to column drift.
- [ ] **Rate limits / etiquette**: any documented BIS API rate limit or fair-use note?
  (We run 12-hourly today; backfill would be a one-off burst — confirm that's fine.)

---

## Part C — Cadence, depth, revisions, lineage

- [ ] **Release cadence per series** — policy rate (event/monthly), EER (monthly),
  credit & DSR (quarterly), property prices (quarterly). Confirm each so the cron
  cadence + "no new data yet" skip window are right. (Likely a single MONTHLY cron
  covers all, since the slowest meaningful update is quarterly — confirm.)
- [ ] **Revisions** — does BIS revise prior periods when it republishes (credit, REER
  especially)? If yes → upsert must be `DO UPDATE` supersede (V2-017 model), not
  append-only. Flag explicitly per series.
- [ ] **Historical depth for backfill** — record earliest available period per series
  (e.g. CBPOL back to ~1990s, credit-to-GDP back to ~1950s for some countries). This
  decides whether V2-020 even needs a backfill script or one full-history fetch suffices.
- [ ] **Attribution / ToS** — BIS data terms for redistribution (Product C lineage
  record, same flag as V2-017/019). Record the required attribution string + any
  non-commercial / citation clause. BIS terms are stricter than RBI/NSE — capture the
  exact wording.

---

## Part D — Decision fodder for Lijo (recon only needs to ENABLE the decision)

**RESOLVED (Lijo, 2026-05-21):** the data lands in the **PostgreSQL quant layer** — a
new `india_macro_*` table via `migrate-india-signals.mjs`, exactly like V2-017's
`india_institutional_flows`. There is NO frontend/variant work (the `economic` flag in
`india.ts` is a map-layer toggle, unrelated to this pipeline — leave it alone). Focus
is data-gathering only ("the database is the asset"). So recon does NOT need to
consider any UI option — it only needs to size the TABLE.

Recon still informs:
- [ ] **Which series to persist** — recommend a shortlist from Part A2 by alpha value
  (policy rate + REER + credit-to-GDP + DSR are the obvious core; property prices +
  long rates are nice-to-have). Rank them — this becomes the table's columns.
- [ ] **Extend vs. new script (open — leaning new):** the existing inherited
  `scripts/seed-bis-data.mjs` already fetches India BIS data to Redis. V2-020 will
  almost certainly add a SEPARATE `seed-india-macro.mjs` + adapter writing to
  PostgreSQL (failure isolation; the India series set diverges) rather than editing the
  inherited script. Recon doesn't decide this — just confirm the series set so the
  divergence is clear.

---

## Issues we might hit — flag during recon

1. **Portal migration / host drift** — BIS moved from `stats.bis.org` legacy to
   `data.bis.org`. If the API the script uses (`stats.bis.org/api/v1`) is deprecated,
   say so loudly and record the replacement — that's a one-constant fix but must be known.
2. **Dataset code renames** — BIS periodically renames dataset codes (`WS_*`). If
   `WS_DSR`/`WS_SPP`/etc. have new codes, capture the CURRENT code that returns data.
3. **Dimension-order changes** — the SDMX key is positional (`M.R.B.IN…`). If BIS
   reorders dimensions, an old key silently returns wrong/empty data. Record the
   current dimension ORDER per dataset (the dataflow/DSD lists it).
4. **Unit mixing** — % vs index vs ₹ vs USD across datasets. Capture the literal unit
   per series (Part A3) — same poison risk as RBI WSS.
5. **Sparse India coverage** — BIS coverage for India is thinner than for G10. Some
   datasets may return empty for `IN`. Record which datasets have NO India data so we
   don't build columns we can never fill.
6. **CSV column drift** — BIS CSV headers have changed before; `seed-bis-data.mjs`
   already defends two header names. If JSON is more stable (Part B), note it.

---

## Deliverables back to Claude (to fill the task's Research Appendix)

- A **table of every confirmed India series**: dataset code · exact working SDMX key ·
  cadence · earliest period · unit · revises? (Y/N) · alpha rank.
- One sample CSV per confirmed series → `scratch/bis_<dataset>_india.csv`.
- The probe script(s) used (throwaway, like the existing `test_*.mjs`).
- The canonical stable API host + format recommendation (CSV vs JSON).
- BIS attribution/ToS string for the lineage record.
- A short note: which series to persist (ranked), revision behaviour per series,
  backfill feasibility (one full-history fetch vs walked windows), and an explicit
  callout if the `stats.bis.org/api/v1` host is deprecated in favour of `data.bis.org`.

*Once these land, Claude writes the V2-020 task file. Note for the author: V2-020 is
the smallest Block-2 task because the SDMX plumbing + India country code ALREADY exist
in `scripts/seed-bis-data.mjs` — the task is "extend the existing fetch to the full
India series set + persist where Lijo decides (A frontend / B quant PG table)", NOT a
ground-up scraper. Keep the sacred-file guard: `seed-bis-data.mjs` is WorldMonitor
inherited code — confirm with Lijo/James whether V2-020 EXTENDS it or adds a separate
`seed-india-macro.mjs` that reuses its query helpers.*
