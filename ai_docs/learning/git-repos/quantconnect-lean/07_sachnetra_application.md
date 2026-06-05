# SachNetra Application Plan — what to actually build

> Concrete port plan for the Pursue items. Everything here is pure Node/JS — **we do not adopt the C# engine.** Verdicts are gate-checked against `../TEMPLATE_REPO.md` rules and V2 positioning.

## Priority summary

| # | Item | Domain | Effort | Blocked by | Verdict |
|---|---|---|---|---|---|
| 1 | No-look-ahead + cost discipline in backtests | research | — | — | ✅ **ALREADY DONE in exp16** (CORRECTION 2026-06-05) — net 100/250bps, T0→T+1 entry, adj_close |
| 1b | *Refinement*: liquidity-scaled slippage as a new robustness variant | research | S/M | Lijo decision (pre-registration) | Optional — Pursue only if Lijo wants it |
| 2 | India "map file" — point-in-time ticker/rename history (+ survivorship) | data-engineering | M | G4 having a consumer | Pursue **after G4** — now the *top real gap* |
| 3 | Verify `research_prices` split/div adjustment | data-engineering | S | none | ✅ DONE 2026-06-05 — PASS (adj_close used throughout; no factor layer needed) |

---

## #1 — Research-discipline helper — ⚠️ CORRECTION 2026-06-05: already done in exp16

**Original claim (WRONG):** "exp16 reports gross returns, no cost model; look-ahead guard is manual." A full read of `exp16-midcap-pead.mjs` shows otherwise:
- **Costs modelled** — `carFor(e,H,costBps)` returns `sRet − bRet − costBps/10000` (`:284`); `--costs` defaults `100,250`; acceptance gate is the conservative **250bps** scenario (`:32,67,74`).
- **No look-ahead** — signal at T0 close, **entry T+1 close**, exit T+1+H, `adj_close` throughout (`:16-31`).
- Plus DSR (trials penalty), Theil's U, ADF/KPSS, concentration robustness, recency gate, survivorship caveat.

So the LEAN "discipline transfer" is **already satisfied** for the live experiment. No new helper is required to make exp16 honest.

**Two things that remain genuinely open:**
- **1b (optional refinement):** the cost model is a *flat* round-trip bps applied to all names. LEAN's slippage scales with spread/volume. A **liquidity-scaled slippage** (e.g. Amihud-derived per-name bps) would be more honest for heterogeneous midcap liquidity — but it changes the pre-registered cost spec and adds a DSR trial, so it must be a **new robustness variant**, decided by Lijo, not a silent edit.
- **Shared helper (Park):** exp16 does the guard correctly but *per-experiment*. Only worth extracting into `_backtest-lib.mjs` if a 3rd experiment needs the same logic — not now.

**Gross vs net needs ZERO code:** run `node scripts/research/exp16-midcap-pead.mjs --costs=0,100,250`. The `0`bps rows are the gross baseline; `100`/`250` are net. The summary CSV already carries a `cost_bps` column.

**What to build** — a small shared module, e.g. `scripts/research/_backtest-lib.mjs`:

1. **Time-ordered event iterator** that, given an event at date *t*, only yields price bars with `bar.date <= cursor` — making a future read *impossible by construction*, not by reviewer vigilance. Mirror of LEAN's lazy time-sorted stream (`FileSystemDataFeed` + `SubscriptionSynchronizer`, see 02).
   - API sketch: `forwardWindow(prices, eventDate, horizonDays)` returns bars strictly after the event for return measurement; `asOf(prices, t)` returns only `<= t` for any feature computed at decision time. The helper *throws* if code requests data past the cursor.
2. **Mandatory cost + slippage haircut** on every simulated round-trip. Mirror of `EquityFillModel` (buy ask + slip / sell bid − slip, see 04).
   - API sketch: `applyCosts(grossReturn, { roundTripBps })`. Default a non-zero bps tuned to mid-cap liquidity (mid-caps have wide spreads — a gross PEAD backtest overstates edge). No promote-to-signal result may report gross-only.

**Why it clears the verdict gate**: buildable on data we have today (EOD `research_prices`) ✅; not UI/SaaS/variant work ✅; moves a live, on-focus experiment (mid-cap PEAD, `project_pead_midcap_finding` / `project_strategy_reset`) ✅; does not lean on the rejected 20%-coverage denominator ✅.

**Owner**: James. **First use**: re-run `exp16-midcap-pead.mjs` through the helper and report **net** (post-cost) PEAD — that is the number that decides whether the signal is real.

---

## #2 — India "map file" (Tier-2, after G4)

**Problem.** `shared/nse-equity-master.json` (built by `build-equity-master.mjs`) is a *current* snapshot deduped by `SYMBOL`. A mid-cap PEAD backtest over 2009→now joins news/events to prices across years; renamed/relisted/delisted mid-caps mis-join or vanish (survivorship). LEAN solves this with `map_files` (`MapFile.GetMappedSymbol(date)`, see 03).

**What to build** — a thin, ISIN-anchored history table:
- Schema: `{ isin, nse_symbol, effective_from, effective_to }` — one row per (symbol, period). ISIN is the stable identity (the `SecurityIdentifier`/`Permtick` analog); `nse_symbol` is the display ticker that changes.
- Resolver: `mappedSymbol(isin, date)` and reverse `identityForSymbolOnDate(symbol, date)`.
- Source: NSE symbol-change / name-change circulars; seed from current `EQUITY_L.csv` + a back-history of changes. Even a **rename-events-only** version removes the worst errors.
- Add a `delisting_date` to flag survivorship (LEAN's `MapFile.DelistingDate`).

**Why it's Park-until-G4, not Pursue-now**: its only consumer is the mid-cap PEAD backtest, which is itself gated on **G4** (mid-cap prices; the prior backfill crashed prod — see `feedback_check_disk_before_prod_writes`). Build it *with* G4 so the join is correct on day one. We do **not** need LEAN's binary format — just the date-versioned identity idea.

---

## #3 — Verify corporate-action adjustment ✅ DONE 2026-06-05 — PASS

**Question**: does `research_prices` store split/dividend-**adjusted** bars or raw?

**Answer (verified by reading the collectors + exp16):** both, correctly.
- `backfill-research-prices.mjs` (Nifty-50) and `g4-backfill-midcap-prices.mjs` (midcaps) pull Yahoo `/v8/finance/chart`, store **raw `close` AND Yahoo's split+dividend-adjusted `adj_close`**, and compute `log_return` from `adj_close` (`backfill-research-prices.mjs:138`; `g4-backfill-midcap-prices.mjs:166-167`).
- `exp16-midcap-pead.mjs` is **"adj_close-based throughout"** (`:17`): return windows use `adj_close` (`:197-205`); raw `close × volume` is used only for Amihud turnover (`:209`), which is the correct base for liquidity.

**Conclusion**: no `factor_files`-style layer needed — Yahoo already delivers an adjusted series and every return calc uses it. The LEAN `factor_files` lesson is **already satisfied** for our universe. (Caveat: Yahoo `adjclose` is split+dividend = total-return basis; standard and fine for abnormal-return PEAD.)

**What this surfaces instead**: the real residual midcap data risk is NOT adjustment — it's **survivorship + symbol mapping**: delisted/renamed midcaps may be absent or unresolvable in Yahoo, biasing the universe. That is exactly the `map_files` gap → backlog #2 (Park-until-G4). Adjustment is closed; identity-over-time is the open one.

---

## Explicit non-goals (Kill / Park)

| Non-goal | Why | Verdict |
|---|---|---|
| Port/host the LEAN engine | C#/.NET vs Node/TS edge; huge surface, zero current need | **Kill** |
| Build a live broker execution layer | no execution lane under V2 positioning ("be our own first customer" ≠ trading platform) | **Park** (revisit post-proof) |
| Adopt the Alpha→Portfolio→Risk→Execution framework | overkill for single-signal validation | **Kill for now** (borrow the `Insight` *concept* only) |

---

## Definition of done (for this repo's learnings)

- [ ] `_backtest-lib.mjs` exists with the look-ahead-safe iterator + cost haircut; `exp16` re-run reports **net** PEAD. *(Pursue #1)*
- [ ] `research_prices` adjustment question answered with a spot-check. *(Pursue #3)*
- [ ] India map-file schema filed as a task **when G4 runs** — not before. *(Park #2)*
- [ ] No attempt to vendor LEAN or build execution. *(Kill)*
