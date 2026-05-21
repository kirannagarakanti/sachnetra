# V2-024 Recon Checklist — NSE Options Chain + Open Interest

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture raw
output + sample files. Claude transcribes the confirmed findings into the V2-024 task
file's Research Appendix — never runs these probes itself (`feedback_external_agent_recon`).*

---

## Tooling note (use what's best for research)

Gemini now has **Skills + MCP connectors** in addition to the browser agent. **Use
whichever combination is most reliable for live-endpoint reconnaissance** — a browser/HTTP
MCP to hit the NSE JSON endpoints, a code/skill to parse and summarize, etc. The objective
is the same regardless of tool: **confirmed raw JSON samples saved to `scratch/`** + an
exact field map. Don't describe the API from memory — fetch it live and save the payload.

---

## READ THIS FIRST — what V2-024 is, and how it differs from V2-017/018

V2-024 captures **NSE derivatives positioning** — the option chain with **open interest
(OI), OI change, implied volatility (IV), and volume** per strike — so the quant model
gets the **microstructure** feature row it currently lacks: **Put-Call Ratio (PCR), IV
rank, OI-change, max-pain**. The roadmap (Tier 5) rates this high-value and free.

**The handshake is already solved.** The NSE option-chain endpoints sit behind the **same
cookie warm-up** proven in V2-017 (FII/DII) and V2-018 (announcements): `GET
https://www.nseindia.com/` → capture `set-cookie` → reuse on the `/api/*` call with a
`Referer`. **Do NOT re-derive the handshake — confirm it still works and reuse it.**

**The decisive NEW question (resolve first):**
> The option chain is a **live, constantly-changing snapshot**, NOT an append-only event
> log (V2-018) or a one-row-per-day series (V2-017). The alpha (OI build-up, PCR trend, IV
> rank) only exists across a **time series of snapshots**. So the storage model + capture
> cadence is the core design fork. Recon must capture enough to let Lijo choose:
> **(a)** store lean **aggregates per snapshot** (PCR, total CE/PE OI, ATM IV, max-pain,
> underlying) — small, quant-ready; **(b)** store the **full per-strike chain per snapshot**
> — richer but heavy; **(c)** a hybrid (aggregates + ATM ± N strikes). And: **EOD snapshot
> (1/day)** vs **intraday (every N min)**. Capture the data needed to decide; flag it.

---

## Part A — Endpoints & handshake (confirm + reuse)

### A1. Index option chain (PRIMARY)
- [x] `GET https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY` → HTTP status,
  JSON shape. Repeat for `BANKNIFTY` and `FINNIFTY` (priority indices). Save each →
  `scratch/nse_optionchain_<symbol>.json`. (Saved v3 JSON payloads for NIFTY, BANKNIFTY, FINNIFTY)
- [x] Confirm the **same warm-up** as V2-017/018 works: bare `GET https://www.nseindia.com/`
  → `set-cookie` → reuse `Cookie` + a `Referer` on the API call. Record the working
  `Referer` (likely `https://www.nseindia.com/option-chain`). (Confirmed)
- [x] Plain Node `fetch()` sufficient (UA + cookie), or does it need anything more? Record. (Sufficient)

### A2. Equity (single-stock) option chain (SECONDARY — confirm, likely defer)
- [x] `GET https://www.nseindia.com/api/option-chain-equities?symbol=RELIANCE` → status +
  shape. Note whether it mirrors the index payload (so one parser handles both). Save a
  sample. (V1 likely covers indices only; equities is a documented future extension.) (Saved RELIANCE option chain v3 and confirmed identical schema)

### A3. Adjacent / alternative feeds (record if seen, don't build)
- [x] Any `/api/option-chain-v3` or newer variant? Any consolidated "market OI" /
  "most active OI" endpoint? Record URL + status if encountered. (v3 option chain is the active endpoint)

---

## Part B — Payload shape & field map (the core deliverable)

From a saved index sample, record the EXACT structure. Expected shape (confirm precisely):

- [x] Top level: `records` and `filtered`. Record what each contains. (Documented in V2-024_recon_report.md)
- [x] `records.expiryDates[]` — list of all expiries (weekly + monthly). Record format
  (e.g. `"29-May-2026"`) and how many are returned. (Documented)
- [x] `records.underlyingValue` — spot/underlying level. Confirm field name + location
  (also under `filtered`?). (Only under `records`)
- [x] `records.timestamp` — the snapshot time NSE stamps. Record format + timezone (IST?). (Documented, IST)
- [x] `records.data[]` — the per-strike rows. For each row confirm:
  - [x] `strikePrice`, `expiryDate` (Documented keys and values)
  - [x] `CE { ... }` and `PE { ... }` sub-objects. For BOTH CE and PE record the exact
    field names + types for: **`openInterest`**, **`changeinOpenInterest`**,
    `pchangeinOpenInterest`, **`impliedVolatility`**, `lastPrice`, `change`,
    **`totalTradedVolume`**, `totalBuyQuantity`, `totalSellQuantity`, `bidQty`, `bidprice`,
    `askQty`, `askPrice`, `underlyingValue`, `underlying`, `identifier`, `expiryDate`,
    `strikePrice`. Note any field that's missing/null for far-OTM strikes. (Documented, no missing objects, only `optionType` is null, IV is 0 for far OTM)
- [x] Does one call return **all expiries at once** (`records.data`) plus a single
  near-expiry view (`filtered.data`)? Record how to select a specific expiry. (v3 requires filtering by expiry parameter in request)
- [x] Are OI values in **contracts/lots** or **shares**? Record the unit + the lot size if
  present (NIFTY lot size matters for any ₹ notional calc). (Contracts)

---

## Part C — The metrics the quant wants (confirm derivability)

Confirm each can be computed from the payload (record the source fields):
- [x] **PCR (Put-Call Ratio)** = Σ PE `openInterest` / Σ CE `openInterest`. Does
  `filtered` already expose a PCR, or is it derived? Record. (Derived from filtered totals)
- [x] **Total CE OI / Total PE OI** per expiry (and overall). (Present in filtered object)
- [x] **OI change** — `changeinOpenInterest` per strike (the signal). Confirm it's the
  intraday change NSE reports, or compute it ourselves between snapshots? Record what
  `changeinOpenInterest` is measured against (since previous EOD?). (Intraday since previous EOD close)
- [x] **Max pain** — derivable from per-strike OI (Σ losses). Confirm strikes + OI present. (Confirmed and verified)
- [x] **ATM IV / IV skew** — `impliedVolatility` per strike present for near-ATM? Record
  coverage (are far strikes IV=0?). (Confirmed, far strikes are 0)
- [x] **Underlying** spot for ATM determination — present (B above). (Confirmed)

---

## Part D — Cadence, history, storage fodder (the design fork)

- [x] **Update frequency** — how often does NSE refresh the chain (the `timestamp`)?
  Roughly real-time during market hours? Record. This sizes the intraday-vs-EOD choice. (1 minute)
- [x] **History** — does this endpoint expose ANY past snapshot, or **live-only**?
  (Expectation: live-only, like NSE FII was current-day-only → **no backfill possible**
  from this source; OI history accrues forward from deploy.) Confirm explicitly — it
  decides whether V2-024 has a backfill script at all. (Live-only, no historical parameters)
- [x] **After-hours behaviour** — what does the endpoint return when the market is closed
  / on a holiday? (Last EOD snapshot? Empty? Stale timestamp?) This sets the "no new data"
  skip + the EOD-capture timing. (Last active EOD snapshot, same timestamp)
- [x] **Payload size** — how many strikes × expiries in one NIFTY response (row count, KB)?
  This informs the full-chain-vs-aggregates storage decision (Part D fork above). (456 KB for NIFTY, 1.8 MB total for 4 symbols)
- [x] **Rate limits / etiquette** — any throttling observed on repeated calls? (We'll be
  polite — 1 warm-up + a few symbol calls per snapshot.) (Polite 1-1.5s delay is sufficient)

---

## Issues we might hit — flag during recon

1. **Cookie expiry mid-run** — same as V2-017/018; re-warm on 401/403. Confirm it recurs.
2. **Live-only data** — if there's truly no historical snapshot, say so loudly: it means
   the dataset's value accrues forward and there's no backfill (not a blocker, but shapes
   the task).
3. **Snapshot semantics** — `changeinOpenInterest` is intraday-since-prev-close, NOT
   change-since-our-last-snapshot. If we want true inter-snapshot deltas we compute them.
   Record exactly what NSE's change field means.
4. **OI unit ambiguity** — contracts vs shares vs lots. Wrong unit poisons PCR notional /
   max-pain. Capture the literal unit.
5. **Multi-expiry confusion** — `records.data` mixes all expiries; must filter by
   `expiryDate`. Confirm the near-expiry selection mechanism.
6. **Holiday/closed-market** — confirm the closed response so the collector logs + exits 0.

---

## Deliverables back to Claude (to fill the task's Research Appendix)

- `scratch/nse_optionchain_NIFTY.json` (+ BANKNIFTY, FINNIFTY) — real saved payloads
- The exact CE/PE field map (Part B), with units (Part B/D-4)
- Confirmation the V2-017/018 warm-up handshake works here + the working `Referer`
- Whether the endpoint is **live-only** (→ no backfill) and the **update frequency**
- Per-NIFTY payload size (rows/KB) for the storage-model decision
- A short recommendation: **aggregates-only vs full-chain vs hybrid**, and **EOD vs
  intraday**, with the numbers that justify it
- The probe script(s) / tool used (throwaway, like the existing `test_*.mjs`)

*Once these land, Claude writes the V2-024 task file: a new `india_options_oi` (or
`india_derivatives_snapshots`) table, a `seed-india-options.mjs` snapshot collector via
`runSeed()` (cadence per the Part D decision), and — only if history exists — a backfill.
Same separate-cron / status-key / data-to-PostgreSQL shape as V2-017/018/020.*
