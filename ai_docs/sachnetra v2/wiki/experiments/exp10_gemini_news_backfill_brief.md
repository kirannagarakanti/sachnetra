---
tags: [experiment, sachnetra, exp10, gemini, news-backfill, operator-doc]
source: [[Exp10]]
audience: Lijo (operator) + the Gemini agent he pastes this to
created: 2026-05-24
---

# Exp 10 — Gemini News-Backfill Brief

> Operator: paste **this entire doc** into a new Gemini conversation *first* (it's the agent's
> context). Then paste the rows from `scripts/research/output/exp10/exp10_events_unmatched.csv`
> in batches. Save Gemini's output to `scripts/research/output/exp10/exp10_events_gemini_verified.csv`
> in the exact format §4 specifies. Re-run the experiment with `--use-gemini-news` to ingest.

---

## 1. What you (Gemini) are helping us do

We run **SachNetra**, a data pipeline that collects NSE corporate filings the instant they're
published. We've measured a **~13-minute median lead** between SachNetra getting a filing and
the matching news headline showing up on Indian newswires ([[Exp4]]). That is a real, measured
latency edge for large-caps.

The follow-up experiment ([[Exp10]]) asks whether that latency translates into a tradable
price move. To run it cleanly we need to know whether, for each filing we collected, there
*was* a news article we missed in our own collection — or whether genuinely no journalist
covered it. Our news pipeline currently tags only ~1.7% of articles by ticker, so a filing
showing up as "no matching news" in our DB could mean either:

- **(a)** News existed but we didn't tag it, OR
- **(b)** No news existed (the filing wasn't picked up by Indian financial media)

You (Gemini) are the human-in-the-loop arbiter between (a) and (b). For each filing we hand
you, search the open Indian financial-news web and tell us honestly which case it is.

This is for honest research, not journalism reproduction or content scraping. Output is a few
fields per filing — source, headline, timestamp, URL — never the article body.

---

## 2. The input you'll receive

Rows from `exp10_events_unmatched.csv` with this header:

```
announced_at_utc, announced_at_ist, symbol, category_raw, bucket, subject, gemini_query
```

Each row is one NSE filing we already saw. The `gemini_query` cell is a pre-formatted natural-
language search prompt for the filing (you can use it directly or refine).

### 2.1 IMPORTANT — group your searches by (symbol, day)

Indian companies often file 3–5 separate items for one corporate event (Q4 results day might
produce: board-meeting outcome + audited results + dividend recommendation + record date +
press release — all within 12 minutes). The CSV will give you all of them, but **the news
search is the same one search**. Group rows by (symbol, day) and **do one search per group**,
not one search per row.

Example: if the CSV gives you 4 MARUTI rows for 2026-04-28, that is **one search**: "What did
Indian financial media report about Maruti Suzuki's Q4 results on 2026-04-28?" Apply the
answer to all 4 CSV rows for that group.

---

## 3. How to search

For each `(symbol, day)` group:

1. **Identify the underlying corporate event** by reading the `subject` and `category_raw`
   fields across the group's rows. (E.g. "all 4 are about Maruti's Q4 FY26 financial results
   and dividend on 2026-04-28.")
2. **Search Indian financial-news sources** for coverage published on that day:
   - Tier-1: moneycontrol.com, livemint.com, economictimes.indiatimes.com,
     business-standard.com, financialexpress.com, ndtv.com/business, businesstoday.in,
     thehindubusinessline.com, cnbctv18.com, reuters.com/world/india, bloombergquint.com / bqprime.com
   - Tier-2: equitybulls.com, capitalmarket.com, stockedge.com news, rediff.com/money
   - Acceptable: any reputable English-language outlet that covers Indian markets
   - **Reject:** aggregator blogs, press-release wires (PRNewswire, GlobeNewswire) restating
     the filing verbatim — we want *journalistic* coverage, not the wire itself.
3. **Constrain the time window** to the IST date in the row's `announced_at_ist` and the
   following 24 hours. A morning filing reported in the same day's evening market wrap counts.
4. **For each genuine article you find:** capture source, headline, publish timestamp (IST,
   to the minute if possible — many outlets put `Updated:` and `Published:` separately, prefer
   `Published`), and the URL.
5. **Cap at 3 articles per (symbol, day) group** — most useful one first. We don't need
   exhaustive coverage; we need to know "did news exist and roughly when."

---

## 4. Output format — exact CSV schema (the experiment script ingests this)

Produce a CSV named `exp10_events_gemini_verified.csv` with this header (literal, no spaces
in field names, no extra columns):

```
symbol,news_published_at_ist,source,headline,url
```

One row per (article, original-CSV-row). If 4 MARUTI 2026-04-28 rows in the input share one
article, emit 4 output rows with the same `news_published_at_ist`/`source`/`headline`/`url` —
the script joins on `(symbol, ts within ±48h)` so duplicates are absorbed.

### 4.1 If no news exists for a (symbol, day) group

Output exactly one row per input row, with `headline` field set to the literal string
`NO_NEWS_FOUND`. Leave the other fields blank or fill with a single hyphen:

```
MARUTI,-,-,NO_NEWS_FOUND,-
```

The script filters these out at ingest, so they don't pollute the matched count but they do
let us tell case (a) from case (b) in our follow-up analysis: an unmatched filing with
NO_NEWS_FOUND is genuinely uncovered; an unmatched filing with a real article means our news
pipeline missed it (which routes to a tagging-coverage fix on the SachNetra side).

### 4.2 Format rules

- **Timestamps:** ISO-style `YYYY-MM-DD HH:MM` in **IST** (or with `+05:30` suffix). The script
  parses both. If the article only says "May 5, 2026" with no time, use `12:00` as a noon
  placeholder and flag it by appending ` (approx)` to the headline field.
- **Commas in headlines:** wrap the headline in double quotes. Escape internal double quotes by
  doubling them (`""`). Same for URLs that contain commas (rare).
- **No surrounding whitespace.** Trim each cell.
- **No additional columns.** Anything beyond the 5 declared fields will be silently dropped by
  the parser and is wasted effort.
- **No commentary, summary, or sources.bibliography section.** Output is *just* the CSV. The
  parser is strict: any non-CSV line before the header will cause the row to be skipped.

### 4.3 Worked example

For 4 MARUTI 2026-04-28 input rows where you found 2 articles (one from Mint, one from MC):

```
symbol,news_published_at_ist,source,headline,url
MARUTI,2026-04-28 19:30,Mint,"Maruti Q4 net profit falls 4% YoY; declares Rs 140 dividend",https://www.livemint.com/...
MARUTI,2026-04-28 19:30,Mint,"Maruti Q4 net profit falls 4% YoY; declares Rs 140 dividend",https://www.livemint.com/...
MARUTI,2026-04-28 19:30,Mint,"Maruti Q4 net profit falls 4% YoY; declares Rs 140 dividend",https://www.livemint.com/...
MARUTI,2026-04-28 19:30,Mint,"Maruti Q4 net profit falls 4% YoY; declares Rs 140 dividend",https://www.livemint.com/...
MARUTI,2026-04-28 20:15,Moneycontrol,"Maruti Suzuki Q4 FY26 results: margin pressure dampens sentiment",https://www.moneycontrol.com/...
MARUTI,2026-04-28 20:15,Moneycontrol,"Maruti Suzuki Q4 FY26 results: margin pressure dampens sentiment",https://www.moneycontrol.com/...
MARUTI,2026-04-28 20:15,Moneycontrol,"Maruti Suzuki Q4 FY26 results: margin pressure dampens sentiment",https://www.moneycontrol.com/...
MARUTI,2026-04-28 20:15,Moneycontrol,"Maruti Suzuki Q4 FY26 results: margin pressure dampens sentiment",https://www.moneycontrol.com/...
```

For a (symbol, day) group where you found nothing after a genuine search:

```
M&M,-,-,NO_NEWS_FOUND,-
M&M,-,-,NO_NEWS_FOUND,-
```

---

## 5. The honesty bar (this is the whole point of the exercise)

The experiment will treat your output as ground truth for the unmatched split. If you
hallucinate citations, the experiment becomes meaningless. Three rules:

1. **Never fabricate a URL.** If you cannot verify a specific article exists at a specific
   URL, don't include it. Better to return `NO_NEWS_FOUND` than to invent.
2. **Never paraphrase a headline you haven't seen.** Headlines are copyable strings; quote
   what's actually printed, even if grammar is bad. If you saw an article but can't reproduce
   the headline verbatim, write `(headline not reproducible)` in the headline field and skip
   the row — don't guess.
3. **Be loud about uncertainty.** If a "morning briefing" article from 2026-04-29 mentions
   Maruti's Q4 in passing but isn't a dedicated piece, include it with the headline prefixed
   by `[mention] ` so we know it's secondary coverage. Don't pretend a passing mention is
   primary coverage.

If the search returns hundreds of articles (often the case for ITC/RELIANCE Q4 results), give
us the **3 most prominent** — typically Mint, Moneycontrol, ET — rather than a long list.
Three good citations beat thirty unverifiable ones.

---

## 6. The current unmatched batch (11 rows, ~4 distinct events)

For the first Exp 10 run (2026-05-24), the unmatched CSV contains 11 rows that collapse to
4 distinct (symbol, day) groups:

| Group | Symbol | Day | Underlying event | Rows in CSV |
|---|---|---|---|---|
| 1 | MARUTI | 2026-04-28 | Q4 FY26 results + dividend | 4 |
| 2 | M&M | 2026-05-05 | Q4 FY26 results + dividend | 5 |
| 3 | ITC | 2026-05-07 | Amalgamation of Sresta Natural Bioproducts + Wimco | 1 |
| 4 | RELIANCE | 2026-05-07 | Acquisition of Kandla GHA Transmission stake | 1 |

So this batch is **4 searches**, not 11. Expected output: ~6–12 CSV rows (2–3 articles per
group, fanned out across the original CSV rows per §4.3).

---

## 7. After Gemini returns the CSV

Lijo:
1. Save it to `scripts/research/output/exp10/exp10_events_gemini_verified.csv` (exact path —
   the script looks there).
2. Re-run: `node scripts/research/exp10-intraday-filing-event-study.mjs --use-gemini-news`
3. Compare the new matched/unmatched split to the unverified run (§7.4 in [[Exp10]]). The
   meaningful number is the **NO_NEWS_FOUND rate** — that calibrates our 1.7% ticker-tagging
   gap. If most unmatched filings have real news Gemini found, the gap is our tagging problem
   (route to fixing [[_data_gaps_backlog]] G1). If most have no coverage, the gap is genuine
   journalist-coverage thinness (a positioning point, not a fixable bug).

---

## 8. What this brief is NOT for

- **Not for matched-CSV verification.** Those rows already have news in our DB; Gemini is not
  needed there.
- **Not for the Exp 4 latency measurement.** That uses our own `published_at`; Gemini's
  timestamps would inflate the measured lead and contaminate the result.
- **Not for trade direction extraction.** A separate (future) step will read filings' subject
  text to extract direction (positive/negative surprise). Gemini's news headlines are useful
  for that *eventually* but the Exp 10 v1 script doesn't ingest them.

Brief ends. Begin pasting CSV rows below.
