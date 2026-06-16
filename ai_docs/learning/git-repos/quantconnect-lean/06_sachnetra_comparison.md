# SachNetra Comparison — LEAN feature by feature

> Rated with `../FEATURE_RUBRIC.md`. SachNetra "today" cites code/memory checked 2026-06-05; unverified items capped at **Good**. The headline framing: **copy LEAN's discipline, not its engine.**

## Evidence checked (this pass)

- `scripts/build-equity-master.mjs` (read) — equity master is a current snapshot, deduped by `SYMBOL`, no effective dates / rename history.
- `shared/nse-equity-master.json` (exists) — output of the above.
- Memory: `project_pead_midcap_finding` (PEAD real, long-only, parked on G4), `project_g1_post_deploy_state`, `project_strategy_reset`.
- LEAN source at clone `b27d79a0`: `AlgorithmManager.cs`, `EquityFillModel.cs`, `MapFile.cs`, `MapFileRow.cs`, `CorporateFactorProvider.cs`, `IAlphaModel.cs`.

---

## Feature-by-feature

| Capability | Domain | LEAN tier | SachNetra today | Target | Gap | Verdict |
|---|---|---|---|---|---|---|
| Structural no-look-ahead (time-sorted lazy stream) | research | Excellent | **Better — VERIFIED**: exp16 signals at T0 close, enters T+1 close, adj_close throughout (correct, but per-experiment not shared) | Better | 0 | Park — fold into a shared helper if a 3rd experiment needs it |
| Transaction cost + slippage in backtest | research | Better | **Better — VERIFIED (CORRECTION 2026-06-05)**: exp16 nets 100/250bps round-trip, accepts only @250bps (`exp16:32,67,284`) | Better/Excellent | +1 | Pursue *refinement only* — flat bps → liquidity-scaled slippage |
| Point-in-time ticker→entity (`map_files`) | data-engineering | Excellent | Poor — current snapshot only | Better | +2 | **Pursue (after G4)** |
| Split/div adjustment separate from raw (`factor_files`) | data-engineering | Excellent | **Better — VERIFIED 2026-06-05**: raw `close` + Yahoo `adj_close` stored; all returns use `adj_close` | Better | 0 | **Resolved** — no factor layer needed |
| Delisting / survivorship awareness | data-engineering | Excellent | Poor — no delisting model | Good | +1 | Park (tie to map file) |
| Pluggable fill/slippage/fee model objects | research | Excellent | N/A — no execution sim | N/A | — | Park (copy concept only) |
| Deterministic security resolution (no LLM guess) | tagging | Excellent | Better — dict + word-boundary regex | Better | 0 | **Already aligned** |
| Alpha→Portfolio→Risk→Execution framework | research | Better | N/A | N/A | — | **Kill for now** |
| `Insight` (direction+magnitude+horizon) record | research | Better | Poor — implicit in event study | Good | +1 | Park (concept) |
| Backtest == live code path | ops | Better | N/A — no live lane | N/A | — | Park (V2 positioning) |
| Full LEAN engine in our stack | ops | Excellent (in repo) | N/A | N/A | — | **Kill** (C# vs Node/TS) |
| India order semantics (`IndiaOrderProperties`) | ops | Good | N/A | N/A | — | Park (no execution yet) |

---

## What we already do well (don't reinvent — cite path)

- **Deterministic, registry-driven ticker resolution** — `scripts/build-equity-master.mjs` + `scripts/_india-market-keywords.mjs` use a dictionary + word-boundary regex, exactly LEAN's "resolve symbols from a registry, never guess" philosophy. We even add collision filtering and `denylist_context` guards LEAN doesn't need (because we parse messy free-text headlines, not clean exchange codes).
- **An explicit experiment program with kill criteria** — `scripts/research/` + the research playbook. LEAN gives you an *engine*; it does not give you a *research discipline* or a kill-list. We have that. Don't import ceremony we already exceed at the discipline level.

## What we're missing or doing differently (by domain)

- **data-engineering**: no time-versioned ticker identity; our `nse-equity-master.json` is timeless. No delisting awareness → survivorship risk in long backtests.
- **research**: leakage prevention is manual (not structural); no transaction-cost/slippage haircut → mid-cap PEAD returns are gross and overstated.

---

## The three things NOT to confuse

1. **LEAN is a backtest/execution engine, not a tagging or sentiment tool.** It does no NLP. Do not let it "fix" G1/G6 — it can't.
2. **The map-file gap is latent, not live.** Our *live* tagger is correct with a current snapshot; the gap only bites a *historical* price-join backtest (mid-cap PEAD). So it's gated on G4, not urgent.
3. **Copy discipline, not code.** Porting the C# engine or building a live execution layer now are Kill/Park under V2 positioning. The two cheap wins (no-look-ahead helper, cost stub) are pure-JS and worth doing.

See [07_sachnetra_application.md](./07_sachnetra_application.md) for the implementation plan.
