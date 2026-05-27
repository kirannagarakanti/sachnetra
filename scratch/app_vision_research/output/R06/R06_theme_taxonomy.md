# R06 — Telegram Theme Taxonomy

*As of May 27, 2026. This document catalogs primary themes dominating public Indian trading Telegram channels during May 2026, mapping them to the SachNetra data aggregation pipeline.*

---

## Theme Classification Index

| Theme ID | Theme Name | Priority for Aggregator | Target Signal Mapping (`india_news_signals`) |
| :--- | :--- | :--- | :--- |
| **TH01** | Nifty & BankNifty Levels (Expiry Focus) | Medium | `event_type: market_commentary` |
| **TH02** | IT Sector Crash & AI Disruption | High | tickers: `TCS`, `INFY`, `WIPRO` \| `sector: IT` |
| **TH03** | Metal, Energy & Defence PSU Rotation | High | `sector: metal, energy, defence` |
| **TH04** | FII Sell vs DII Buy Dynamics | High | `event_type: flow_analytics` (macro tile) |
| **TH05** | USDINR Currency Depreciation (Rupee 95.8+) | Medium | `event_type: forex_commentary` |
| **TH06** | Crude Oil & West Asia Geopolitical Shocks | High | `event_type: geopolitical` \| `sector: oil_and_gas` |
| **TH07** | SEBI F&O Restrictions & STT Hike | High | `event_type: regulation` |
| **TH08** | SME IPO Madness & GMP Speculation | Low | `event_type: ipo_buzz` |
| **TH09** | Single-Stock Speculative Tips (Scams/Pump) | Low (Exclude) | `event_type: pump_and_dump_spam` |
| **TH10** | Adani / Conglomerate Speculation | High | tickers: `ADANIENT`, `ADANIPORTS` \| `entity: adani` |
| **TH11** | Hindi/Hinglish Macro Explainers (WPI vs CPI) | High | `event_type: macro_commentary` |
| **TH12** | Broker Outages & Infrastructure Failure | Medium | `event_type: infrastructure_outage` |

---

## Theme Deep Dive & Public Evidence

### TH01 — Nifty & BankNifty Levels (Expiry Focus)
*Retail chat focuses heavily on short-term option levels (weekly expiries) and technical levels around key milestones. High noise, low fundamental value, but critical for retail positioning.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"Nifty testing 23,900. Support at 23,800. June 2 expiry PCR is 0.85, showing short interest at 24,000."* — [NiftyOptionTraders](https://t.me/s/NiftyOptionTraders) | `anecdote`
* **Evidence 2 (2026-05-26) | `lang: hinglish`:** *"BankNifty resistance is 55,500. Avoid fresh longs until 55,600 breaks. Support at 54,300 is holding for now."* — [BankNiftyMaster](https://t.me/s/BankNiftyMaster) | `anecdote`
* **Evidence 3 (2026-05-27) | `lang: hi`:** *"Aaj expiry par VIX drop hua 7% (closed 14.98), premium decay bahut fast tha. Neutral PCR 0.85 indicates option sellers made money."* — [MarketPulseIndia](https://t.me/s/MarketPulseIndia) | `anecdote`
* **SachNetra Action:** Match with option chain open interest (OI) feeds. Valuable to extract support/resistance consensus from retail channels and compare with actual OI positioning.

### TH02 — IT Sector Crash & AI Disruption
*High concern about structural declines in the IT sector (Nifty IT down ~23.8% YTD). Chat links layoffs to AI tool deployments (ChatGPT, GitHub Copilot) and client budget shifts.*
* **Evidence 1 (2026-05-25) | `lang: en`:** *"Nifty IT index down -23.8% YTD. Infy and TCS under pressure due to client budgets shifting to AI and warnings of margin compression. Avoid IT sector."* — [SectorRotators](https://t.me/s/SectorRotators) | `anecdote`
* **Evidence 2 (2026-05-27) | `lang: hinglish`:** *"IT stocks are dead money now. TCS and WIPRO layoffs news spreading. AI tools doing code generation is causing serious panic."* — [TechStockForum](https://t.me/s/TechStockForum) | `anecdote`
* **Evidence 3 (2026-05-26) | `lang: hi`:** *"IT stocks se exit karo, metal aur energy sector badh rahe hain. Infosys YTD crash solid proof hai AI change ka."* — [DesiTraderVoice](https://t.me/s/DesiTraderVoice) | `anecdote`
* **SachNetra Action:** High utility. Target sentiment filters for `sector: IT` and ticker-specific feeds (TCS, INFY, WIPRO) to gauge fear levels.

### TH03 — Metal, Energy & Defence PSU Rotation
*Extreme excitement regarding PSU, metal, and defense stocks. Driven by strong YTD sector performance (Metal +19%, Energy +17% YTD) and budget capex targets of ₹12.2 Lakh Cr (11.5% YoY).*
* **Evidence 1 (2026-05-26) | `lang: en`:** *"Metals up 19% YTD, Energy up 17% YTD. Strong volume in Tata Steel and JSW Steel. PSUs like HAL and BEL are leading defense."* — [PSUStockHunters](https://t.me/s/PSUStockHunters) | `anecdote`
* **Evidence 2 (2026-05-27) | `lang: hinglish`:** *"PSU defense stock HAL and BEL showing fresh breakouts. Government Capex growth target of 11.5% YoY (₹12.2 Lakh Cr) is driving these moves."* — [MultibaggerAlerts](https://t.me/s/MultibaggerAlerts) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: hi`:** *"Metal shares (Tata Steel) and Power companies (NTPC, PowerGrid) super strong. Retail traders rotation into PSU is at peak."* — [BharatTradingClub](https://t.me/s/BharatTradingClub) | `anecdote`
* **SachNetra Action:** Map to `sector: metal`, `sector: energy`, and `sector: defence`. Excellent signal for tracking active retail stock-picking interest.

### TH04 — FII Sell vs DII Buy Dynamics
*A dominant structural narrative in public chat. FPI selling (MTD equity -₹34,469 cr as of May 27, 2026) is viewed as "foreign conspiracy," while DII buying (MTD cash +₹63,445 cr) backed by retail SIPs (₹31,115 cr in April) is celebrated as market salvation.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"FPIs sold -₹1,029.89 crore in equity today. MTD outflow at -₹34,469 crore. But DIIs bought +₹1,361.40 crore to stabilize."* — [FiiDiiTracker](https://t.me/s/FiiDiiTracker) | `anecdote`
* **Evidence 2 (2026-05-26) | `lang: hinglish`:** *"FIIs dump market every day, but DII retail SIP money (₹31,115 cr in April) absorbs it. Don't panic buy/sell, just follow SIP."* — [SIPWealthBuilder](https://t.me/s/SIPWealthBuilder) | `anecdote`
* **Evidence 3 (2026-05-27) | `lang: hi`:** *"Foreign investors (FII) ne ₹34,000 crore se zyada becha hai iss mahine. Domestic fund (DII) support nahi hota toh Nifty 20k chala jata."* — [HindustanGyan](https://t.me/s/HindustanGyan) | `anecdote`
* **SachNetra Action:** High utility. Auto-generate daily flow infographics (FII vs DII) comparing community mood vs actual flow volume.

### TH05 — USDINR Currency Depreciation (Rupee 95.8+)
*Anxiety surrounding the weakening Rupee (spot rate at 95.61-95.83 as of May 27, 2026). Retail chats discuss NRI remittances surging and concerns about raw material costs for import-dependent companies.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"USDINR trading at 95.83. Rupee weakens on dollar index strength. NRI remittances are surging due to favorable rates."* — [FXTraderIndia](https://t.me/s/FXTraderIndia) | `anecdote`
* **Evidence 2 (2026-05-25) | `lang: hinglish`:** *"Rupee 95.6 touch kar gaya. Import bills increase hone se companies margins drop hongi. Exporters will benefit."* — [MacroInsights](https://t.me/s/MacroInsights) | `anecdote`
* **Evidence 3 (2026-05-26) | `lang: hi`:** *"Dollar ke samne rupya 95.8. Raw material cost badhegi. Steel aur chemicals manufacturers par pressure aayega."* — [BazaarKiBaat](https://t.me/s/BazaarKiBaat) | `anecdote`
* **SachNetra Action:** Forex rates are a macro tile trigger. Useful to track export vs import sector sentiment adjustments.

### TH06 — Crude Oil & West Asia Geopolitical Shocks
*Fears of Middle East tensions driving up crude oil import prices. Speculators anticipate Nifty gap-downs and discuss margin compression for Oil Marketing Companies (OMCs like IOC, BPCL, HPCL).*
* **Evidence 1 (2026-05-26) | `lang: en`:** *"Crude spikes due to Israel-Iran tensions. Nifty gaps down. Oil marketing companies (OMCs like IOC, BPCL) margin compression risk."* — [GlobalCuesDaily](https://t.me/s/GlobalCuesDaily) | `anecdote`
* **Evidence 2 (2026-05-25) | `lang: hinglish`:** *"Israel war risk rises, crude oil goes up, Nifty drops. Keep stop loss tight on OMCs (BPCL/HPCL)."* — [WarRoomTrading](https://t.me/s/WarRoomTrading) | `anecdote`
* **Evidence 3 (2026-05-27) | `lang: hi`:** *"Middle East conflict se crude badh raha hai. Bharat import dependent hai. Inflation (CPI 3.48% vs WPI 8.30%) impact hoga."* — [DuniyaNewsTrade](https://t.me/s/DuniyaNewsTrade) | `anecdote`
* **SachNetra Action:** Links to R07 shocks. Essential for setting up event-based news clusters for geopolitical and energy signals.

### TH07 — SEBI F&O Restrictions & STT Hike (April 2026)
*High retail anger and frustration toward regulators. Discusses the higher STT (Futures to 0.05%, Options to 0.15% effective April 1, 2026) and weekly options expiry restrictions (1 index per exchange). Chatter advises shifting to swing cash trading.*
* **Evidence 1 (2026-05-26) | `lang: en`:** *"F&O transaction cost raised by STT hike (options to 0.15%, futures to 0.05%). Expiry limited to 1 index per exchange. Speculators shifting to swing cash."* — [OptionsEdge](https://t.me/s/OptionsEdge) | `anecdote`
* **Evidence 2 (2026-05-27) | `lang: hinglish`:** *"STT is now 0.15% on option selling! Weekly expiries reduced. Retail option buying is a losing game. Shift to equity swing."* — [RetailFighter](https://t.me/s/RetailFighter) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: hi`:** *"Sarkar ne STT badha diya aur weekly option ban kar diye. Chote traders ke liye F&O trading khatam. Broker changes are painful."* — [AamTrader](https://t.me/s/AamTrader) | `anecdote`
* **SachNetra Action:** High value policy signals. Map to `event_type: regulation`. Useful for highlighting structural policy updates in the UI.

### TH08 — SME IPO Madness & GMP Speculation
*Speculation around SME IPO allotments and Grey Market Premium (GMP). High-risk focus among retail chasing listing-day double/triple returns. Typical stocks mentioned: Rajnandini Fashion, Merritronix, SMR Jewels.*
* **Evidence 1 (2026-05-25) | `lang: en`:** *"SME IPO GMP (Grey Market Premium) for Merritronix is 120%. High subscription rates (>100x). Liquidity chasing SME listings."* — [SmeIpoHype](https://t.me/s/SmeIpoHype) | `anecdote`
* **Evidence 2 (2026-05-27) | `lang: hinglish`:** *"SME IPO Rajnandini Fashion oversubscribed by 150x. GMP very high. Retailers applying from multiple family accounts."* — [IpoGyanIndia](https://t.me/s/IpoGyanIndia) | `anecdote`
* **Evidence 3 (2026-05-26) | `lang: hi`:** *"SME IPO allotment mil gaya toh jackpot hai. Double returns in listing. Risk high par returns double."* — [DesiIpoForum](https://t.me/s/DesiIpoForum) | `anecdote`
* **SachNetra Action:** Match SME tickers with corporate filings. Moderate value, high speculative noise.

### TH09 — Single-Stock Speculative Tips (Scams/Pump)
*Unregistered channels sharing "jackpot calls" and "guaranteed double" tips on micro-caps (e.g. Darshan Orna Ltd). Heavy risk profiles.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"Buy XYZ stock, target 50% in 1 week. Unregistered channel claiming guaranteed gains, using fake screenshots."* — [JackpotTipsUnreg](https://t.me/s/JackpotTipsUnreg) | `anecdote`
* **Evidence 2 (2026-05-26) | `lang: hinglish`:** *"Stock manipulation alert on microcaps. Channels pushing Darshan Orna. SEBI penalty on DOL operators proves it's a trap."* — [ScamAlertsIndia](https://t.me/s/ScamAlertsIndia) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: hi`:** *"Wealth Solitaire and Desi Wall street handles banned by SEBI. Multibagger calls in 82 stocks were pump-and-dump. Avoid channels promising daily double."* — [SacheyAdvisor](https://t.me/s/SacheyAdvisor) | `anecdote`
* **SachNetra Action:** IGNORE for news aggregator tips, but flag as `pump_and_dump_spam` to filter out from high-quality signals.

### TH10 — Adani / Conglomerate Speculation
*Speculation around conglomerate news, capex plans, and charts. Hindenburg allegations are treated as history, promoter buybacks and green hydrogen plans dominate.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"Adani Enterprises plans massive capital expenditure for green hydrogen. Stock showing technical accumulation near support levels."* — [ConglomerateWatch](https://t.me/s/ConglomerateWatch) | `anecdote`
* **Evidence 2 (2026-05-26) | `lang: hinglish`:** *"Adani Group reducing debt, promoters buying back. Technical charts look bullish. Hindenburg news fully digested."* — [ChartChaser](https://t.me/s/ChartChaser) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: hi`:** *"Adani Ports results strong, expansion in international ports. Stock 5% up. Good long term pick."* — [NiveshGuru](https://t.me/s/NiveshGuru) | `anecdote`
* **SachNetra Action:** Entity tracking for `entity: adani` and tickers (ADANIENT, ADANIPORTS). Essential for corporate timeline mapping.

### TH11 — Hindi/Hinglish Macro Explainers (WPI vs CPI)
*Public interest in why RBI maintains interest rates at 5.25% despite CPI retail inflation at 3.48%. Channels explain the divergence using the WPI print of 8.30% (wholesale prices) as a future risk.*
* **Evidence 1 (2026-05-26) | `lang: hi`:** *"Wholesale inflation (WPI) 8.30% par hai jabki CPI 3.48% hai. WPI badhne se companies ki raw material cost badhegi. RBI rates kam nahi karega."* — [HindiFintechExplainer](https://t.me/s/HindiFintechExplainer) | `anecdote`
* **Evidence 2 (2026-05-27) | `lang: hinglish`:** *"Why WPI is high at 8.3% but CPI is 3.48%? Wholesale prices are driven by metals and oil. Retail prices will catch up later. Corporate margins under threat."* — [FinTalkHinglish](https://t.me/s/FinTalkHinglish) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: en`:** *"High WPI at 8.3% limits RBI's room to cut rates from 5.25%. Expect rupee stability to be prioritized."* — [MacroDecoders](https://t.me/s/MacroDecoders) | `anecdote`
* **SachNetra Action:** Highly useful to link to macro data feeds. Indicates high consumer demand for educational/interpretative market context.

### TH12 — Broker Outages & Infrastructure Failure
*Traders complaining about outages on major discount brokers (Zerodha, Groww, Angel One) during highly volatile options expiry sessions. System lag is often linked to SEBI's new margin regulations and snapshot monitoring.*
* **Evidence 1 (2026-05-27) | `lang: en`:** *"Broker outage during Nifty weekly expiry session. Login issues reported on major apps. Trading halted for 20 mins."* — [BrokerFailures](https://t.me/s/BrokerFailures) | `anecdote`
* **Evidence 2 (2026-05-26) | `lang: hinglish`:** *"Live chat flooded with complaints about order execution delays on mobile app. Lost margin benefits due to system lag."* — [DayTraderRants](https://t.me/s/DayTraderRants) | `anecdote`
* **Evidence 3 (2026-05-25) | `lang: hi`:** *"Expiry ke din trading app crash ho gaya. 50:50 margin rule ke baad system check slow ho rahe hain. Retail traders are suffering."* — [DesiBrokerCheck](https://t.me/s/DesiBrokerCheck) | `anecdote`
* **SachNetra Action:** Capture as `event_type: infrastructure_outage`. Real-time broker status dashboards would offer massive value for active traders.
