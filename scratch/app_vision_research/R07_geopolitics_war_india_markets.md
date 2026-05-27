# R07 — Geopolitics, War & India Markets (run AFTER R06)

*How Indian equities, INR, oil, and flows behaved across major shocks. **Scope locked:** all major episodes since 2020 + COVID, Adani, demonetization appendix.*

**Output folder:** `scratch/app_vision_research/output/R07/`  
**Standards:** [`_quality_standards.md`](./_quality_standards.md)  
**May 2026 anchor:** [`output/R03/R03_india_market_snapshot_2026-05.md`](./output/R03/R03_india_market_snapshot_2026-05.md)  
**Telegram war/oil themes:** cross-check with `output/R06/R06_theme_taxonomy.md` when available  
**Not coupled to Exp 11.**

---

## Part A — Mandatory episode list

Build one row per episode in `R07_episode_master.csv`:

| Episode | Anchor date | Must cover |
|---|---|---|
| COVID crash + India lockdown | Mar 2020 | |
| Russia–Ukraine + crude spike | Feb 2022 | |
| US Fed hiking / EM risk-off | 2022–2023 | |
| **Adani–Hindenburg** | Jan 2023 | **required** |
| Israel–Hamas / Middle East oil fear | Oct 2023+ | |
| Red Sea / shipping stress | 2023–2024 | |
| India elections / policy shifts | 2024 | |
| US tariff / trade war rhetoric | 2025–2026 | |
| **West Asia escalation (live May 2026)** | 2026 | RBI April minutes cite conflict; USD/INR ~96 |
| Nifty gap **>2%** external headline days | scan 2020–2026 | add rows found |

**Optional appendix (≤1 page):** Demonetization (Nov 2016) — comparator only.

**Deliverable:** `R07_timeline_scope.md`

---

## Part B — Market path per episode

For **each** episode, table (daily first 30d, then weekly):

`date, Nifty_close, USDINR, Brent_usd, India_VIX, FPI_equity_net_inr_cr, headline_event, confidence, source_url`

**Primary sources:**

| Series | Source |
|---|---|
| Nifty | NSE historical / investing.com |
| USDINR | RBI reference / investing.com |
| Brent | FRED / investing.com |
| FPI | NSDL `fpi.nsdl.co.in` (monthly for old episodes; daily for 2025–26) |
| VIX | NSE India VIX |

**Deliverable:** `R07_episode_prices.csv` (long format, one section per episode)

---

## Part C — Sector winners/losers per episode

Use sector indices where possible (not narrative alone):

| Episode | Likely sectors (hypothesis) | Verify YTD/episode return |
|---|---|---|
| Crude spike 2022 | OMC pain, metal up | |
| Adani Jan 2023 | Adani group, banks | |
| West Asia 2026 | defence, OMC, IT risk-off | compare R03 sector table |

**Deliverable:** `R07_sector_by_episode.md`

---

## Part D — Narrative archaeology

How narrative evolved (ET/Mint/BS archives + R06/R04 social if done):

- `persisted` vs `fad` (did price follow narrative?)

**Deliverable:** `R07_narrative_chronology.md`

---

## Part E — SachNetra product implications

**Deliverable:** `R07_product_implications.md`

- Should app have **geopolitics** story thread type?
- Macro tiles for war regimes (from R03: oil, USDINR, VIX, FII)
- G1 tickers: defence, OMC, metals — priority list

---

## Part F — Data registry

**Deliverable:** `R07_data_registry.csv`

---

## Status checklist

- [ ] A episode master
- [ ] B price paths (all mandatory episodes)
- [ ] C sector by episode
- [ ] D narrative chronology
- [ ] E product implications
- [ ] F data registry
