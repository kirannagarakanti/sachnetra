# R04 — Reddit: India Trading & Markets Sentiment (run AFTER R06)

*Cross-validate Telegram themes on Reddit. High noise; sample carefully.*

**Languages:** English + Hindi/Hinglish (`site:reddit.com` + Devanagari keywords). Tag `lang:` on every row.

**Output folder:** `scratch/app_vision_research/output/R04/`  
**Standards:** [`_quality_standards.md`](./_quality_standards.md)  
**Baselines:** R03 facts + **R06 theme list** (`output/R06/R06_theme_taxonomy.md`) — mark each Reddit thread `telegram_corroborates: Y/N`

---

## Part A — Subreddit map

Identify and subscribe/browse (public posts only):

| Subreddit | Focus | Approx size | India-specific? |
|---|---|---|---|
| r/IndianStreetBets | memes + YOLO | | Y |
| r/IndiaInvestments | long-term, funds | | Y |
| r/StockMarketIndia | | | Y |
| r/Trading | global | | partial |
| r/Options | US-heavy | | partial |
| r/FluentInFinance | | | |
| r/CryptoIndia | | | Y |

For each: rules, mod stance on pump-dumps, quality bar (1–5).

**Deliverable:** `R04_subreddit_map.md`

---

## Part B — Thematic scrape (last 90 days)

**Start from R06 themes** — for each, find **≥5 Reddit threads** (May–Jul 2026 window preferred):

1. **IT / AI selloff** (R03: IT -24% YTD)
2. **FII out / DII in** (R03: -₹34k / +₹63k MTD)
3. **STT & F&O rules** (Apr 2026)
4. **USDINR 95+**
5. **Metal / defence / PSU rotation**
6. **Oil / West Asia** (feeds R07)
7. Broker wars, SME pumps, tools, SachNetra brand search (likely zero)

For each theme: **10 representative threads** (URL + date + 1-line summary + sentiment tag).

**Deliverable:** `R04_theme_threads.csv`

---

## Part C — Sentiment extraction (lightweight)

Do NOT build NLP — manual coding is fine:

- Bullish / bearish / confused / angry at broker / regulatory fear
- Track **nifty outlook** posts weekly over last 8 weeks if possible

**Deliverable:** `R04_sentiment_weekly_notes.md`

---

## Part D — Signal vs noise for SachNetra

Answer:

- What do retail users **wish** they had when they open the app at 9:00 IST?
- What makes them **distrust** news?
- Do they want **ticker tags** on headlines? (validate G1 product direction)

**Deliverable:** `R04_product_implications.md` (opinion layer — tag as anecdote)

---

## Ethics / safety

- No brigading, no personal data
- Flag probable **scam** patterns (paid groups, guaranteed returns)
- Mark unverifiable claims as `anecdote`

---

## Status checklist

- [ ] A subreddit map
- [ ] B thematic scrape
- [ ] C weekly sentiment notes
- [ ] D product implications
