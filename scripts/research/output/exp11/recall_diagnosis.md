# Exp 11 — V2-031 Recall Diagnosis

*Generated: 2026-05-29T13:00:42.439Z*
*Source: `scripts/research/exp11-recall-diagnosis.mjs` (read-only)*

## 1 — Coverage split by is_market_moving (the real denominator)

### 24h
```
total rows:                 2082
market-moving rows:         117  (5.62% of all)
tagged rows (all):          166  (7.97% headline coverage ← the gate)
tagged & market-moving:     33
→ RECALL among market-moving: 28.21%   <-- the meaningful number
tagged but NOT market-moving: 133  (80.12% of tags — leakage/FP risk)
```

### 7d
```
total rows:                 21003
market-moving rows:         879  (4.19% of all)
tagged rows (all):          1056  (5.03% headline coverage ← the gate)
tagged & market-moving:     183
→ RECALL among market-moving: 20.82%   <-- the meaningful number
tagged but NOT market-moving: 873  (82.67% of tags — leakage/FP risk)
```

## 2 — Coverage by relevance_class (last 7 days)

```
relevance_class       total   tagged  coverage
────────────────────  ──────  ──────  ────────
systemic               19957      10  0.05%
idiosyncratic            765     765  100.00%
sector                   281     281  100.00%
```

## 3 — Top 25 sources by volume (last 7 days)

```
source                       total   mm%     tag%
───────────────────────────  ──────  ──────  ──────
Times Now                      2192   1.51%   3.83%
The Hindu                      2006   1.15%   2.04%
Deccan Chronicle               1358   0.81%   3.17%
Hindu Business Line            1103  21.40%  17.95%
Deccan Herald                  1099   2.18%   3.28%
Telangana Today                 918   2.40%   3.49%
Times of India                  823   2.43%   3.40%
Tribune India                   813   3.44%   4.31%
Economic Times                  654   6.57%  11.93%
News18                          646   0.46%   3.72%
New Indian Express              631   2.06%   2.22%
Siasat                          605   0.66%   2.15%
Amarujala                       569   0.18%   0.88%
Daily Excelsior                 536   2.43%   5.97%
Business Standard               486  42.18%  23.46%
India Today                     485   0.62%   2.06%
Hindustan Times                 476   1.47%   2.31%
Financial Express               475  11.79%  12.84%
Firstpost                       472   0.42%   2.97%
Zee News                        440   2.73%   4.77%
Outlook India                   414   0.72%   2.90%
Orissa Post                     405   2.22%   3.70%
NDTV                            373   2.14%   1.61%
ABP Live                        367   2.45%   4.63%
Indian Express                  356   2.53%   1.97%
```

## 4 — Untagged but market-moving — recall-gap sample (30 rows, 48h)

*These passed the market-moving filter but got no ticker. Eyeball: is there a listed company in the headline the master missed (alias gap), or is is_market_moving over-firing?*

| # | headline | class | event | source |
|---|---|---|---|---|
| 1 | Vizag Revenue Clinics Plagued by Inefficiencies and Gaps in Delivery | systemic | earnings | Deccan Chronicle |
| 2 | Wires & Fabriks (S.A) standalone net profit declines 51.61% in the March 2026 quarter - Business Standard | systemic | earnings | Business Standard |
| 3 | Inflation turns Eid grave visits into costly burden in Rawalpindi - The Tribune | systemic | macro | Tribune India |
| 4 | RBI assets rise 20.6 pc to Rs 91.97 lakh crore in FY26 | systemic | regulation | Orissa Post |
| 5 | Helpage Finlease standalone net profit declines 39.06% in the March 2026 quarter - Business Standard | systemic | earnings | Business Standard |
| 6 | India's Fertiliser Crisis: Time To Shift To High Nutrient Efficiency For Food Security & Long-Term GDP Growth - Outlook India | systemic | macro | Outlook India |
| 7 | Post SME IPO, Maxvolt unveils $73 million bet on South India expansion, BESS and lithium recycling | systemic | other | Hindu Business Line |
| 8 | Reliance secures record Japan  financing after S&#038;P upgrade to A- | systemic | other | Daily Excelsior |
| 9 | RBI balance sheet expands 20.6 per cent to Rs 91.97 lakh crore in FY26 | systemic | regulation | Telangana Today |
| 10 | Industrial activity stays resilient despite global conflict: RBI bulletin - Business Standard | systemic | regulation | Business Standard |
| 11 | RBI likely to hold rates steady in june, Economists see no immediate case for hike - Zee News | systemic | regulation | Zee News |
| 12 | IBC@10: Insolvency and bankruptcy code's administration needs improvement - Business Standard | systemic | other | Business Standard |
| 13 | Zappfresh FY26 PAT rises 59% YoY to ₹14.3 crore; revenue jumps 69% - Mint | systemic | earnings | LiveMint |
| 14 | Current Infraprojects Limited Reports Strong H2 FY26 Performance with Rs 115.90 Cr Revenue & Rs 10.16 Cr Net Profit - The Tribune | systemic | earnings | Tribune India |
| 15 | AB Cotspin India consolidated net profit declines 7.11% in the March 2026 quarter - Business Standard | systemic | earnings | Business Standard |
| 16 | What is MSCI rebalancing, quarterly adjustment that triggered Sensex drop by 1092 points? \| India News - Hindustan Times | systemic | other | Hindustan Times |
| 17 | West Asia crisis could pose headwinds to growth, inflation in the short run: RBI Annual Report - The Indian Express | systemic | regulation | Indian Express |
| 18 | SC to examine whether insolvency moratorium can halt cheque bounce proceedings against firms, directors | systemic | other | Telangana Today |
| 19 | Counterfeit currency detections rise 5.7% in FY26, led by Rs 20 &#038; 500 notes: RBI | systemic | regulation | Orissa Post |
| 20 | Sensex crashes 1,100 points, Nifty 50 drops below 23,550; what drove the stock market down today? - Mint | systemic | other | LiveMint |
| 21 | China&#8217;s Z.AI&#8217;s Stock Is Up Nearly 10x Since Its IPO Earlier This Year | systemic | other | OfficeChai |
| 22 | Ratnakar Securities reports consolidated net profit of Rs 0.56 crore in the March 2026 quarter - Business Standard | systemic | earnings | Business Standard |
| 23 | RBI expands CBDC pilots into subsidy schemes and tokenised financial markets | systemic | regulation | Telangana Today |
| 24 | Q4 sectoral scorecard: NBFCs top showing as cyclicals lead earnings growth - Business Standard | systemic | earnings | Business Standard |
| 25 | Sensex today \| Stock Market Closing Bell: Sensex tanks 1,092.06 points; Nifty slumps to 23,547.75 | systemic | other | Hindu Business Line |
| 26 | Emma Raducanu net worth 2026: Earnings and endorsements explored | systemic | earnings | Times of India |
| 27 | Stock Market Closing: Sensex Crashes Over 1,000 Points | systemic | other | Times Now |
| 28 | Happiest Minds sees strong FY27 pipeline, confident of 12.5% annual revenue growth | systemic | earnings | Hindu Business Line |
| 29 | Arihant Academy consolidated net profit rises 249.47% in the March 2026 quarter - Business Standard | systemic | earnings | Business Standard |
| 30 | Sensex bleeding, gold volatile amid US-Iran war: Time to opt for good old FDs? | systemic | other | Times of India |

