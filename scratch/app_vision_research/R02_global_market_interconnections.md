# R02 — Global Market Interconnections (Antigravity Brief)

*How equity, rates, FX, commodities, and vol transmit shocks — with India as the downstream node.*

**Output folder:** `scratch/app_vision_research/output/R02/`

---

## Part A — Transmission channels (concept + data)

For each channel document: **mechanism**, **typical lag**, **India instrument**, **public data source**:

| Channel | India touchpoint | Data source to cite |
|---|---|---|
| USDINR ↔ FII flows | RBI reference rate, NSDL FPI | |
| Brent/WTI ↔ OMC stocks, inflation | MCX, MoPNG | |
| US10Y ↔ EM equities | Fed, RBI policy | |
| DXY ↔ INR risk-off | ICE DXY | |
| China PMI ↔ metals, IT demand | NBS, India imports | |
| Geopolitical risk (GPR index) | Defence, oil importers | |
| VIX / India VIX | NSE VIX | |

**Deliverable:** `R02_transmission_matrix.csv`

---

## Part B — Crisis episodes (event study style)

Pick **5 episodes** since 2020. For each (2-page max):

1. Trigger (external)
2. First India market move (date, index, INR)
3. Sector winners/losers
4. Retail narrative vs institutional narrative (if distinguishable)
5. How fast FII/DII data reflected it (lag)

Suggested episodes (confirm with Lijo — see R07 for war scope):

- COVID crash + India lockdown (Mar 2020)
- Russia–Ukraine war + crude spike (Feb–Mar 2022)
- US Fed hiking cycle peak fear (2022–2023)
- Adani-Hindenburg (Jan 2023)
- Israel–Iran escalation window (2024–2025 if relevant)
- Trump tariff / trade war rhetoric (2025–2026 headlines)

**Deliverable:** `R02_episode_chronology.md`

---

## Part C — OSS / academic on spillovers

GitHub + papers:

- `spillover`, `diebold-yilmaz`, `connectedness`, `var`, `global vector autoregression`
- India-specific: "India financial market spillover" on Google Scholar (top 5 recent)

**Deliverable:** `R02_spillover_methods.md` — which methods fit daily SachNetra data?

---

## Part D — What SachNetra should surface in UI

From A–C, propose **5 macro tiles** a news user needs when Nifty gaps:

- Example: USDINR + Brent + US10Y + FII + India VIX

For each: free real-time/delayed source we could already collect (check `sachnetra_quant_roadmap.md` collectors).

**Deliverable:** `R02_ui_macro_panel_spec.md`

---

## Status checklist

- [ ] A transmission matrix
- [ ] B five episodes
- [ ] C spillover methods
- [ ] D UI spec
