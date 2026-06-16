<!--
═══════════════════════════════════════════════════════════════════════════════
VENDORED THIRD-PARTY REFERENCE — verbatim copy, not SachNetra's own work.

Source repo : github.com/jayanthmb14/forthepeople  (ForThePeople.in, by Jayanth M B)
Source path : research/india-modules-coming-soon-sources-2026-04-25.md
License      : MIT (per the repo) — reuse permitted with attribution. This is their
               research file, kept verbatim below for our reference ONLY.
Copied on    : 2026-06-15 (from a shallow clone in scratch/forthepeople).

WHY WE KEPT IT: it is a pre-verified Government-of-India data-source catalogue (URLs,
API availability, refresh cadence, NDSAP legal status, scraping pitfalls — all checked
against live portals 23–25 Apr 2026). Several rows are direct SachManas factor-node
feeds (macro / commodity / weather / policy / politics) or already-filed SachNetra tasks.

HOW WE USE IT: mine the FACTOR-layer sources where SachManas has gaps; we already own
the market/company/exchange side (NSE collectors, FII/DII, research_prices), which this
gov-only catalogue deliberately excludes. Our read + the SachNetra mapping is in:
  ../research-notes/2026-06-15_indian-market-ideas-for-sachmanas.md  (§2b)
Task reconciliations: RBI WSS row = V2-019 (confirmed); MoSPI eSankhyiki = evaluate vs
V2-020 (BIS SDMX) before building.

DO NOT treat any URL here as still-live without re-checking — verified Apr 2026, things move.
═══════════════════════════════════════════════════════════════════════════════
-->

# India Modules — Coming Soon Sources (Government Data Catalogue)

**File path:** `research/india-modules-coming-soon-sources-2026-04-25.md`
**Date compiled:** 25 April 2026
**Author:** Research team for ForThePeople.in (India-level aggregate dashboard)

## Purpose

This document catalogues verified, first-party Government of India data sources for four "Coming Soon" modules — National Economy, Parliament & Budget, Agriculture (national), and Health (national) — on the ForThePeople.in India-level aggregate dashboard. Every URL listed below was checked against the live portal on or around 23–25 April 2026. Sources are strictly limited to `.gov.in`, `.nic.in`, Reserve Bank of India, and autonomous bodies funded / designated by Government of India (e.g., IIPS as NFHS nodal agency). Where a commonly-cited source is *not* a government body (e.g., PRS Legislative Research), it is explicitly flagged and excluded from the MVP.

This file is for research only — no code has been changed and nothing has been committed. It is designed to be the canonical reference file Jayanth can hand to Claude Code when scoping build prompts for each module.

---

## Summary Table — All Four Modules

| # | Module | MVP Data Points | Full Inventory | API Availability | Primary Portal(s) |
|---|--------|-----------------|----------------|------------------|-------------------|
| 1 | National Economy | 7 | 18 | ~55% (RBI DBIE download; data.gov.in JSON; MoSPI eSankhyiki JSON; rest PDF / HTML tables) | mospi.gov.in, rbi.org.in / dbie.rbi.org.in, cga.nic.in, tradestat.commerce.gov.in, eaindustry.nic.in |
| 2 | Parliament & Budget | 7 | 17 | ~20% (indiabudget.gov.in PDFs, sansad.in HTML + PDF, eci.gov.in JSON internally via Next.js, cag.gov.in PDFs) | sansad.in, indiabudget.gov.in, cag.gov.in, eci.gov.in |
| 3 | Agriculture (National) | 7 | 18 | ~40% (Agmarknet via data.gov.in JSON; upag.gov.in dashboard; IMD / eNAM HTML; APEDA HTML; PM-KISAN HTML) | agmarknet.gov.in / data.gov.in, upag.gov.in, imd.gov.in, pmkisan.gov.in, fert.nic.in, cacp.dacnet.nic.in, apeda.gov.in |
| 4 | Health (National) | 7 | 18 | ~30% (PMJAY dashboard JSON endpoints via browser; data.gov.in CSV for NFHS; most NMC/NPPA/IDSP are PDF) | pmjay.gov.in, hmis.nhp.gov.in, mohfw.gov.in, idsp.mohfw.gov.in / ihip.nhp.gov.in, nmc.org.in, nppa.gov.in, nfhsiips.in |

**Overall API availability across the whole four-module build-out is ~35%.** The remaining ~65% of data points require scraping (HTML tables, PDF parsing) or manual download. The single biggest API wins are `data.gov.in` (OGD platform, REST JSON, documented below) and the MoSPI **eSankhyiki** portal, which exposes time-series macro indicators (GDP, CPI, IIP, PLFS) with API-sharing built in. [[data.gov.in APIs]](https://www.data.gov.in/apis) [[eSankhyiki MoSPI]](https://esankhyiki.mospi.gov.in/)

---

## Module 1: National Economy

### MVP data points (7 items for first launch)

- **Quarterly GDP growth + sectoral GVA (agriculture / industry / services)** — Source: MoSPI Press Release — URL: https://www.mospi.gov.in/press-release — API: partial (eSankhyiki JSON export for NAS time series) — Refresh: quarterly (Q1 end-August, Q2 end-November, Q3 end-February, Q4/Annual end-May) — Format: PDF press note + esankhyiki JSON/CSV. Latest: Q3 FY26 released 27 Feb 2026, real GDP growth 7.8% Y-o-Y. [[MoSPI Q3 FY26 press note]](https://www.mospi.gov.in/uploads/latestReleases/latest_release_1772189865181_f040336d-bc57-4aed-b80f-586d9ccb279e_Press_Note_on_New_Series_of_GDP_Estimates_with_Base_Year_2022-23_27022026.pdf) [[eSankhyiki NAS]](https://esankhyiki.mospi.gov.in/macroindicators?product=nas)

- **CPI headline + CFPI (food) inflation** — Source: MoSPI (NSO) CPI Division — URL: https://cpi.mospi.gov.in/ — API: partial (eSankhyiki CPI time series JSON) — Refresh: monthly (12th of each month, embargoed 4 pm) — Format: PDF press note + CSV. Base updated to 2024=100 effective Jan 2026 release. [[CPI January 2026 press note]](https://www.mospi.gov.in/uploads/latestReleases/latest_release_1770891893893_6b458c0a-c327-4fef-a554-41131ea67273_Press_Relase_of_CPI_for_Jan26.pdf)

- **WPI (Wholesale Price Index) + WPI Food Index** — Source: Office of Economic Adviser, DPIIT, Ministry of Commerce & Industry — URL: https://eaindustry.nic.in/ — API: no (HTML tables + PDF press release) — Refresh: monthly (14th of every month, or next working day) — Format: HTML table + PDF + CSV downloadable. Base 2011-12; DPIIT is in process of base revision. [[eaindustry.nic.in]](https://eaindustry.nic.in/) [[WPI October 2025 PIB release]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2189914&reg=3&lang=2)

- **Unemployment rate / LFPR / WPR (monthly CWS)** — Source: MoSPI PLFS Monthly Bulletin — URL: https://www.mospi.gov.in/press-release (search "Periodic Labour Force Survey") — API: partial (eSankhyiki PLFS series JSON) — Refresh: monthly (15th, since April 2025 revamped sample design) — Format: PDF press note + Excel. Jan 2026: overall UR 4.8% (CWS), LFPR 55.9%. [[PLFS Jan 2026]](https://www.mospi.gov.in/uploads/latestReleases/latest_release_1771238931793_de83f41f-e1c3-4581-a99b-3432ee80881c_Monthly_Press_note_January_2026.pdf) [[PLFS methodology change note]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2128662)

- **Merchandise + Services Trade (monthly exports / imports / balance)** — Source: Department of Commerce / DGCI&S — URL: https://tradestat.commerce.gov.in/ and https://www.commerce.gov.in/trade-statistics/ — API: no (HTML query builder + Excel download) — Refresh: monthly (quick estimates by 15th of following month; principal-commodity within 30 days; 8-digit HS within 60 days) — Format: HTML table + Excel. Coverage from FY 1997-98; monthly data from Jan 2007. [[TRADESTAT portal]](https://tradestat.commerce.gov.in/) [[DGCI&S methodology]](https://www.dgciskol.gov.in/foreign_trade_statistics.aspx)

- **Central Government fiscal deficit (monthly, cumulative)** — Source: Controller General of Accounts (CGA), Ministry of Finance — URL: https://cga.nic.in/MonthDashboardReport/Published/list.aspx — API: no (HTML dashboard + Excel download) — Refresh: monthly (end of month following the reference month) — Format: HTML dashboard + Excel. Coverage since April 2015; user can drill down by FY and month. [[CGA Monthly Accounts Dashboard]](https://cga.nic.in/MonthDashboardReport/Published/list.aspx)

- **Repo rate / Reverse repo / CRR / SLR / Bank Rate / MSF / SDF** — Source: Reserve Bank of India — URL: https://www.rbi.org.in/ (Monetary Policy section) and https://data.rbi.org.in/DBIE/ — API: partial (DBIE has download-all in CSV/XLS; no public REST API with key) — Refresh: every MPC cycle (~bi-monthly) for rates, weekly for liquidity — Format: HTML + PDF MPC resolutions + Excel/CSV from DBIE. Current as of 5 Dec 2025 MPC: repo 5.25%, SDF 5.00%, MSF/Bank Rate 5.50%, CRR 3.00%, SLR 18.00%. [[RBI Homepage]](https://www.rbi.org.in/) [[RBI DBIE]](https://data.rbi.org.in/DBIE/)

### Full data inventory (18 items for full build-out)

In addition to the 7 MVP items above:

- **Index of Industrial Production (IIP)** — Source: MoSPI — URL: https://esankhyiki.mospi.gov.in/macroindicators?product=iip — API: yes (eSankhyiki time-series export) — Refresh: monthly (28th, one-month lag) — Format: JSON / CSV / PDF press note. Base 2011-12; new base 2022-23 scheduled for May 2026. [[eSankhyiki IIP]](https://esankhyiki.mospi.gov.in/macroindicators?product=iip)

- **Annual Survey of Industries (ASI)** — Source: MoSPI — URL: https://esankhyiki.mospi.gov.in/macroindicators-main — API: yes (eSankhyiki) — Refresh: annual — Format: CSV / JSON.

- **Forex Reserves (weekly)** — Source: RBI Weekly Statistical Supplement — URL: https://www.rbi.org.in/scripts/WSSViewDetail.aspx?TYPE=Section&PARAM1=1 — API: no (PDF; data also in DBIE) — Refresh: weekly (Friday release for week ending previous Friday) — Format: PDF + DBIE CSV/XLS. [[RBI WSS]](https://rbi.org.in/Scripts/BS_ViewWSS.aspx)

- **Money supply (M0, M1, M3)** — Source: RBI DBIE — URL: https://data.rbi.org.in/DBIE/ (Financial Sector → Monetary aggregates) — API: partial — Refresh: fortnightly / monthly — Format: CSV / XLS.

- **Balance of Payments (BoP) / Current Account Deficit** — Source: RBI DBIE (External Sector → BoP) + RBI Press Release — URL: https://www.rbi.org.in/Scripts/Statistics.aspx — API: partial (DBIE export) — Refresh: quarterly (end-September for Q1, etc., typically ~3-month lag) — Format: CSV / PDF.

- **RBI Financial Stability Report / Report on Trend & Progress of Banking** — Source: RBI — URL: https://www.rbi.org.in/ (Publications) — API: no — Refresh: half-yearly (FSR) / annual (TPB) — Format: PDF.

- **Central / State Tax Revenue (GST / direct tax, monthly)** — Source: CGA Monthly Accounts + PIB GST collections press notes — URL: https://cga.nic.in/MonthlyReport/ — API: no — Refresh: monthly — Format: HTML / Excel.

- **Budget Documents (Annual Financial Statement, Receipt Budget, Expenditure Budget Vols I & II)** — Source: Department of Economic Affairs — URL: https://www.indiabudget.gov.in/ — API: no (static PDFs / Excel) — Refresh: annual (1 February) — Format: PDF + Excel. [[Budget 2026-27 Key Features]](https://www.indiabudget.gov.in/doc/bh1.pdf)

- **SEBI Monthly Bulletin (market statistics)** — Source: SEBI — URL: https://www.sebi.gov.in/reports-and-statistics/publications.html — API: no (HTML + Excel + PDF annexures) — Refresh: monthly (~45-day lag) — Format: Excel + PDF. Contains aggregate NSE / BSE turnover, IPO data, FII/FPI flows. [[SEBI Publications]](https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=4&ssid=80) [[SEBI Bulletin Nov 2025]](https://www.sebi.gov.in/reports-and-statistics/publications/dec-2025/sebi-bulletin-november-2025_98217.html)

- **Per-capita income / GNI / savings / capital formation** — Source: MoSPI NAS / PE / FRE — URL: https://esankhyiki.mospi.gov.in/macroindicators?product=nas — API: yes — Refresh: annual (Feb) + quarterly — Format: CSV / JSON.

- **Consumer Confidence Survey (RBI)** — Source: RBI — URL: https://www.rbi.org.in/ (Publications → Monthly / bi-monthly Press Releases) — API: no — Refresh: bi-monthly — Format: PDF + Excel table in DBIE.

### Scraping strategy

- **Portals with public API (preferred):** `data.gov.in` (OGD, REST JSON with API key — documented below); `esankhyiki.mospi.gov.in` (macro-indicators module has built-in "API share" for NAS, CPI, IIP, PLFS, ASI).
- **Portals needing scrape (rate limit 1 req / 2-3 sec):** `eaindustry.nic.in` (WPI item indices — query form + HTML table); `tradestat.commerce.gov.in` (DGCI&S — query builder, session-based, heavy JS; use headless browser with waits); `cga.nic.in` (monthly accounts — HTML tables + Excel export hyperlinks); `cpi.mospi.gov.in` (time-series tables — HTML). Recommend a courteous User-Agent string and a per-module cache (monthly TTL for WPI/CPI/PLFS, quarterly for GDP, weekly for WSS).
- **Portals with download-only data (PDF / Excel):** `indiabudget.gov.in` (all budget docs are PDFs + a handful of Excels); `sebi.gov.in` monthly bulletins (Excel + PDF annex); RBI Monetary Policy resolutions (PDF); RBI FSR and Trend & Progress (PDF). Use `pdfplumber` or `camelot` for table extraction.

### Legal status

- **Confirmed under NDSAP:** yes — MoSPI CPI/IIP/NAS/PLFS/ASI catalogues, DGCI&S trade statistics mirrored on data.gov.in, WPI on data.gov.in, and CGA monthly accounts are all "Released Under: National Data Sharing and Accessibility Policy (NDSAP)". [[NDSAP summary]](https://dst.gov.in/national-data-sharing-and-accessibility-policy-0) [[WPI on data.gov.in]](https://www.data.gov.in/catalog/wholesale-price-index-1)
- **Copyright Act §52(1)(q) applicability:** yes — "Government work" is owned by Government (§17(d)), and §52(1)(q) permits reproduction of Government-published Acts, reports, committee reports and judgments without infringement. Statistical releases by MoSPI, CGA, DPIIT and RBI fall under "Government work"; the derivative NDSAP release additionally waives redistribution restrictions subject to attribution. [[Copyright Act §52]](https://indiankanoon.org/doc/1013176/)
- **Attribution requirements per portal:** RBI DBIE states "user can use the data for their research work with courtesy to the Database on Indian Economy, Reserve Bank of India." MoSPI/eSankhyiki datasets require attribution as "Source: Ministry of Statistics and Programme Implementation, GoI." Data.gov.in uses the **Government Open Data License – India** (Gazette, Feb 2017) which mandates clear attribution and no misrepresentation. [[DBIE description]](https://www.re3data.org/repository/r3d100010992)

### Known gaps / caveats

- **GDP / NAS base-year revision underway:** New series with base year 2022-23 was released 27 Feb 2026 and is not yet "back-series" completed (back series expected Dec 2026). Old series (2011-12) figures and new series are **not directly comparable**; flag any chart that bridges the cutover. [[MoSPI Feb 2026 PE press note]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2233518&reg=3&lang=1)
- **CPI base year change:** From Jan 2026 release onwards, CPI is on 2024=100 base. Older figures (2012=100 base) need linking-factor adjustment.
- **WPI base revision pending:** Still on 2011-12; new base 2022-23 in progress (no release date yet).
- **PLFS sample design revamp Jan 2025:** Monthly bulletins from April 2025 onwards use a new rotational-panel design and are **not comparable** to pre-2025 quarterly/annual PLFS. Flag this in any time-series chart. [[PLFS Changes in 2025 note]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2128662)
- **No free real-time NSE / BSE index feed from a government source.** SEBI publishes aggregate indices only in the monthly bulletin (one-month lag). Scraping NSE/BSE directly is **outside the gov-only constraint** and violates exchange licensing (SEBI-regulated). For MVP, show NIFTY 50 / SENSEX **daily close** from SEBI Monthly Bulletin Excel with the explicit caveat "previous-month data; next update on <NEXT_RELEASE_DATE>."
- **TRADESTAT data lags ~1 quarter** for 8-digit HS detail; quick estimates are 15-day lag but revised.
- **CGA dashboard shows progressive data, not year-over-year delta natively** — compute deltas client-side.
- **RBI does not publish a documented public REST API**; DBIE offers CSV/XLS downloads and the RBIDATA mobile app but no programmatic endpoint. Expect to write scheduled download jobs.

---

## Module 2: Parliament & Budget

### MVP data points (7 items for first launch)

- **Lok Sabha MP attendance (session-wise / member-wise)** — Source: Digital Sansad (Lok Sabha) — URL: https://sansad.in/ls/members/attendance (and equivalent `/rs/members/attendance` for Rajya Sabha) — API: no (HTML, JavaScript-rendered React-style tables) — Refresh: session-wise (attendance published after each sitting) — Format: HTML + downloadable PDF per session. [[Rajya Sabha attendance]](https://sansad.in/rs/members/attendance)

- **Parliamentary Questions (Starred / Unstarred) by MP + ministry** — Source: Digital Sansad — URL: https://sansad.in/ls/questions/questions-and-answers and https://sansad.in/rs/questions/questions-and-answers — API: no (HTML; filter by session, ministry, member) — Refresh: session-wise, near real-time during sessions — Format: HTML + PDF attachment per question.

- **Bills — introduced, passed, pending** — Source: Digital Sansad — URL: https://sansad.in/ls/legislation/bills (LS) and https://sansad.in/rs/legislation/bills (RS) — API: no (HTML filter by Introduced / Passed / In Committee) — Refresh: session-wise — Format: HTML + PDF for each bill (including draft, introduced, amended and Act texts). Also aggregated on Ministry of Parliamentary Affairs: https://mpa.gov.in/bills-list. [[MPA Bills list]](https://mpa.gov.in/bills-list)

- **Parliamentary Standing / Select Committee Reports** — Source: Digital Sansad + eParliament Library — URL: https://sansad.in/ls/committee/subjects-reports and https://eparlib.sansad.in/handle/123456789/13 — API: no (PDF download) — Refresh: session-wise — Format: PDF.

- **Union Budget — Demands for Grants (ministry-wise, scheme-wise)** — Source: Ministry of Finance — URL: https://www.indiabudget.gov.in/ — API: no — Refresh: annual (1 February) + Supplementary Demands during session — Format: PDF + Excel for some statements. Budget 2026-27 has 102 Demands for Grants. [[Key to Budget Documents 2026-27]](https://www.indiabudget.gov.in/doc/Key_to_Budget_Document_2026.pdf)

- **CAG Audit Reports (Union / State / PSU / Compliance / Performance)** — Source: Comptroller & Auditor General — URL: https://cag.gov.in/en/audit-report — API: no (HTML list + PDF per report) — Refresh: rolling (tabled in Parliament / State legislatures; multiple per year) — Format: PDF. [[CAG Audit Reports]](https://cag.gov.in/en/audit-report)

- **Election Commission results (Lok Sabha / Assembly, constituency-wise)** — Source: Election Commission of India — URL: https://results.eci.gov.in/ and https://www.eci.gov.in/statistical-reports — API: partial (results site is a Next.js app with internal JSON endpoints of form `https://results.eci.gov.in/PcResultGenJune2024/ConstituencywiseS<state-code><constituency-no>.htm` returning static fragments; the official archive at `www.eci.gov.in/statistical-reports` is PDF) — Refresh: counting-day real-time, then static archive — Format: HTML + downloadable "Statistical Reports" PDF/Excel per election. [[ECI Statistical Reports]](https://www.eci.gov.in/statistical-reports) [[ECI GE Lok Sabha 2024]](https://www.eci.gov.in/general-election-to-loksabha-2024-statistical-reports)

### Full data inventory (17 items for full build-out)

In addition to the 7 MVP items:

- **Candidate affidavits (assets / liabilities / criminal cases)** — Source: ECI Affidavit Portal — URL: https://affidavit.eci.gov.in/ — API: no (HTML search + PDF download) — Refresh: per election — Format: PDF affidavit per candidate. [[ECI Affidavit Portal]](https://www.eci.gov.in/affidavit-portal)

- **Electoral rolls (voter count, EP ratio)** — Source: ECI Voters' Services Portal — URL: https://voters.eci.gov.in/ and https://electoralsearch.eci.gov.in/ — API: no — Refresh: continuous updation; Special Summary Revision annually — Format: HTML search; aggregated state/UT rolls published as PDF / Excel.

- **Party expenditure reports (Contributions / Election-expenditure)** — Source: ECI — URL: https://www.eci.gov.in/ (Political Parties → Contribution Reports / Expenditure Reports) — API: no — Refresh: annual (contribution) + per-election (expenditure) — Format: PDF.

- **Budget at a Glance, Macro-economic Framework Statement, Medium-Term Fiscal Policy Statement** — Source: MoF — URL: https://www.indiabudget.gov.in/ — API: no — Refresh: annual — Format: PDF.

- **Expenditure Profile (Central Sector / Centrally Sponsored Schemes with SNA balances)** — Source: MoF — URL: https://www.indiabudget.gov.in/doc/eb/vol1.pdf — API: no — Refresh: annual — Format: PDF. [[Expenditure Profile 2026-27]](https://www.indiabudget.gov.in/doc/eb/vol1.pdf)

- **Finance Bill (direct / indirect tax changes)** — Source: MoF — URL: https://www.indiabudget.gov.in/ — API: no — Refresh: annual — Format: PDF.

- **Economic Survey (volumes I & II, statistical annexure)** — Source: MoF — URL: https://www.indiabudget.gov.in/economicsurvey/ — API: no — Refresh: annual (day before Budget) — Format: PDF + Excel (annexure).

- **Lok Sabha / Rajya Sabha Debates (verbatim proceedings / uncorrected debates)** — Source: eParliament Digital Library + Digital Sansad — URL: https://eparlib.sansad.in/ and https://sansad.in/ls/legislation/bills (debates linked) — API: no — Refresh: session-wise (uncorrected within 24h; corrected weekly) — Format: PDF per sitting. [[Parliament Digital Library]](https://eparlib.sansad.in/)

- **Ministry-wise written answers to Parliamentary Questions** (with attachment PDFs) — Source: Digital Sansad + Ministry portals (e.g., MHA's https://www.mha.gov.in/MHA1/Par2017/PArQueAnsPage-new.html) — Refresh: session-wise — Format: PDF/HTML.

- **Public Accounts Committee (PAC) Reports** — Source: eParliament Library — URL: https://eparlib.sansad.in/handle/123456789/13 — Refresh: session-wise — Format: PDF.

### Scraping strategy

- **Portals with public API (preferred):** None are fully open, but ECI results pages use predictable URL templates (`results.eci.gov.in/<ElectionType><Month><Year>/ConstituencywiseS<state_code><constituency_no>.htm`) which return parseable static HTML after the election — treat as a pseudo-API with a known URL pattern. There is a publicly-accessible reverse-engineered archival dataset of Parliamentary Elections 2024 on `data.opencity.in` (civic-society mirror; **not government**, so do NOT use as primary — use as a cross-check only).
- **Portals needing scrape (rate limit 1 req / 2-3 sec):** `sansad.in` (attendance, questions, bills, committees — all HTML; expect JS-rendered filters; a headless browser is needed for the attendance grid). Respect `robots.txt`.
- **Portals with download-only data (PDF / Excel):** `indiabudget.gov.in` (all Budget volumes are PDFs; Excel only for Demands summary); `cag.gov.in` (100% PDF reports); `affidavit.eci.gov.in` (PDF per candidate).

### Legal status

- **Confirmed under NDSAP:** partial — CAG State Audit Reports are explicitly published under NDSAP on data.gov.in. [[CAG State Audit Reports data.gov.in]](https://www.data.gov.in/catalog/cag-state-audit-reports) Budget documents, Parliament proceedings, Bills and ECI statistical reports are Government works governed by the Copyright Act.
- **Copyright Act §52(1)(q):** yes — Bills, Acts, Gazette notifications, Parliamentary reports/proceedings, and reports of Committees/Commissions (including CAG) are expressly reproducible without infringement under §52(1)(q)(i)-(iv). §52(1)(r) also permits reproduction of judgments or orders. ECI results are Government works. [[Copyright Act §52 text]](https://indiankanoon.org/doc/1013176/)
- **Attribution requirements:** ECI explicitly requires attribution "Source: Election Commission of India" on its Statistical Reports. CAG reports carry a standard government copyright line but are freely reproducible under §52(1)(q).
- **PRS Legislative Research (prsindia.org) — NOT government:** Per the task constraints, PRS is a think tank (Institute for Policy Research Studies) and is NOT to be used as a primary source, even though its Bill Track, MP Track and Vital Stats are widely cited. [[PRS Bills Track]](https://prsindia.org/billtrack) Use sansad.in / indiabudget.gov.in / cag.gov.in / eci.gov.in exclusively.

### Known gaps / caveats

- **Sansad.in attendance tables are inconsistent** across sessions — some older sessions (pre-2019) show PDFs instead of searchable tables. Attendance is voluntary-sign-based ("A member is considered present if he signs the attendance register"), so absolute numbers under-report ministers and Speakers, who are exempt.
- **Bill status lacks a machine-readable "stage" field.** Build the state machine yourself from the presence/absence of "Introduced", "Passed in LS", "Passed in RS", "Assented" markers in the HTML.
- **ECI affidavit PDFs are scanned OCR-quality images for pre-2019 candidates** — text extraction may be noisy.
- **ECI Statistical Reports are typically released 6-12 months after an election.** For near-real-time, rely on the results.eci.gov.in constituency pages.
- **CAG reports are retrospective** (2-3 year lag typical) — a "Report of 2026" often covers expenditure up to March 2024. Flag the reporting period explicitly.
- **Budget numbers are Revised Estimates vs Budget Estimates vs Actuals** — CGA Monthly Accounts give provisional actuals; final actuals come in the following year's budget "Statement I - Actuals." Do not conflate RE with Actuals.
- **PRSIndia is frequently the de facto source** for MP performance statistics cited in the media. Do not use it for ForThePeople. Instead derive equivalents by scraping `sansad.in` questions and attendance directly.

---

## Module 3: Agriculture (National)

### MVP data points (7 items for first launch)

- **Daily mandi prices (min / max / modal) — all commodities, all markets** — Source: AGMARKNET (Directorate of Marketing & Inspection) via Ministry of Agriculture & Farmers Welfare — URL: https://agmarknet.gov.in/ and https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi — API: **yes** (data.gov.in REST JSON, resource ID `9ef84268-d588-465a-a308-a864a43d0070` via `https://api.data.gov.in/resource/<id>?api-key=<key>&format=json`) — Refresh: daily (4367 mandis integrated as of Nov 2025 after AGMARKNET 2.0 upgrade) — Format: JSON / CSV / XML. Also displayed on https://enam.gov.in/web/dashboard/agmarknet. [[AGMARKNET data.gov.in catalogue]](https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi) [[AGMARKNET 2.0 PIB note]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2204750&reg=3&lang=1)

- **MSP notifications (Minimum Support Price for 22-23 crops)** — Source: Commission for Agricultural Costs & Prices (CACP), DA&FW — URL: https://cacp.dacnet.nic.in/ (also mirrored on https://eands.dacnet.nic.in/MSP.htm) — API: no (static HTML / PDF per year's Price Policy Report) — Refresh: bi-annual (before Kharif in May/June; before Rabi in September/October) — Format: HTML tables + PDF Price Policy Reports. Current: 7 cereals, 5 pulses, 7 oilseeds, 4 commercial crops. [[CACP home]](https://cacp.dacnet.nic.in/) [[CACP organisation & role]](https://cacp.dacnet.nic.in/content.aspx?pid=32)

- **Monsoon rainfall deviation (subdivision-wise / district-wise, daily + cumulative)** — Source: India Meteorological Department (IMD) Hydromet Division — URL: https://mausam.imd.gov.in/imd_latest/contents/rainfall_statistics_3.php and https://mausam.imd.gov.in/imd_latest/contents/rainfall_time_series.php — API: no (HTML + map images) — Refresh: daily during monsoon (1 June–30 September); weekly summaries — Format: HTML table + PDF subdivision report. IMD Data Service Portal (https://dsp.imdpune.gov.in/) requires account registration for bulk historic download. [[IMD District rainfall]](https://mausam.imd.gov.in/imd_latest/contents/rainfall_statistics_3.php) [[IMD DSP]](https://dsp.imdpune.gov.in/)

- **National crop production estimates (Kharif / Rabi, Advance Estimates I–IV + Final)** — Source: Directorate of Economics & Statistics (DES), DA&FW — URL: https://desagri.gov.in/ and https://upag.gov.in/ (Unified Portal for Agricultural Statistics) — API: partial (upag.gov.in has "plug-and-play" dashboard with export) — Refresh: four advance estimates per year (Sept, Feb, May, Aug) + final — Format: PDF press note + CSV / PDF from UPAg. Second AE for 2025-26 released ~Feb 2026: Kharif foodgrain 1741.44 LMT (record). [[Second AE 2025-26 PIB]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2237560&reg=3&lang=2) [[UPAg portal]](https://www.upag.gov.in/) [[DES methodology]](https://desagri.gov.in/divisions-cell/agricultural-statistics-division/)

- **PM-KISAN beneficiaries — national / state / village counts + instalment disbursement** — Source: PM-KISAN Samman Nidhi portal (DA&FW) — URL: https://pmkisan.gov.in/rpt_beneficiarystatus_pub.aspx and https://www.data.gov.in/catalog/village-and-gender-wise-beneficiaries-count-under-pm-kisan-scheme — API: partial (data.gov.in catalogue has CSV/JSON; live counts only via HTML) — Refresh: rolling; each instalment is tri-annual (Apr, Aug, Dec) — Format: HTML + CSV / JSON. [[PM-KISAN beneficiary status]](https://pmkisan.gov.in/rpt_beneficiarystatus_pub.aspx)

- **Agriculture exports (commodity-wise, country-wise, port-wise)** — Source: APEDA Agri Exchange (Ministry of Commerce) — URL: https://agriexchange.apeda.gov.in/India/ExportAnalyticalReport/Index (and related `ExportSummary`, `IndiaExportStatistics` endpoints) — API: no (HTML + Excel download after query) — Refresh: monthly (DGCI&S-sourced, ~1-month lag) — Format: HTML query result + CSV/Excel export. FY 2025-26 agri exports US$52.55 bn. [[APEDA Agri Exchange]](https://agriexchange.apeda.gov.in/) [[APEDA home note]](https://apeda.gov.in/)

- **Fertilizer subsidy payouts + retailer sales (monthly)** — Source: Department of Fertilizers iFMS — URL: https://ifms.dbtfert.nic.in/portal/iFMSportal and https://www.fert.nic.in/dbt — API: no (HTML dashboards with counters) — Refresh: near real-time PoS-captured; aggregated monthly — Format: HTML dashboard + downloadable reports. Key counters: retailers, wholesalers, fertilizer companies, retail sales quantity. [[iFMS dashboard]](https://ifms.dbtfert.nic.in/portal/iFMSportal) [[DBT in Fertilizers overview]](https://www.fert.nic.in/dbt)

### Full data inventory (18 items for full build-out)

In addition to the 7 MVP items:

- **Horticulture production estimates** — Source: National Horticulture Board + DA&FW — URL: https://desagri.gov.in/ — API: partial via UPAg — Refresh: 1st + 2nd + 3rd estimates annually — Format: PDF + CSV.

- **Livestock Census + milk / egg / fish production** — Source: Department of Animal Husbandry & Dairying — URL: https://dahd.nic.in/ (and data.gov.in mirrors) — API: partial — Refresh: 5-yearly (Livestock Census); annual (Basic Animal Husbandry Statistics) — Format: PDF + Excel.

- **Agricultural Statistics at a Glance (annual compendium)** — Source: DES — URL: https://desagri.gov.in/ — API: no — Refresh: annual — Format: PDF. [[ASG 2022]](https://desagri.gov.in/wp-content/uploads/2023/05/Agricultural-Statistics-at-a-Glance-2022.pdf)

- **Kisan Credit Card accounts + amount sanctioned (agency-wise, state-wise)** — Source: DA&FW + NABARD + RBI — URL: https://www.data.gov.in/resource/year-wise-details-kisan-credit-card-kcc-accounts-farmers-who-have-been-issued-kcc-2014-15 — API: no (Rajya Sabha questions-sourced dataset; CSV only) — Refresh: annual — Format: CSV on OGD. [[KCC data.gov.in resource]](https://www.data.gov.in/resource/year-wise-details-kisan-credit-card-kcc-accounts-farmers-who-have-been-issued-kcc-2014-15) [[NABARD DoR]](https://www.nabard.org/contentsearch.aspx?AID=91&Key=Financial)

- **e-NAM trade volumes + registrations** — Source: National Agricultural Market — URL: https://www.enam.gov.in/web/dashboard/agmarknet — API: no (HTML counters) — Refresh: daily — Format: HTML dashboard. 1522 mandis onboarded as of latest PIB release.

- **Soil Health Card database** — Source: DA&FW — URL: https://soilhealth.dac.gov.in/ — API: partial (data.gov.in has historical SHC dataset) — Refresh: campaign-cycle — Format: HTML + CSV.

- **Crop insurance (PMFBY) claims / farmers enrolled** — Source: PMFBY portal, DA&FW — URL: https://pmfby.gov.in/ — API: no — Refresh: seasonal — Format: HTML + PDF state reports.

- **Irrigation — Pradhan Mantri Krishi Sinchai Yojana (PMKSY)** — Source: Ministry of Jal Shakti — URL: https://pmksy.gov.in/ — API: no — Refresh: quarterly — Format: PDF + HTML.

- **Seasonal and Monthly Long-Range Forecast (IMD)** — Source: IMD — URL: https://www.imdpune.gov.in/ and https://mausam.imd.gov.in/responsive/monsooninformation.php — API: no — Refresh: bi-annual (April + end-May for SW monsoon; September for NE monsoon) — Format: PDF press release. [[IMD Monsoon Information]](https://mausam.imd.gov.in/responsive/monsooninformation.php)

- **Food procurement by FCI (rice / wheat, KMS / RMS)** — Source: Food Corporation of India / Department of Food & Public Distribution — URL: https://fci.gov.in/ and https://dfpd.gov.in/ — API: no — Refresh: weekly during procurement season — Format: HTML + PDF.

- **Land records / crop-sown area (Digital Crop Survey)** — Source: DA&FW Digital Agriculture Mission — URL: referenced in PIB releases; DCS pilot covered 100% of UP, MP, Gujarat, Odisha by Kharif 2024 — API: not public — Refresh: season-wise — Format: aggregated only in PIB press notes as of writing.

### Scraping strategy

- **Portals with public API (preferred):** `data.gov.in` OGD JSON — the AGMARKNET daily mandi prices is the cleanest public REST endpoint across the four modules (NDSAP resource, updated every 24 h, free with API key). `upag.gov.in` offers API sharing for crop production time-series.
- **Portals needing scrape (rate limit 1 req / 2-3 sec):** `agmarknet.gov.in` v2.0 portal itself (historical data beyond the rolling window exposed by the API); `imd.gov.in` subdivision rainfall pages (HTML tables — use `pandas.read_html`); `agriexchange.apeda.gov.in` (POST-based query forms; session cookie required); `pmkisan.gov.in` beneficiary status (HTML per village; slow). IMD has **removed public access to the AWS/ARG real-time rainfall portal** as of May 2025 — flag this. [[IMD AWS lockup story]](https://www.downtoearth.org.in/climate-change/imd-locking-up-its-awsarg-data-portal-hampers-public-weather-alerts-experts)
- **Portals with download-only data (PDF / Excel):** CACP Price Policy Reports (PDFs); DES Advance Estimates (PDF + Excel annexure); NABARD refinance circulars (PDF); FCI procurement reports (PDF).

### Legal status

- **Confirmed under NDSAP:** yes — AGMARKNET daily mandi prices, PM-KISAN village/gender beneficiary counts, NFHS factsheets (cross-listed), and KCC accounts year-wise are all NDSAP-released on data.gov.in. [[AGMARKNET NDSAP catalogue]](https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi) [[PM-KISAN NDSAP catalogue]](https://www.data.gov.in/catalog/village-and-gender-wise-beneficiaries-count-under-pm-kisan-scheme)
- **Copyright Act §52(1)(q):** yes — DA&FW Advance Estimates press releases are Government works; CACP Price Policy Reports and IMD statistical bulletins are Government publications.
- **Attribution requirements:** data.gov.in license requires attribution "Source: Ministry of Agriculture & Farmers Welfare, Government of India" (or DGCI&S for APEDA trade data); IMD asks for "Source: India Meteorological Department"; APEDA Agri Exchange data-reuse requires explicit courtesy credit. AGMARKNET's NDSAP dataset is explicitly attributed to "Directorate of Marketing and Inspection (DMI)".

### Known gaps / caveats

- **Advance Estimates are revised 3–4 times** before the final figure — any chart must show which AE it is sourced from.
- **First AE (September) covers Kharif only;** do not mix Kharif + Rabi from the same release.
- **AGMARKNET's data.gov.in API default key** returns max 10 commodities per request; generate a personal key from data.gov.in for higher throughput. The API key is **required** and is issued after free signup at https://www.data.gov.in (Dashboard → My Account → Generate Key).
- **IMD AWS/ARG public portal was locked in May 2025** — hourly station-level rainfall is no longer publicly accessible. Use subdivision-level summaries on `mausam.imd.gov.in/imd_latest/contents/rainfall_statistics_3.php` for MVP.
- **IMD DSP (`dsp.imdpune.gov.in`)** requires account registration and charges non-MoES users for historical data access.
- **PM-KISAN village-list portal requires state/district/block/village drill-down** (no bulk national dump). Schedule scrape via Census 2011 village list (~664,000 villages) with 2-3 s delay — ~18 days of continuous polling. Alternative: use the data.gov.in NDSAP snapshot which is updated quarterly.
- **Fertilizer iFMS dashboard shows live counters but no time-series API** — snapshot daily and store locally to build history.
- **APEDA agri-exports data is DGCI&S-derived** and lags DGCI&S itself by ~2 weeks.
- **CACP's web layout is outdated** ("Website last updated on 09 Oct 2023" in the footer); Price Policy Reports are still being published in PDF annually despite the stale footer — verify via the PDF date, not the homepage timestamp.

---

## Module 4: Health (National)

### MVP data points (7 items for first launch)

- **Ayushman Bharat PM-JAY — Ayushman cards issued, hospital admissions, empanelled hospitals** — Source: National Health Authority Public Dashboard — URL: https://dashboard.pmjay.gov.in/publicdashboard (redirects to https://dashboard.nha.gov.in/public/) — API: partial (browser-side JSON endpoints power the widgets; no documented REST key) — Refresh: near real-time (rolled up daily) — Format: HTML dashboard with gender, age, state cuts. [[PM-JAY public dashboard revamp PIB]](https://pib.gov.in/PressReleasePage.aspx?PRID=1831575) [[NHA public dashboard]](https://dashboard.nha.gov.in/public/)

- **PMJAY empanelled hospital search (state, district, speciality)** — Source: NHA — URL: https://hospitals.pmjay.gov.in/Search/ — API: no (HTML form + result table) — Refresh: continuous (empanelment is rolling) — Format: HTML. [[Empanelled Hospital Search]](https://hospitals.pmjay.gov.in/Search/)

- **NHM / HMIS — maternal, child, immunisation outcomes by state / district / facility** — Source: Ministry of Health & Family Welfare HMIS (under NHM) — URL: https://hmis.nhp.gov.in/ (and https://hmis.mohfw.gov.in/) — API: no (login-walled for G2G facility data; **public dashboards & Standard Reports** are accessible without login) — Refresh: monthly (2.17 lakh facilities report monthly as of March 2022) — Format: HTML + Excel downloadable Standard Reports. Quarterly NHM MIS Report published at https://nhm.gov.in/ (Status as on 30.09.2025 is the latest). [[HMIS portal]](https://hmis.nhp.gov.in/) [[HMIS Brief PDF]](https://mohfw.gov.in/sites/default/files/HMIS%20Brief.pdf) [[NHM Quarterly MIS Reports]](https://nhm.gov.in/index4.php?lang=1&level=0&linkid=457&lid=686)

- **Integrated Disease Surveillance — Weekly Outbreaks Report** — Source: IDSP, Ministry of Health & Family Welfare — URL: https://idsp.mohfw.gov.in/ (Weekly Outbreaks at `index4.php?lang=1&level=0&linkid=406&lid=3689`) — API: no (PDF per week) — Refresh: weekly (Monday–Sunday reporting window; release early-next-week) — Format: PDF + HTML. Site last updated 21 April 2026. IDSP is migrating to **IHIP** (Integrated Health Information Platform) at https://ihip.nhp.gov.in/. [[IDSP Weekly Outbreaks]](https://idsp.mohfw.gov.in/index4.php?lang=1&level=0&linkid=406&lid=3689) [[IHIP home]](https://ihip.nhp.gov.in/)

- **NFHS-5 (2019-21) national / state / district factsheets** — Source: International Institute for Population Sciences (IIPS) — URL: https://www.nfhsiips.in/nfhsuser/nfhs5.php and OGD mirror https://www.data.gov.in/resource/all-india-and-stateut-wise-factsheets-national-family-health-survey-nfhs-5-2019-2021 — API: partial (data.gov.in CSV export) — Refresh: one-time per round (~5-year cycle) — Format: PDF factsheet per state/district + CSV on OGD. Note: IIPS is an autonomous institute under MoHFW; NFHS is funded and designated by MoHFW — qualifies as government-reliable. **NFHS-6 (2023-24)** fieldwork is complete but results are **not yet released** (as of April 2026). [[NFHS-5 IIPS]](https://www.nfhsiips.in/nfhsuser/nfhs5.php) [[NFHS-5 OGD factsheets]](https://www.data.gov.in/resource/all-india-and-stateut-wise-factsheets-national-family-health-survey-nfhs-5-2019-2021) [[NFHS-6 IIPS]](https://www.nfhsiips.in/nfhsuser/nfhs6.php)

- **Medical education seat matrix (MBBS, state / college-wise)** — Source: National Medical Commission (NMC) — URL: https://www.nmc.org.in/ (MBBS Seat Matrix PDF published ~annually) — API: no (PDF only) — Refresh: annual (for each Academic Year, e.g., 2025-26 matrix updated 16 October 2025) — Format: PDF. **NMC replaces the dissolved MCI (mciindia.org).** [[NMC MBBS Seat Matrix 16-10-2025]](https://www.nmc.org.in/MCIRest/open/getDocument?path=/Documents/Public/Portal/LatestNews/MBBS+seat+matrix.pdf) [[NMC College Search]](https://www.nmc.org.in/information-desk/college-and-course-search/)

- **NPPA drug ceiling prices + retail price notifications** — Source: National Pharmaceutical Pricing Authority — URL: https://nppa.gov.in/ (and https://nppaindia.nic.in/) — API: no (PDF Gazette notifications + S.O. list) — Refresh: per Authority meeting (~monthly; 143rd Authority meeting 27 Feb 2026; annual WPI-linked ceiling revision each April 1) — Format: PDF Gazette S.O. notifications. Latest 25 March 2026 batch revised 907 scheduled formulations with WPI adjustment of +0.64956%. NPPA has issued ceiling price to **928 scheduled formulations** and retail price to ~3,111 new drugs. [[NPPA home]](https://nppa.gov.in/) [[About NPPA]](https://nppa.gov.in/aboutnppa)

### Full data inventory (18 items for full build-out)

In addition to the 7 MVP items:

- **U-WIN immunisation / UIP coverage (pregnant women + children 0-16 registered, doses administered)** — Source: MoHFW — URL: https://uwin.mohfw.gov.in/ — API: no (login-walled for HCWs; citizen portal is HTML) — Refresh: near real-time; periodic aggregate press releases — Format: HTML + PIB aggregate counts. As of 25 Nov 2024: 7.43 crore beneficiaries registered, 27.77 crore doses recorded. [[U-WIN home]](https://uwin.mohfw.gov.in/home) [[U-WIN press release MoHFW]](https://www.mohfw.gov.in/?q=/press-info/7896)

- **Health Dynamics of India (formerly Rural Health Statistics) — SC / PHC / CHC / SDH / DH / MC beds + HR** — Source: MoHFW Statistics Division — URL: https://mohfw.gov.in/ (Documents) and data.gov.in mirror https://www.data.gov.in/dataset-group-name/Rural%20Health%20Statistics — API: no (PDF + Excel annexure) — Refresh: annual (report for year ending 31 March released following year; 2022-23 edition released ~mid-2024) — Format: PDF + data.gov.in CSV. [[Health Dynamics of India 2022-23 PIB]](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2053070) [[Rural Health Statistics dataset group]](https://www.data.gov.in/dataset-group-name/Rural%20Health%20Statistics)

- **Number of government hospitals & beds (rural / urban, state-wise)** — Source: MoHFW on data.gov.in — URL: https://www.data.gov.in/catalog/number-government-hospitals-and-beds-rural-and-urban-areas — API: partial — Refresh: annual — Format: CSV.

- **NHM State Programme Implementation Plan (PIP) approvals + funds released** — Source: NHM — URL: https://www.nhm.gov.in/ (Reports & Publications) — API: no — Refresh: annual — Format: PDF.

- **Mission Indradhanush / Intensified MI (immunisation coverage)** — Source: MoHFW — URL: https://www.nhm.gov.in/ and state NHM portals — API: no — Refresh: campaign-cycle — Format: PDF.

- **National Sample Registration System (SRS) — Infant Mortality, Crude Birth/Death Rates** — Source: Office of the Registrar General of India — URL: https://censusindia.gov.in/ (Vital Statistics) — API: no — Refresh: annual — Format: PDF.

- **ICMR Diet and Biomarkers Survey in India (DABS-I)** — Source: ICMR — URL: https://www.icmr.gov.in/ — API: no — Refresh: one-time (fieldwork ongoing 2024-25) — Format: PDF upon release. Replaces NFHS-6 anaemia component.

- **National TB Elimination Programme (Ni-kshay) — case notifications** — Source: Central TB Division, MoHFW — URL: https://tbcindia.gov.in/ and https://www.nikshay.in/ — API: no (Ni-kshay login-walled; aggregate in annual TB India Report) — Refresh: quarterly / annual — Format: PDF + HTML.

- **HIV / AIDS — NACO sentinel surveillance** — Source: NACO, MoHFW — URL: https://naco.gov.in/ — API: no — Refresh: bi-annual (sentinel); annual (HIV Estimates) — Format: PDF.

- **Ayushman Bharat Health & Wellness Centres (AB-HWCs) operationalisation count** — Source: NHM — URL: https://ab-hwc.nhp.gov.in/ — API: no — Refresh: near real-time count; aggregated monthly — Format: HTML dashboard.

- **Cause of Death Statistics (Medical Certification of Cause of Death)** — Source: Office of RGI — URL: https://censusindia.gov.in/ — API: no — Refresh: annual (~2-year lag) — Format: PDF.

### Scraping strategy

- **Portals with public API (preferred):** `data.gov.in` OGD JSON (NFHS-5 factsheets, Rural Health Statistics snapshots, PM-KISAN cross-listed). NHA PMJAY public dashboard uses internal JSON endpoints (undocumented) — reverse-engineer responsibly.
- **Portals needing scrape (rate limit 1 req / 2-3 sec):** `hospitals.pmjay.gov.in/Search/` (district drill-down); `hmis.nhp.gov.in` Standard Reports (click-through HTML); `u-win.mohfw.gov.in/home` citizen site (no bulk API — aggregate only via PIB periodic releases); NMC `College and Course Search` (`/information-desk/college-and-course-search/` — JS table, use headless browser).
- **Portals with download-only data (PDF / Excel):** IDSP Weekly Outbreaks (PDF per week — schedule weekly fetch on Tuesday morning); NPPA S.O. Gazette notifications (PDF — parse with pdfplumber); NMC MBBS Seat Matrix (annual PDF); Health Dynamics of India (annual PDF + Excel annexure).

### Legal status

- **Confirmed under NDSAP:** yes — NFHS-5 All-India factsheets, Rural Health Statistics, Number of Government Hospitals & Beds, and AGMARKNET (cross-cutting) are NDSAP-released on data.gov.in. PMJAY dashboard data is not formally NDSAP-listed but is a public-facing NHA product.
- **Copyright Act §52(1)(q):** yes — MoHFW / NHM / IDSP / NMC / NPPA publications are Government works. NFHS reports are published under MoHFW stewardship with IIPS as nodal agency; although IIPS is an autonomous institute, the NFHS is "funded by the Government of India" and published on data.gov.in under NDSAP — qualifies.
- **Attribution requirements:** Rural Health Statistics / Health Dynamics of India on data.gov.in requires attribution "Ministry of Health and Family Welfare, Government of India". PMJAY dashboard data should be cited as "National Health Authority, Ayushman Bharat PM-JAY". NFHS requires "International Institute for Population Sciences (IIPS) and ICF. National Family Health Survey (NFHS-5), 2019-21: India" citation format. NPPA notifications cite the S.O. number and Gazette date. [[NFHS-5 IIPS citation]](https://www.nfhsiips.in/)

### Known gaps / caveats

- **NFHS-6 data not yet published** as of April 2026; MVP must use NFHS-5 (2019-21) with explicit "as of 2019-21" caveat. NFHS-6 fieldwork was completed in 2023-24 and results are "awaited". Also note NFHS-6 **dropped anaemia biomarkers, waist-hip ratio, and disability questions** (controversially) — flag this when NFHS-6 releases. [[NFHS explainer – data status]](https://www.dataforindia.com/nfhs-explainer/) [[Data For India NFHS]](https://www.dataforindia.com/nfhs-explainer/)
- **HMIS facility-level data is G2G (login-walled)** — only Standard Reports and aggregated state-level views are public. Do not attempt to access facility-level credentials.
- **IDSP is transitioning to IHIP** — the "classic" IDSP weekly outbreak PDF may be deprecated in favour of IHIP real-time module. Build scraper to accept both (`idsp.mohfw.gov.in` weekly PDF **and** `ihip.nhp.gov.in/idsp/`). [[IHIP IDSP link]](https://ihip.nhp.gov.in/idsp/)
- **PMJAY public dashboard has changed URLs several times** (`dashboard.pmjay.gov.in/publicdashboard` → `dashboard.nha.gov.in/public/`). Always link via the stable root `pmjay.gov.in` and follow the redirect; verify before each weekly refresh.
- **NPPA publishes PDFs dated 25 March 2026 for effect 1 April 2026** — factor in this 1-week lag when computing "effective as of" dates on ceiling prices.
- **NMC Seat Matrix PDFs are sometimes updated mid-year** (e.g., for mid-session new-college approvals). Check weekly during Aug-Oct admission cycle.
- **"Rural Health Statistics" was renamed to "Health Dynamics of India" from the 2022-23 edition** — don't assume the old filename pattern.
- **U-WIN does not publish a machine-readable aggregate dashboard**; only cumulative beneficiary/dose counters in periodic MoHFW press releases. Gap — flag for "requires manual update from latest MoHFW PIB release."
- **IDSP historical outbreak counts: ~30-40 outbreaks per week**, ~2,500-3,000 per year. Weekly PDF structure has been stable since 2016 (unique outbreak ID format `<STATE>/<DIST>/<YEAR>/<WEEK>/<4-digit>`).
- **Medical Council of India (MCI / mciindia.org) was dissolved in 2020** per the National Medical Commission Act 2019. Do NOT cite mciindia.org — it is defunct. Use nmc.org.in only.

---

## Cross-Cutting Infrastructure Notes

### data.gov.in API — registration & usage

1. Sign up at https://www.data.gov.in/ → Dashboard → My Account → Generate Key. The key is a 40-character alphanumeric string personal to the developer account. A **sample key** `579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b` is used in official documentation and returns limited data (max 10 records/request) — do not use in production.
2. Request pattern: `GET https://api.data.gov.in/resource/<resource-id>?api-key=<KEY>&format=json&offset=0&limit=100&filters[<field>]=<value>`. Responses are JSON with `records[]`, `total`, `offset`, `count`.
3. Rate limits are **not formally published** for the Indian OGD portal (the `api.data.gov` rate limits documented at https://api.data.gov/docs/developer-manual/ are for the **US** counterpart; do not conflate). Empirically, a courteous ~1 req/sec from a single key is accepted. Batch with `limit=1000` where supported.
4. Useful resource IDs for the four modules (partial list):
   - AGMARKNET daily mandi prices: `9ef84268-d588-465a-a308-a864a43d0070` (verify against the live catalogue page on first fetch).
   - NFHS-5 factsheets: available via the OGD resource page linked above.
   - KCC accounts year-wise: available as CSV, no live API.
5. License: **Government Open Data License – India** (Gazette notification, February 2017). Commercial and non-commercial use permitted with attribution. [[License reference]](https://en.wikipedia.org/wiki/National_Data_Sharing_and_Accessibility_Policy)

### Common scraping pitfalls

- **JavaScript-rendered pages:** sansad.in (filters, attendance grid), eci.gov.in (entire site is a Next.js/React SPA — use `playwright` or `selenium` with explicit waits), NHA PMJAY dashboard (charts are React-rendered).
- **Session cookies required:** TRADESTAT query builder (establishes a `JSESSIONID`; replicate with `requests.Session()`), APEDA Agri Exchange (POST-based with hidden `__VIEWSTATE` ASP.NET fields), iFMS (requires state/user context).
- **PDF-only publications:** Budget, CACP, NPPA, IDSP, Health Dynamics of India, CAG. Use `pdfplumber` for text; `camelot` (requires Ghostscript) for table extraction. Expect OCR fallback for pre-2015 PDFs.
- **CAPTCHAs:** data.gov.in registration uses a simple CAPTCHA (one-time); none of the scraping targets have persistent CAPTCHAs — but ECI's voter-services portal does (avoid automating it). The AGMARKNET v1 site had a CAPTCHA; v2 (Nov 2025) does not.
- **IP blocks:** IMD AWS/ARG locked down to public in May 2025 — do not attempt to bypass. For high-volume AGMARKNET access use the data.gov.in API, not the portal HTML.
- **Stale mirrors:** `eands.dacnet.nic.in` (MSP page), `cacp.dacnet.nic.in` (CACP), `dac.gov.in` (legacy) all show older last-updated timestamps. Cross-reference with the Ministry's latest PIB releases to verify the current release.
- **Date-formatting inconsistencies:** MoSPI uses "12th December, 2025" in PDF titles but "2025-12-12" in filename slugs. Budget documents use fiscal year notation "BE 2026-27" / "RE 2025-26" which must be parsed carefully.
- **Character encoding:** Some DA&FW and NABARD PDFs are encoded with non-UTF8 (ISCII / Latin-1 with Devanagari fallbacks). Use `chardet` before parsing.

### NDSAP compliance checklist

Before publishing any dashboard view derived from a government source, confirm:
- [ ] The underlying dataset is either (a) explicitly released under NDSAP on data.gov.in, OR (b) a publicly-facing Government work covered by Copyright Act §52(1)(q)(i-iv).
- [ ] The source is attributed clearly on the chart / dashboard (portal name + retrieval date + official URL).
- [ ] Data is not transformed in a way that misrepresents the source (NDSAP prohibits misrepresentation).
- [ ] No personal / identifying data is included (PM-KISAN village lists include names — aggregate to district level only).
- [ ] Refresh cadence is displayed ("As of <DATE>; updates <monthly/quarterly/annual>").
- [ ] A "Methodology / Source notes" link exposes the original PDF / portal URL so users can verify.
- [ ] Where base-year / methodology changes (GDP base 2022-23, CPI 2024, PLFS 2025 sample) create time-series breaks, these are flagged visually on the chart.

### Recommended next-step priority — which module to build first

**Build order recommendation (highest-to-lowest data readiness):**

1. **MODULE 1 — National Economy (build first).** Highest API availability (~55%), richest time-series depth, most stable schemas. Monthly refresh cadence lends itself to clean cron jobs. CGA, MoSPI eSankhyiki, and RBI DBIE are all mature portals. One hard caveat: the GDP/CPI/IIP base-year revisions in Feb/May 2026 will require a schema version bump.

2. **MODULE 3 — Agriculture (second).** AGMARKNET + data.gov.in API gives an excellent real-time spine. MSP and crop production estimates are low-frequency (bi-annual) and can be hand-curated for MVP. The IMD AWS lockup is a genuine constraint — use subdivision-level rainfall which is still public. PM-KISAN aggregated counts are straightforward; avoid village-level scraping for MVP.

3. **MODULE 4 — Health (third).** PMJAY dashboard + NFHS-5 factsheets + NPPA notifications give a solid MVP. However ~65% of health data is PDF-locked and NFHS-6 release timing is uncertain. Expect higher engineering cost per data point than Modules 1 and 3.

4. **MODULE 2 — Parliament & Budget (fourth).** Lowest API availability (~20%). Sansad.in requires heavy scraping with headless browsers; ECI results use undocumented Next.js endpoints; Budget is PDF-only. The **upside** is that session-wise data refreshes only twice a year (Budget + Monsoon + Winter sessions), so once the initial scraping infra is stable, maintenance is low. Start this module only after the scraping framework is mature and after MVP has at least 2-3 releases on Modules 1 & 3.

---

## References / Verification Log

All URLs below were verified to load real data (not 404, not login wall) on **23–25 April 2026** unless noted "VERIFY BEFORE USE" or "SOURCE NOT FOUND".

| # | URL | Portal / Publication | Check date | Status |
|---|-----|----------------------|-----------|--------|
| 1 | https://www.mospi.gov.in/press-release | MoSPI press releases (GDP / CPI / PLFS) | 2026-04-24 | OK |
| 2 | https://www.mospi.gov.in/uploads/latestReleases/latest_release_1772189865181_f040336d-bc57-4aed-b80f-586d9ccb279e_Press_Note_on_New_Series_of_GDP_Estimates_with_Base_Year_2022-23_27022026.pdf | GDP Q3 FY26 + new base series | 2026-04-24 | OK |
| 3 | https://cpi.mospi.gov.in/ | CPI homepage | 2026-04-24 | OK |
| 4 | https://esankhyiki.mospi.gov.in/ | eSankhyiki portal | 2026-04-24 | OK |
| 5 | https://esankhyiki.mospi.gov.in/macroindicators?product=nas | NAS macro-indicator series | 2026-04-24 | OK |
| 6 | https://eaindustry.nic.in/ | WPI Office of Economic Adviser | 2026-04-24 | OK |
| 7 | https://cga.nic.in/MonthDashboardReport/Published/list.aspx | CGA Monthly Accounts Dashboard | 2026-04-24 | OK (up to Feb 2026) |
| 8 | https://tradestat.commerce.gov.in/ | TRADESTAT (DGCI&S) | 2026-04-24 | OK (data to Feb 2026) |
| 9 | https://www.rbi.org.in/ | RBI homepage | 2026-04-24 | OK |
| 10 | https://data.rbi.org.in/DBIE/ | RBI DBIE data warehouse | 2026-04-24 | OK |
| 11 | https://rbi.org.in/Scripts/BS_ViewWSS.aspx | RBI Weekly Statistical Supplement | 2026-04-24 | OK |
| 12 | https://www.indiabudget.gov.in/ | India Budget 2026-27 | 2026-04-24 | OK |
| 13 | https://www.indiabudget.gov.in/doc/eb/vol1.pdf | Expenditure Profile 2026-27 | 2026-04-24 | OK |
| 14 | https://www.data.gov.in/ | Open Government Data Platform | 2026-04-24 | OK |
| 15 | https://www.data.gov.in/apis | data.gov.in APIs catalogue | 2026-04-24 | OK |
| 16 | https://www.sebi.gov.in/reports-and-statistics/publications.html | SEBI Publications (monthly bulletin) | 2026-04-24 | OK |
| 17 | https://sansad.in/ls/members/attendance | Lok Sabha attendance | 2026-04-24 | OK (JS-rendered; may need headless browser) |
| 18 | https://sansad.in/rs/members/attendance | Rajya Sabha attendance | 2026-04-24 | OK |
| 19 | https://sansad.in/ls/legislation/bills | Lok Sabha Bills | 2026-04-24 | OK |
| 20 | https://sansad.in/rs/legislation/bills | Rajya Sabha Bills | 2026-04-24 | OK |
| 21 | https://sansad.in/ls/committee/departmentally-related-standing-committees | LS DRSC | 2026-04-24 | OK |
| 22 | https://sansad.in/ls/committee/subjects-reports | LS Committee Subjects / Reports | 2026-04-24 | OK |
| 23 | https://eparlib.sansad.in/handle/123456789/13 | Parliament Digital Library — Committee Reports | 2026-04-24 | OK |
| 24 | https://mpa.gov.in/bills-list | Ministry of Parliamentary Affairs — Bills list | 2026-04-24 | OK |
| 25 | https://cag.gov.in/en/audit-report | CAG Audit Reports | 2026-04-24 | OK |
| 26 | https://cag.gov.in/en | CAG homepage | 2026-04-24 | OK |
| 27 | https://www.eci.gov.in/ | Election Commission of India | 2026-04-24 | OK (JS SPA) |
| 28 | https://results.eci.gov.in/ | ECI results (latest election) | 2026-04-24 | OK (redirects to active event) |
| 29 | https://affidavit.eci.gov.in/ | ECI Affidavit Portal | 2026-04-24 | OK (JS-rendered) |
| 30 | https://www.eci.gov.in/statistical-reports | ECI Statistical Reports archive | 2026-04-24 | OK |
| 31 | https://agmarknet.gov.in/ | AGMARKNET 2.0 | 2026-04-24 | OK |
| 32 | https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi | AGMARKNET daily prices OGD | 2026-04-24 | OK (updated 21/04/2026) |
| 33 | https://cacp.dacnet.nic.in/ | Commission for Agricultural Costs & Prices | 2026-04-24 | OK (footer stale; PDFs current) |
| 34 | https://www.upag.gov.in/ | Unified Portal for Agricultural Statistics | 2026-04-24 | OK |
| 35 | https://desagri.gov.in/divisions-cell/agricultural-statistics-division/ | DES Agricultural Statistics | 2026-04-24 | OK |
| 36 | https://mausam.imd.gov.in/imd_latest/contents/rainfall_statistics_3.php | IMD district rainfall | 2026-04-24 | OK |
| 37 | https://mausam.imd.gov.in/responsive/monsooninformation.php | IMD Monsoon info | 2026-04-24 | OK |
| 38 | https://dsp.imdpune.gov.in/ | IMD Data Service Portal (historic) | 2026-04-24 | OK (account required) |
| 39 | https://pmkisan.gov.in/rpt_beneficiarystatus_pub.aspx | PM-KISAN beneficiary status | 2026-04-24 | OK |
| 40 | https://www.data.gov.in/catalog/village-and-gender-wise-beneficiaries-count-under-pm-kisan-scheme | PM-KISAN village/gender counts | 2026-04-24 | OK |
| 41 | https://agriexchange.apeda.gov.in/ | APEDA Agri Exchange | 2026-04-24 | OK |
| 42 | https://apeda.gov.in/ | APEDA homepage | 2026-04-24 | OK |
| 43 | https://www.fert.nic.in/dbt | Department of Fertilizers DBT | 2026-04-24 | OK |
| 44 | https://ifms.dbtfert.nic.in/portal/iFMSportal | iFMS live counter dashboard | 2026-04-24 | OK |
| 45 | https://www.data.gov.in/resource/year-wise-details-kisan-credit-card-kcc-accounts-farmers-who-have-been-issued-kcc-2014-15 | KCC accounts by agency (OGD) | 2026-04-24 | OK |
| 46 | https://www.enam.gov.in/web/dashboard/agmarknet | e-NAM dashboard | 2026-04-24 | OK |
| 47 | https://pmjay.gov.in/ | Ayushman Bharat PM-JAY | 2026-04-24 | OK |
| 48 | https://dashboard.pmjay.gov.in/publicdashboard | PMJAY public dashboard (legacy URL) | 2026-04-24 | Redirects — VERIFY BEFORE USE |
| 49 | https://dashboard.nha.gov.in/public/ | NHA PMJAY public dashboard (active) | 2026-04-24 | OK |
| 50 | https://hospitals.pmjay.gov.in/Search/ | PMJAY empanelled hospital search | 2026-04-24 | OK |
| 51 | https://hmis.nhp.gov.in/ | HMIS 2.0 Health Management Information System | 2026-04-24 | OK |
| 52 | https://hmis.mohfw.gov.in/ | HMIS alternative domain | 2026-04-24 | OK |
| 53 | https://idsp.mohfw.gov.in/ | Integrated Disease Surveillance Programme | 2026-04-24 | OK (updated 21/04/2026) |
| 54 | https://idsp.mohfw.gov.in/index4.php?lang=1&level=0&linkid=406&lid=3689 | IDSP Weekly Outbreaks archive | 2026-04-24 | OK |
| 55 | https://ihip.nhp.gov.in/ | Integrated Health Information Platform | 2026-04-24 | OK |
| 56 | https://ihip.nhp.gov.in/idsp/ | IHIP IDSP module | 2026-04-24 | OK |
| 57 | https://www.nfhsiips.in/nfhsuser/nfhs5.php | NFHS-5 (IIPS) | 2026-04-24 | OK |
| 58 | https://www.nfhsiips.in/nfhsuser/nfhs6.php | NFHS-6 (IIPS) — results pending | 2026-04-24 | OK (no data yet) |
| 59 | https://www.data.gov.in/resource/all-india-and-stateut-wise-factsheets-national-family-health-survey-nfhs-5-2019-2021 | NFHS-5 factsheets OGD | 2026-04-24 | OK |
| 60 | https://www.nmc.org.in/ | National Medical Commission | 2026-04-24 | OK |
| 61 | https://www.nmc.org.in/information-desk/college-and-course-search/ | NMC College & Course Search | 2026-04-24 | OK |
| 62 | https://www.nmc.org.in/MCIRest/open/getDocument?path=/Documents/Public/Portal/LatestNews/MBBS+seat+matrix.pdf | NMC MBBS Seat Matrix 2025-26 | 2026-04-24 | OK |
| 63 | https://nppa.gov.in/ | National Pharmaceutical Pricing Authority | 2026-04-24 | OK |
| 64 | https://nppaindia.nic.in/ | NPPA alternative domain | 2026-04-24 | OK |
| 65 | https://uwin.mohfw.gov.in/ | U-WIN Universal Immunization Programme | 2026-04-24 | OK |
| 66 | https://www.mohfw.gov.in/ | Ministry of Health & Family Welfare | 2026-04-24 | OK |
| 67 | https://www.nhm.gov.in/ | National Health Mission | 2026-04-24 | OK |
| 68 | https://nhm.gov.in/index4.php?lang=1&level=0&linkid=457&lid=686 | Quarterly NHM MIS Report | 2026-04-24 | OK (30.09.2025 is latest) |
| 69 | https://www.pib.gov.in/PressReleasePage.aspx?PRID=2053070 | Health Dynamics of India 2022-23 PIB | 2026-04-24 | OK |
| 70 | https://www.data.gov.in/catalog/number-government-hospitals-and-beds-rural-and-urban-areas | Number of Government Hospitals & Beds | 2026-04-24 | OK |
| 71 | https://www.data.gov.in/dataset-group-name/Rural%20Health%20Statistics | Rural Health Statistics dataset group | 2026-04-24 | OK |

**Sources explicitly excluded from this research per the brief:**
- ❌ `prsindia.org` (PRS Legislative Research — think tank, not government). Excluded from MVP despite being commonly cited.
- ❌ `mciindia.org` (Medical Council of India — dissolved 2020, replaced by NMC). Not used.
- ❌ `statista.com`, `kaggle.com`, `wikipedia.org`, `indiastat.com`, newspapers, paid databases. Not used.
- ❌ Private stock market data vendors (TrueData, Global Datafeeds, ICICIdirect Breeze). Not used; SEBI Monthly Bulletin is the gov-only substitute for NSE/BSE indices.

**Flagged for "SOURCE NOT FOUND — needs deeper search":**
- Real-time NSE / BSE index values from a Government of India source. SEBI Monthly Bulletin is the closest, but has a ~1-month lag. For live tickers, the constraint "no scraping of exchanges directly" means the dashboard must display lagged SEBI data with an explicit staleness caveat.
- Live national aggregate U-WIN immunisation coverage dashboard (public, machine-readable). Only periodic MoHFW press releases aggregate this. Flag as gap.
- Live national aggregate IMD AWS/ARG rainfall (locked May 2025). Use IMD subdivision daily summary as substitute.

---

**End of research file. Ready to hand off to Jayanth for Claude Code build prompts.**