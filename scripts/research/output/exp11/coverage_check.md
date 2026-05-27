# Exp 11 — V2-031 Coverage Check

*Generated: 2026-05-27T09:01:36.951Z*
*Source: `scripts/research/exp11-coverage-check.mjs` (read-only)*

## 11.1 — Check 1: overall coverage (last 7 days)

```
total_rows_7d:   22647
tagged_rows_7d:  723
coverage_pct:    3.19%
gate (≥20%):     FAIL
target (≥30%):   BELOW
```

## 11.2 — Check 2: tag distribution (top 50, excl. Exp 10 large-caps)

```
rank  ticker                 count
────  ─────────────────────  ─────
   1  IPL                       92
   2  ITC.NS                    38
   3  RELIANCE.NS               37
   4  COALINDIA                 22
   5  INDIGO                    22
   6  SUNPHARMA.NS              22
   7  TAKE                      21
   8  EICHERMOT.NS              20
   9  HINDALCO.NS               20
  10  SBIN.NS                   19
  11  NTPC.NS                   18
  12  BHARTIARTL.NS             16
  13  MARUTI.NS                 16
  14  ONGC                      16
  15  FOCUS                     15
  16  LT.NS                     15
  17  RAIN                      15
  18  TCS.NS                    13
  19  HDFCBANK                  12
  20  ONGC.NS                   12
  21  GRASIM.NS                 11
  22  MAMATA                    11
  23  RETAIL                    10
  24  APOLLOHOSP.NS              9
  25  DOLLAR                     9
  26  IRCTC                      8
  27  COALINDIA.NS               7
  28  EIDPARRY                   7
  29  GILLETTE                   7
  30  MARKSANS                   7
  31  PWL                        7
  32  URBANCO                    7
  33  M&M.NS                     6
  34  MPSLTD                     6
  35  BATAINDIA                  5
  36  CELLO                      5
  37  CUMMINSIND                 5
  38  DIL                        5
  39  DRREDDY.NS                 5
  40  ENGINERSIN                 5
  41  GMRAIRPORT                 5
  42  HDFCBANK.NS                5
  43  MOBIKWIK                   5
  44  PCJEWELLER                 5
  45  POWERGRID.NS               5
  46  RACE                       5
  47  ROUTE                      5
  48  TATAMOTORS.NS              5
  49  TOTAL                      5
  50  YATRA                      5
```

distinct_non_largecap_tickers_top50: 50
tickers_with_≥3_stories_in_top50:    50
gate (long tail, ≥3 stories/week):   PASS (rough heuristic)

## 11.3 — Check 3: precision spot-check (30 random tagged rows, last 7 days)

*Eyeball each row: does the headline genuinely mention the tagged ticker(s)? Mark Y/N. Target ≥90%.*

| # | tickers | headline | source | id |
|---|---|---|---|---|
| 1 | `IPL` | RCB or GT: Which Team Will Qualify For IPL 2026 Final If Qualifier 1 Gets Washed Out? | Times Now | 3dd0d609-95f3-422b-a781-53601ba6aef3 |
| 2 | `BHARTIARTL.NS` | Airtel postpaid customers to automatically get benefit of 'Priority Postpaid' service: Airtel MD | Hindu Business Line | fd9ea7cf-9c86-4a8a-b590-993cb0fe6c61 |
| 3 | `BHARTIARTL.NS` | Airtel defends 'Priority Postpaid' service before DoT panel, denies net neutrality violations - Deccan Herald | Deccan Herald | 7d76f7f7-5bfc-46d9-b860-bbfba0d2ff40 |
| 4 | `SBIN.NS` | SBI Strike: एसबीआई कर्मचारियों की देशव्यापी हड़ताल टली, प्रबंधन से सकारात्मक बातचीत के बाद फैसला | Amarujala | 440da367-decf-4d02-9238-89f888cedd47 |
| 5 | `MANINDS` | Man Industries net down 25 pc on higher cost | Hindu Business Line | f69cea80-5d9c-4339-8b7b-559ff26834a4 |
| 6 | `JKCEMENT` | Broker’s Call: JK Cement (Buy) | Hindu Business Line | 356ccf24-256f-4622-b15b-2c83183e0a31 |
| 7 | `MARATHON` | Dhir & Dhir associates launches sixth edition of virtual legal marathon on ESG: A 24-hour live research lab - Zee News | Zee News | 2d6a4bf1-9f14-497d-8d40-8f68db4254cc |
| 8 | `RAIN` | Rain Disrupts Life In Tirumala, Tirupati; Provides Relief To Devotees | Deccan Chronicle | 2f4f01bd-b6f2-4259-960d-485af662e0e3 |
| 9 | `KEC` | KEC International secures new orders worth Rs 1,303 cr across businesses - Business Standard | Business Standard | 53340a20-8dc1-4f73-be07-66ac1b3493e4 |
| 10 | `FOCUS` | Quad strengthens counter-terror focus, condemns April 2025 Pahalgam attack: MEA - The Economic Times | Economic Times | 6c7c4148-2455-4952-9a0d-1492aef9f15a |
| 11 | `MARUTI` | Maruti Suzuki urges employees towards WFH, carpool amid Modi&#8217;s austerity call | Siasat | 1fdf1e54-ff86-4508-8729-7ddcef3ad19c |
| 12 | `LT.NS` | L&T's Vyoma ties up with Open Dhi to host its enterprise platforms on sovereign cloud | Hindu Business Line | 4f827f18-f0ff-4215-a7e1-496c0a93488b |
| 13 | `BBOX` | Black Box Q4 profit grows 7% to ₹65 crore | Hindu Business Line | ab213320-74ef-4e7b-98c1-989b3eed308e |
| 14 | `IPL` | RCB vs GT Live Score Qualifier 1 IPL 2026: Sai Sudharsan, Shubman Gill Departs Early In 255 Chase | Times Now | 29a3b3d8-5c84-470f-b176-b3ec47ce3982 |
| 15 | `NH` | Momentum indicators remain strong for Narayana Hrudayalaya after breakout above consolidation range - The Economic Times | Economic Times | 40a049e8-444f-40d1-89a7-a585668e7788 |
| 16 | `MARUTI.NS` | Maruti Suzuki to hike prices across models by up to ₹30,000 from June - Business Standard | Business Standard | 49b0df2e-eb71-4743-a7fe-a1f651def3ad |
| 17 | `COALINDIA, IRCTC, ONGC, PWL` | Stocks to Watch today: Coal India, PhysicsWallah, ONGC, Siemens, IRCTC - Business Standard | Business Standard | 98e3aa25-47ba-4cc4-9030-c90fcbf648c4 |
| 18 | `EICHERMOT` | Royal Enfield Bullet 650 India Launch - The Most Powerful Bullet Ever Is Almost Here | Times Now | eefa425f-286d-45c2-aa15-c7c12328fe9b |
| 19 | `ENGINERSIN` | AI Cost Crunch: Microsoft Cutting Claude Code Access, Redirecting Engineers To GitHub Copilot CLI - News18 | News18 | 165a5bf6-e17f-4207-9c01-f65bbf5e6b28 |
| 20 | `SUNPHARMA.NS` | Sun Pharma Q4 profit rises 26% to Rs 2,714 crore, revenue grows 13%, dividend announced - financialexpress.com | Financial Express | c169b36d-cc70-4731-a83d-baf3736b2b31 |
| 21 | `LT.NS` | L&T wins orders from JSW Utkal Steel, IWAI, others | Hindu Business Line | 82f08cc4-1bd9-4f5f-bd8b-ca3ce5c54eb1 |
| 22 | `HINDUNILVR, VBL` | ITC, Varun Beverages, HUL, others: Fresh target prices, preferred stocks and more | Business Today | f86a9cf2-e042-4496-891f-6250a6f74f38 |
| 23 | `TCS.NS` | Nashik Police file first charge sheet in TCS sexual assault case - Business Standard | Business Standard | 2574dd81-3d6e-4bb2-a244-6174b37d6a6b |
| 24 | `ROUTE` | New Gorakhpur–Lucknow train to boost connectivity across 7 UP districts — Full route here - financialexpress.com | Financial Express | 39cc3bc4-1547-406b-80bb-b58605dca17a |
| 25 | `MAMATA` | Bengal: FIR against Mamata Banerjee for remarks &#8216;hurting religious sentiments&#8217; | Siasat | 694e5808-b9f6-4dfc-ada4-0942e13cedcc |
| 26 | `IPL` | RCB and GT Set for IPL Qualifier 1 Blockbuster | Deccan Chronicle | cd5745c1-876e-4d9c-b990-433b6e9315ae |
| 27 | `IPL` | IPL 2026 \| GT win toss, elect to bowl against RCB in Qualifier 1 - Deccan Herald | Deccan Herald | e1a71ef2-8ff5-407c-ab33-4759e4a6e807 |
| 28 | `TATAMOTORS.NS` | Stellantis Taps Tata Motors to Build Jeep Vehicles for Global Markets from India | StartupTalky | 41f3ed7f-648e-4c89-b767-aa7a042ca23d |
| 29 | `HDFCBANK` | HDFC Bank falls on report of payments to attract big deposits | Hindu Business Line | 5a32c993-1974-4a75-b3e5-3aef063245d9 |
| 30 | `INDIGO` | Passengers evacuated using slides at BLR after smoke on taxiing IndiGo aircraft | Times of India | 8f868885-3c33-4f11-818a-ed26aa66cc99 |

