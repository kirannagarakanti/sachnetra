# R06 — Telegram: What India Is Talking About (NEXT — run in Antigravity)

*Goal: **general public talk** on Indian markets Telegram — what themes dominate in May 2026, and what is **useful vs noise** for a news aggregator that collects `india_news_signals`.*

**Output folder:** `scratch/app_vision_research/output/R06/`  
**Standards:** [`_quality_standards.md`](./_quality_standards.md)  
**Fact baseline (do not re-argue):** [`output/R03/R03_india_market_snapshot_2026-05.md`](./output/R03/R03_india_market_snapshot_2026-05.md)  
**Public only · no paid groups · en + hi + hinglish**

---

## Read R03 first — hypotheses to validate on Telegram

Use Telegram research to **confirm or reject** whether retail chatter matches facts:

| R03 fact (May 2026) | Telegram hypothesis to test |
|---|---|
| Nifty 50 -8.6% YTD, stuck below 24k | Banter about "24k resistance", frustration, bear vs dip-buy |
| Nifty IT ~-24% YTD | Heavy talk on TCS/Infy layoffs, AI killing IT, sector avoid |
| Metal/Energy +17–19% YTD | Rotation into PSU/metal/defence; "which stock next" |
| FPI -₹34k cr MTD vs DII +₹63k cr | "FII selling" + "DII saving market" narratives |
| USD/INR ~96 | Rupee panic, import cost, NRIs remitting |
| WPI 8.3% vs CPI 3.5% | Inflation confusion; "why RBI not cutting" |
| STT hike + weekly expiry rules | Anger at government/SEBI; strategy shift to cash/SIP |
| India VIX ~15 (down on day) | Complacency vs "calm before storm" |
| West Asia / oil (RBI minutes) | Crude, war, market gap-down fear |

---

## Part A — How to sample (no paid groups)

| Method | Use for |
|---|---|
| Public `t.me/` channel preview | Primary |
| Google `site:t.me` + theme keywords (Hindi + English) | Discovery |
| Reddit/Twitter citing channel names | Cross-check |
| SEBI / ET / Mint enforcement articles | Scam channels (facts) |
| YouTube "join our Telegram" funnels | Ecosystem map only |

**Do not** join paid premium groups. **Do not** promote or link scam channels as recommendations.

### Suggested search queries (copy-paste)

```
site:t.me Nifty BankNifty India
site:t.me "FII" "DII" भारत शेयर
site:t.me "STT" F&O SEBI 2026
site:t.me "IT stocks" TCS Infosys AI
site:t.me "multibagger" SME IPO
site:t.me crude oil Iran Israel भारत
Telegram channel India stock market tips SEBI action 2025 2026
```

---

## Part B — Theme taxonomy (PRIMARY deliverable)

For **each theme**, find **≥3 public examples** with: `date | lang | paraphrase | source URL | matches_R03? (Y/N) | useful? (Y/maybe/no) | maps_to_signal (ticker/sector/event_type)`

### Mandatory themes (from R03 + Lijo)

| Theme | Useful for SachNetra? | maps_to_signal |
|---|---|---|
| Nifty / BankNifty levels & expiry | | `event_type: market_commentary` |
| **IT crash / AI disruption** | | tickers: TCS, INFY, WIPRO… `sector: IT` |
| **Metal / Energy / Defence rotation** | | `sector: metal, energy, defence` |
| **FII sell / DII buy** | | macro tile; align V2-017 data |
| **USDINR / rupee 95+** | | macro; FX thread |
| **Oil / West Asia / war** | | links R07; oil OMC tickers |
| STT / SEBI F&O rules 2026 | | policy `event_type: regulation` |
| Single-stock tips / multibagger | | usually **no** — scam risk |
| SME IPO frenzy | | maybe SME tickers; overlap filings |
| Adani / conglomerate | | entity timeline |
| "News" reposts (ET, Mint links) | | **no** if duplicate RSS |
| **Hindi macro explainers** | | **yes** if leads English press |
| Crypto | | **no** unless product expands |
| SIP / mutual fund vs trading | | persona signal (R00) |
| Broker outage / margin | | `event_type: infrastructure` |

**Deliverable:** `R06_theme_taxonomy.md` + `R06_theme_evidence.csv`  
Columns: `theme, date, lang, quote_or_paraphrase, url, confidence, matches_r03, useful, maps_to_signal, notes`

**Decision rule for "useful":**

- **Yes** = recurring entity/topic we could tag in `india_news_signals` or a story thread
- **Maybe** = mood only (store bucket, don't build UI yet)
- **No** = scam, guaranteed returns, pure duplicate of RSS headlines

---

## Part C — Channel samples (5 public channels)

Light touch — **do not endorse**:

| Field | Record |
|---|---|
| Channel name (public) | |
| Approx followers (if visible) | |
| Hindi % | |
| Posting cadence | |
| Content type | text / screenshot / forwarded news |
| Overlap with SachNetra RSS? | high / medium / low |

**Deliverable:** `R06_channel_samples.md`

---

## Part D — Regulatory facts (scams)

SEBI/press on Telegram pump-and-dumps **2023–2026** — facts only.

**Deliverable:** `R06_regulatory_facts.md` (each row: date, regulator action, URL, `confirmed`)

---

## Part E — SachNetra relevance (wiki §3 input)

**Deliverable:** `R06_sachnetra_relevance.md`

1. Themes **already covered** by RSS (low incremental value)
2. Themes on Telegram **before** English mainstream (Hindi lead — evidence required)
3. **Top 3 data types** Telegram cares about that we **don't** collect yet
4. **Top 3 ticker/entity names** over-mentioned vs our G1 coverage
5. Should app show "community temperature"? → recommend **yes / no / later** with evidence

---

## Part F — Data registry (required)

Mirror R03 format — end with:

**Deliverable:** `R06_data_registry.csv` — every claim in Parts B–E with `confidence` + URL.

---

## Status checklist

- [ ] Read R03 baseline
- [ ] B theme taxonomy + evidence CSV (≥12 themes, ≥3 examples each)
- [ ] C channel samples (5)
- [ ] D regulatory facts
- [ ] E SachNetra relevance memo
- [ ] F data registry

---

## After R06

Run **R07** (shock chronology) — Telegram oil/war talk links to episode narratives.  
Then **R04** (Reddit) — **cross-validate** themes found on Telegram (same table structure).
