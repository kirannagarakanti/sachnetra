# Gemini recon brief — Exp21 filing→press coverage check (52-event sample)

**Date:** 2026-06-09
**Why:** SachNetra measured the lag between an NSE corporate filing and the first time our own RSS
feeds carry a matching news story. **91% of material filings never matched any same-ticker press in our
feeds within 48h.** We can't tell from our database whether that 91% is (a) genuinely uncovered by any
press, (b) covered by an outlet we don't ingest, or (c) covered by an outlet we DO ingest but our
ticker-tagging missed it. **Your job: web-search each event and tell us when/where the news first
appeared publicly — with evidence — so we can sort the misses.**

## Input
`scripts/research/output/exp21/exp21_gemini_sample.json` — 52 events, each pre-filled with:
`event_id, company, ticker, tier, subject, filing_time_ist, our_rss_first_catch_ist` (="MISS" if our
feeds never caught it), `our_rss_source`. Each has an empty `web_findings` block for you to fill.

## Task — fill `web_findings` for every event
For each event, web-search the **earliest public appearance** of *this specific news* (use company +
subject + date). Fill:
- `any_press_found` — true/false. **false** = you found NO press coverage of this filing (filing-only).
- `earliest_public_appearance_ist` — "YYYY-MM-DD HH:MM" IST of the earliest article you can evidence.
- `earliest_outlet` — the outlet that published it earliest (e.g. "Moneycontrol", "Economic Times").
- `earliest_url` — direct link to that article.
- `timestamp_evidence` — **quote the actual timestamp text from the page** (e.g. "byline: 'Published
  Jun 03, 2026 02:55 PM IST'"). If the page shows no explicit time, say so and set confidence=low.
- `confidence` — high / medium / low (low = date only, no time, or inferred).
- `other_early_outlets` — `[{outlet, time_ist, url}]` for any OTHER outlets that covered it early
  (this is how we discover feeds we should add).
- `notes` — anything relevant (paywalled? only on X/Twitter? press release wire? regional only?).

## Hard rules
- **Do NOT invent timestamps.** Every time needs `earliest_url` + a quoted `timestamp_evidence`. No
  evidence ⇒ `confidence: low` (or `any_press_found: false` if you truly find nothing).
- Compare against `our_rss_first_catch_ist`: if our feeds said MISS but you find clear press coverage,
  that's the important case — name the outlet so we can check if it's addable.
- Read-only recon. Do NOT touch the DB, the repo, or any `scripts/*`. Output only the filled JSON.

## Deliverable
Write the completed array to `scratch/exp21_gemini_findings.json` (same objects, `web_findings`
filled). Claude will then bucket each event:
- **A** = your earliest ≈ our catch (we had it) ·
- **B** = you found earlier coverage on an outlet we don't ingest (feed gap → addable-source candidate) ·
- **C** = `any_press_found: false` (filing-only — the purest latency edge).

And cross-reference your `earliest_outlet` / `other_early_outlets` against our feed roster to flag which
missed outlets are worth adding.
