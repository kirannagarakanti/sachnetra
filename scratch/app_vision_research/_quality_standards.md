# Antigravity Research — Quality Standards (all briefs)

*Learned from R03 pass-1 audit + pass-2 fix. Every brief R04–R09 should follow this.*

---

## Before you start

1. Read `lijo_answers.md` (posture, languages, Exp 11 out of scope).
2. If R03 is done, skim `output/R03/R03_india_market_snapshot_2026-05.md` — use as **fact baseline** for May 2026, not re-researched from memory.

---

## Every deliverable must have

| Rule | Bad | Good |
|---|---|---|
| **As-of date** on every number | "FII selling heavily" | "FPI equity MTD -₹34,469 cr, as-of 27-May-2026" |
| **Deep link** | `nseindia.com` homepage | `fpi.nsdl.co.in/Reports/Monthly.aspx` with row date |
| **confidence** | all `confirmed` | `confirmed` = primary/exchange; `anecdote` = social; `marketing` = vendor blog |
| **lang:** on social quotes | untagged | `lang: hi` for Hindi Telegram |
| **Facts vs opinions** | blended narrative | separate tables |

---

## Primary sources cheat sheet (India markets)

| Data | Source |
|---|---|
| FPI flows | `https://www.fpi.nsdl.co.in/Reports/Monthly.aspx` |
| DII cash (provisional) | NSE "FII/FPI & DII trading activity" daily PDF/page |
| Index / sector returns | `https://www.niftyindices.com/` |
| RBI | `rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=` |
| CPI/WPI | MOSPI press release |
| SEBI enforcement | `sebi.gov.in` press releases |

---

## Pass-2 trigger (Claude audit)

Flag brief for pass-2 if:

- Social-only sources with no cross-check
- Generic URLs in registry
- "Useful for SachNetra" without mapping to `india_news_signals` field (ticker, sector, event_type, thread)
- Regime label contradicts index/flow facts (e.g. "uniform crash" when midcaps near highs)

---

## Wiki merge gate

Claude merges into `app_vision_2026.md` only when:

- Deliverables exist under `output/<brief_id>/`
- No open `*_review_errata_*.md` items marked **blocking**
