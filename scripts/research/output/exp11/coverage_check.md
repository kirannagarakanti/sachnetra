# Exp 11 — V2-031 Coverage Check

*Generated: 2026-05-28T17:41:21.913Z*
*Source: `scripts/research/exp11-coverage-check.mjs` (read-only)*

## 11.1 — Check 1: overall coverage (last 7 days)

```
total_rows_7d:   22184
tagged_rows_7d:  979
coverage_pct:    4.41%
gate (≥20%):     FAIL
target (≥30%):   BELOW
```

## 11.2 — Check 2: tag distribution (top 50, excl. Exp 10 large-caps)

```
rank  ticker                 count
────  ─────────────────────  ─────
   1  IPL                       96
   2  COALINDIA                 33
   3  INDIGO                    30
   4  RELIANCE.NS               28
   5  HDFCBANK                  24
   6  SUNPHARMA.NS              22
   7  TAKE                      22
   8  ASHOKLEY                  19
   9  HINDALCO.NS               19
  10  ONGC                      19
  11  EICHERMOT.NS              18
  12  NTPC.NS                   17
  13  PWL                       17
  14  URBANCO                   16
  15  CUMMINSIND                15
  16  FOCUS                     15
  17  RAIN                      15
  18  SBIN.NS                   14
  19  ALKEM                     13
  20  BATAINDIA                 13
  21  GRAPHITE                  13
  22  MAMATA                    13
  23  PDSL                      13
  24  SOLARINDS                 13
  25  BDL                       12
  26  GILLETTE                  12
  27  ITC.NS                    12
  28  JSWHL                     12
  29  LT.NS                     12
  30  ONGC.NS                   12
  31  ANIKINDS                  11
  32  DOLLAR                    11
  33  FINCABLES                 11
  34  LEMONTREE                 11
  35  TCS.NS                    11
  36  IRCTC                     10
  37  RETAIL                    10
  38  ANUP                       8
  39  BHARTIARTL.NS              8
  40  GMRAIRPORT                 8
  41  INFY                       8
  42  MARUTI.NS                  8
  43  PCJEWELLER                 8
  44  YATRA                      8
  45  APARINDS                   7
  46  BSE                        7
  47  COALINDIA.NS               7
  48  EIDPARRY                   7
  49  MARKSANS                   7
  50  MPSLTD                     7
```

distinct_non_largecap_tickers_top50: 50
tickers_with_≥3_stories_in_top50:    50
gate (long tail, ≥3 stories/week):   PASS (rough heuristic)

## 11.3 — Check 3: precision spot-check (30 random tagged rows, last 7 days)

*Eyeball each row: does the headline genuinely mention the tagged ticker(s)? Mark Y/N. Target ≥90%.*

| # | tickers | headline | source | id |
|---|---|---|---|---|
| 1 | `SBIN` | Banking sector to play transformative role in India’s ‘Viksit Bharat’ journey: SBI Chairman - Zee News | Zee News | ba04ad23-ab75-462c-83b1-d0adf274d6e1 |
| 2 | `COALINDIA, FOCUS, GPTINFRA, IMFA, TATAELXSI` | Sensex today \| Stock Market Live: Coal India, Zee, IMFA, Tata Elxsi, Saatvik, GPT Infraprojects will remain in focus on Wednesday | Hindu Business Line | e939ec6d-4ed6-41ba-8a60-7efade356544 |
| 3 | `SUNPHARMA.NS, NTPC.NS, EICHERMOT.NS, HINDALCO.NS` | Q4 Results Today Live: Sun Pharma, Shilpa Medicar, Info Edge, Eicher Motors profit up, Hindalco, Torrent Pharma, Colgate profit down; NTPC Green, Fortis Healthcare to announce Q4 r | Hindu Business Line | 46536010-a044-4814-badc-c99fc766e301 |
| 4 | `VIPULLTD` | Vipul Amrutlal Shah confirms 7th film with Akshay Kumar, teases alien–predator project after ‘Governor’ - Zee News | Zee News | e549b61c-5f90-4e38-bd53-b77538b67ccd |
| 5 | `AAKASH, IPL` | Aakash Chopra Impressed By Arjun Tendulkar's Performance In Lone Appearance For LSG In IPL 2026 | Times Now | 49b7a671-5520-4a42-8e94-27c6d1a5c7ec |
| 6 | `NH` | Villagers block NH-44 demanding underpass in Medak | Telangana Today | da5e6611-0664-407f-8e9f-f1d78eea4cf0 |
| 7 | `PGHL` | Procter & Gamble Health standalone net profit rises 54.63% in the March 2026 quarter - Business Standard | Business Standard | 7a0f3ba8-82de-495a-93c3-c293f2da6858 |
| 8 | `COALINDIA, FOCUS` | Sensex today \| Stock Market Live: Nifty set for muted start, focus on US-Iran talks; Coal India draws attention | Hindu Business Line | b401c273-b5dc-476e-99d5-90ffdb63fac3 |
| 9 | `RELIANCE.NS` | Reliance Power among 17 smallcap stocks not held by mutual funds in March 2026 quarter. Check details - The Economic Times | Economic Times | 39e5e177-3be6-4abb-8260-64efc76120c6 |
| 10 | `IPL` | IPL 2026: Bengaluru, that’s how the cookie crumbles - Bangalore Mirror | Bangalore Mirror | 08716e9c-b875-4953-9873-ad4cbeaac6d4 |
| 11 | `COASTCORP, RETAIL` | Fishing community seeks more diesel retail outlets in coastal areas ahead of trawling ban | Hindu Business Line | c5266d21-d5a8-46dd-8b1f-56c27d523c4b |
| 12 | `IPL` | RCB vs GT Live Score Qualifier 1 IPL 2026: Bengaluru Pacers Wreak Havoc, Titans Lose 7 Wickets | Times Now | b7c67337-8bbc-4a03-8046-5c35f764ca0f |
| 13 | `URBANCO` | NVS Reddy pushes for Metro, e-bus expansion to tackle urban traffic | The Hindu | 0dba18c3-a17f-4762-b428-20e1d8a16f21 |
| 14 | `VEDL` | Progress of Vedanta’s Rs 1L-cr projects to be reviewed every 15 days: CM | Orissa Post | f8f9627a-1d2e-43fb-a53e-d4ba2295ede1 |
| 15 | `REDTAPE` | Redtape consolidated net profit rises 69.53% in the March 2026 quarter - Business Standard | Business Standard | 35985132-959f-4f24-9015-33ac1081f9e6 |
| 16 | `IPL` | Patidar stands alongside Dhoni and Rohit in historic IPL captaincy record | Times of India | 1ee30a56-27c6-4849-a766-997ada89489c |
| 17 | `COALINDIA.NS` | Coal India allays coal shortage apprehensions - Business Standard | Business Standard | 85958d39-59f2-49c3-8273-6cc81bc6d926 |
| 18 | `IPL` | RCB vs GT Live Score Qualifier 1 IPL 2026: Titans Lose Famed Top 3 In Powerplay | Times Now | 7958b9bf-1414-4b6f-8f08-688e4e05f2cd |
| 19 | `WIPRO` | Wipro expands partnership with ServiceNow - Business Standard | Business Standard | 039fdb11-fa0d-426d-a9e4-f94ca4425719 |
| 20 | `MAMATA` | FIR against Mamata Banerjee for remarks ‘hurting religious sentiments’ | The Hindu | 09cffc95-1e5d-496f-8b07-f2e4d0ba9eea |
| 21 | `TIGERLOGS` | Tiger Logistics (India) standalone net profit declines 65.53% in the March 2026 quarter - Business Standard | Business Standard | 3ce747f6-fe51-47de-87b3-1d845c753191 |
| 22 | `MAMATA` | Advocate Files Complaint Against Mamata Banerjee Over Alleged Anti-Sanatan Remarks | ABP Live | 0bd7239b-bfdf-4600-9d33-4f844c148e61 |
| 23 | `SWIGGY` | Swiggy CEO vows to stay out of Amazon-Walmart India spending war | Hindu Business Line | 794813b3-5d71-442a-bff2-ede41be54454 |
| 24 | `SONAMLTD` | Sonam Wangchuk says he is an &#8216;honorary cockroach&#8217;, rejects Ladakh LG’s claims on CJP | Telangana Today | ec39087c-da58-4f7e-ae80-c35e1e1de382 |
| 25 | `NAVA` | Nava Kerala Sadas assault: CM’s security violated Z+ protocol by attacking protesters after convoy moved, SIT tells court - Onmanorama | Onmanorama | f3faf26a-cb8f-4b3c-9e57-f578b57b18b8 |
| 26 | `SPECIALITY` | Mother and Child Care Super Speciality Block of Guntur GGH starts operations | The Hindu | 22cb2cf8-acf0-45ba-b371-8170ac1269a6 |
| 27 | `TAKE` | Deal to end conflict could take a few days: Rubio as US strikes Iranian naval facilities - The Tribune | Tribune India | 05a568ee-b98c-4c86-b69f-27705724412b |
| 28 | `MANINDS` | Man Industries net down 25% on higher cost | Hindu Business Line | fd6fc746-e9a1-49e4-b3ef-30259d953e5a |
| 29 | `UCOBANK` | 2026 LiveLaw (SC) 555 \| Dineshchand Surana v. UCO Bank (with connected case) - Live Law | LiveLaw | c2021b08-dc56-4279-99a9-755065b3f8de |
| 30 | `EICHERMOT.NS` | Eicher Motors surges 5% as record Q4 profit draws bullish street bets | Hindu Business Line | 6df92887-8ba6-46c5-ac1e-5a9d8c42025b |

