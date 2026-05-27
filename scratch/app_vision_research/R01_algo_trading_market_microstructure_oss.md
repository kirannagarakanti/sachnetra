# R01 — Algo Trading & Market Microstructure (OSS GitHub Brief)

*How markets work in open-source quant code — not textbook theory. Ground SachNetra's research playbook in real implementations.*

**Output folder:** `scratch/app_vision_research/output/R01/`

---

## Part A — GitHub repo landscape (PRIMARY)

Search GitHub (and awesome-quant lists) for **maintained** repos. For each repo record: stars, last commit, license, language, India relevance (Y/N).

### A1. Execution & backtesting engines

Probe categories:

- `zipline`, `backtrader`, `vectorbt`, `nautilus_trader`, `lean` (QuantConnect)
- India-specific forks or brokers: any `kiteconnect`, `openalgo`, `stocksight` India adapters

**Extract from README/source:** order types supported, slippage model, commission hooks, corporate actions, timezone handling.

### A2. Market data & bars

- How do OSS projects define OHLCV bars? (trade-time vs quote-time)
- Handling halts, auctions (NSE pre-open), illiquid mid-caps
- Any repo documenting **NSE session structure** (9:15–15:30, block deals, ASM/GSM)

### A3. Microstructure concepts in code

Find implementations (not just docs) of:

- Order book / L2 (even if US-only — note gaps for India)
- VWAP, TWAP, POV algorithms
- Market impact models (Almgren-Chriss, square-root law) — `grep` in repos
- Latency measurement (tick-to-trade)

**Deliverable:** `R01_repo_inventory.csv` columns:  
`repo_url, category, stars, last_commit, india_relevant, key_files, one_line_lesson`

### A4. Event studies & news alpha in OSS

Search: `event study`, `earnings surprise`, `news sentiment backtest`, `edgar`, `filing`

- How do they align news timestamp to price bar?
- Survivorship bias handling?
- Map to SachNetra's Exp 10/11 posture (`latency_vs_value_tradeoff.md`)

**Deliverable:** `R01_event_study_patterns.md` — 5 patterns we could copy in `scripts/research/`

---

## Part B — How "a market" is modeled in code

From top 3 repos by stars + India relevance, document:

1. **Instrument hierarchy** (symbol, exchange, currency, multiplier)
2. **Calendar** (holidays, half-days, expiries)
3. **Portfolio state** (positions, margin, leverage rules)
4. **Signal → order pipeline** (where latency matters)

Diagram in markdown (mermaid ok).

---

## Part C — India gaps in OSS

Explicit list: what popular OSS **assumes** (US equities) that **breaks** on NSE:

- T+1 settlement (since 2023)
- STT on sell side
- F&O weekly expiries, lot size changes
- ASM/GSM surveillance, price bands
- Illiquid mid-cap bid-ask (relevant to Exp 11)

**Deliverable:** `R01_india_oss_gaps.md`

---

## Part D — Facts to verify (official sources)

Cross-check OSS claims against:

- NSE circulars / market hours (nseindia.com)
- SEBI master circulars on algo trading (if any retail-facing rules)

Tag: `oss_claim` vs `exchange_fact`

---

## Status checklist

- [ ] A1–A4 repo inventory (≥20 repos sampled, ≥5 deep-read)
- [ ] B pipeline diagram
- [ ] C India gaps list
- [ ] D official cross-checks
