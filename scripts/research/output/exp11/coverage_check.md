# Exp 11 — V2-031 Coverage Check

*Generated: 2026-05-29T12:51:23.833Z*
*Source: `scripts/research/exp11-coverage-check.mjs` (read-only)*

## 11.1 — Check 1: overall coverage (last 7 days)

```
total_rows_7d:   21035
tagged_rows_7d:  1057
coverage_pct:    5.02%
gate (≥20%):     FAIL
target (≥30%):   BELOW
```

## 11.2 — Check 2: tag distribution (top 50, excl. Exp 10 large-caps)

```
rank  ticker                 count
────  ─────────────────────  ─────
   1  IPL                       96
   2  INDIGO                    39
   3  COALINDIA                 33
   4  HDFCBANK                  24
   5  RELIANCE.NS               22
   6  TAKE                      22
   7  ASHOKLEY                  20
   8  URBANCO                   20
   9  ONGC                      19
  10  PWL                       18
  11  CUMMINSIND                15
  12  FOCUS                     15
  13  RAIN                      15
  14  SOLARINDS                 15
  15  ALKEM                     14
  16  BDL                       14
  17  PDSL                      14
  18  BATAINDIA                 13
  19  GRAPHITE                  13
  20  MAMATA                    13
  21  ANIKINDS                  12
  22  GILLETTE                  12
  23  JSWHL                     12
  24  LT.NS                     12
  25  ONGC.NS                   12
  26  RISHABH                   12
  27  ASIANPAINT                11
  28  DOLLAR                    11
  29  FINCABLES                 11
  30  IRCTC                     11
  31  LEMONTREE                 11
  32  SBIN.NS                   11
  33  TCS.NS                    11
  34  RETAIL                    10
  35  HINDALCO.NS                9
  36  INFY                       9
  37  YATRA                      9
  38  ANUP                       8
  39  BSE                        8
  40  EICHERMOT.NS               8
  41  GMRAIRPORT                 8
  42  NTPC.NS                    8
  43  PCJEWELLER                 8
  44  APARINDS                   7
  45  BANKINDIA                  7
  46  BHARTIARTL.NS              7
  47  COALINDIA.NS               7
  48  EIDPARRY                   7
  49  GUJGASLTD                  7
  50  MARKSANS                   7
```

distinct_non_largecap_tickers_top50: 50
tickers_with_≥3_stories_in_top50:    50
gate (long tail, ≥3 stories/week):   PASS (rough heuristic)

## 11.3 — Check 3: precision spot-check (30 random tagged rows, last 7 days)

*Eyeball each row: does the headline genuinely mention the tagged ticker(s)? Mark Y/N. Target ≥90%.*

| # | tickers | headline | source | id |
|---|---|---|---|---|
| 1 | `RAIN` | Revanth Reddy Orders High Vigil amid Rain Threat | Deccan Chronicle | 8c8e9210-ed37-41db-bbfc-c0fc90457571 |
| 2 | `INDIGO` | Jagdalpur-bound IndiGo flight carrying 79 passengers makes U-turn to Hyderabad due to bad weather | DNA India | 7671be8c-42cc-4a5e-bd93-3ffa5e3030f0 |
| 3 | `ROUTE` | New Weekly train between Charlapalli and Agartala starts in July — Dates, route and major stops here - financialexpress.com | Financial Express | 930bcb2c-b4f9-4269-ac6c-b70a99cfe6ed |
| 4 | `COALINDIA, FOCUS, GPTINFRA, IMFA, TATAELXSI` | Sensex today \| Stock Market Live: Coal India, Zee, IMFA, Tata Elxsi, Saatvik, GPT Infraprojects will remain in focus on Wednesday | Hindu Business Line | e939ec6d-4ed6-41ba-8a60-7efade356544 |
| 5 | `MARUTI` | Maruti Suzuki India adopts WFH, travel curbs amid West Asia conflict - Business Standard | Business Standard | f6332d9d-844d-45d3-ac23-9bd2aacc2941 |
| 6 | `OMFREIGHT` | Om Freight Forwarders consolidated net profit declines 42.52% in the March 2026 quarter - Business Standard | Business Standard | c87d3abe-829b-4ef4-879d-e5622d4f34cc |
| 7 | `NAVA` | Nava Kerala Sadas assault case: Five cops suspended, including former CM Pinarayi Vijayan’s gunman - theweek.in | The Week | 28ba0f9f-4f75-4cd6-96dc-cc2e52096842 |
| 8 | `LT.NS` | L&T wins orders from JSW Utkal Steel, IWAI, others | Hindu Business Line | 82f08cc4-1bd9-4f5f-bd8b-ca3ce5c54eb1 |
| 9 | `SUPRIYA` | Supriya Lifescience standalone net profit rises 47.34% in the March 2026 quarter - Business Standard | Business Standard | eb34bd6f-233c-4687-9fc4-092b399b2f57 |
| 10 | `RELIANCE.NS, NTPC.NS` | Q4 results: NTPC, JK Cement, Reliance Infra, Divis Labs among 78 on May 23 - Business Standard | Business Standard | 25c3c232-52b5-4262-ba3c-b1f1b0c53355 |
| 11 | `TMCV, TMPV` | Tata Motors launches next-gen Tiago at Rs 4.69 lakh, Tiago.ev starts at Rs 6.99 lakh - The Economic Times | Economic Times | f78a9fa6-94f1-4522-a13a-2f36a6c2c413 |
| 12 | `OLECTRA` | Hyderabad to Get 60 More Olectra Electric Buses | Deccan Chronicle | 99803e93-8f1b-469c-99bd-1815c22f08d5 |
| 13 | `IPL` | RCB vs GT Live Score Qualifier 1 IPL 2026: Jason Holder Double Strikes Stops Bengaluru's Onslaught | Times Now | 842fa99b-2e0c-45a0-888a-8e7b875b13ee |
| 14 | `IPL` | RCB vs GT Live Score Qualifier 1 IPL 2026: Krunal Pandya, Rajat Patidar Ensure Bengaluru Keep Antu Up; Cross 150 Mark | Times Now | 77e8915e-cec7-4d66-8cfc-8e1775c6fae9 |
| 15 | `RELIANCE.NS` | OPPO India and Reliance Digital Redefine Smartphone Launches in India with the Grand Debut of the Find X9 Ultra and Find X9s - The Tribune | Tribune India | dbbae301-6bc9-4767-821f-242f33feef05 |
| 16 | `IPL` | Virat-AB share an emotional hug after RCB makes it to IPL finals | Deccan Chronicle | 521cc59f-cbec-471c-a444-ffbf2bb1783b |
| 17 | `MPSLTD` | Misbehaves with women MPs: TMC's Kakoli Dastidar complains against Kalyan Banerjee | India Today | 9bcc3ff8-036e-4b06-bae2-b7e65a727016 |
| 18 | `NDTV` | Siddaramaiah's Answer To NDTV On Who's The Next Karnataka Chief Minister | NDTV | 6fe5a6f2-867b-440d-9158-76bdfd7d093d |
| 19 | `URBANCO` | Centre backs proposal for 'Flamingo Blue Carbon Urban Complex' in Mumbai Metropolitan Region - Deccan Herald | Deccan Herald | c1f7c5f8-32a6-43f9-b66b-23d6293eaf8d |
| 20 | `BAYERCROP` | Bayer CropScience Q4 net up 13% at ₹162 cr on higher revenues | Hindu Business Line | afbe16c0-3483-4b22-a4ac-c318231825ff |
| 21 | `ENGINERSIN` | Why The Next Generation Of Engineers Will Learn Differently — And What Medicaps Is Building For Them - Outlook India | Outlook India | 529ada92-228d-4d63-9ecd-e7a4706380fb |
| 22 | `HDFCBANK.NS, SBIN.NS` | HDFC Bank, SBI among 10 stocks that saw highest selling by LIC in Q4. Do you own any?​ - The Economic Times | Economic Times | 0ab2702a-27af-4569-8474-8e7d4651bccf |
| 23 | `PAYTM` | Paytm Invests Rs 100 Crore in European Subsidiary After Turning Profitable for First Time in FY26 | Know Startup | fa3330c9-3795-4ae6-9164-30b52e407cf9 |
| 24 | `KRSNAA` | Broker’s call: Krsnaa Diagnostics (Buy) | Hindu Business Line | 62d534b1-53f6-4332-a57a-8492614b9a4d |
| 25 | `TAKE` | PM Modi urges citizens to take precautions amid severe summer heat across country | Hindu Business Line | 461644a7-a7af-4baa-8053-e4bfa197fd91 |
| 26 | `AEQUS` | Aequs reports net loss of Rs 54 crore in Quarter 4 - Deccan Herald | Deccan Herald | 505c8ccf-17bf-4d0e-930e-029e0dab00e4 |
| 27 | `COALINDIA` | Government to sell up to 2% stake in Coal India | Hindu Business Line | 71538f48-acb0-4d28-8629-590dda35ba7f |
| 28 | `IPL` | With bizarre dismissal, Sai scripts unwanted IPL record, becomes first to... | Times of India | 1524ad06-2762-4dd0-9907-eb9b2807569f |
| 29 | `HINDALCO` | Hindalco Industries likely to gain from high aluminium, copper prices - Business Standard | Business Standard | 9e120981-4f90-42d5-bd47-b151d7725c41 |
| 30 | `SUNPHARMA.NS` | Sun Pharma Q4 FY26: Net Profit Surges 26% YoY; Announces Dividend | Times Now | b31a11c1-7e7d-4c0b-8304-9a4785158519 |

