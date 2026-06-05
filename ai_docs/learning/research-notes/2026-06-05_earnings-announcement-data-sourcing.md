---
tags: [data-sourcing, V2-018, announcements, earnings, PEAD, exp16, data-check]
source: [[Exp16]], [[V2-018_nse_bourse_announcements]]
authored_date: 2026-06-05
audience: Lijo, James, future Claude Code sessions
purpose: Answer "where do the earnings-announcement reports come from?" with a live, read-only data check of india_bourse_announcements (the table Exp16 trades on).
---

# Earnings-Announcement Data — Source & Live Data Check (2026-06-05)

## TL;DR
The earnings-announcement reports are **scraped directly from NSE's own website API — NOT from the
SachNetra news pipeline.** They land in the Railway `india_bourse_announcements` table via a dedicated
hourly cron (V2-018). Exp16's "results" events are a regex-classified subset of that table.

**Live check today:** 321,010 total filings (2024-05-30 → **2026-05-29**), of which **27,127 are
results-classified earnings reports** across 2,348 symbols. ⚠️ Latest row is **2026-05-29** — ~7 days
stale vs today (2026-06-05); see [Freshness flag](#freshness-flag).

---

## 1. Where the data comes from — NSE website, not our news feed

It is **the bourse's own corporate-filings feed**, pulled server-side. The path:

```
NSE warm-up handshake (GET https://www.nseindia.com/ → collect nsit/nseappid cookies)
  → GET https://www.nseindia.com/api/corporate-announcements?index=equities
        &from_date=DD-MM-YYYY&to_date=DD-MM-YYYY   (warmed Cookie + corporate-filings Referer)
  → JSON array of filings → normalize each row → upsert into india_bourse_announcements
```

**Key files:**
| Role | File |
|---|---|
| Source adapter (warm-up + fetch) | `scripts/_nse-announcements-source.mjs` |
| Hourly collector cron | `scripts/seed-india-announcements.mjs` |
| Historical backfill | `scripts/backfill-india-announcements.mjs` |
| Batched idempotent upsert | `scripts/_announcements-upsert.mjs` |

**It is deliberately separate from the news pipeline** (`seed-india-announcements.mjs` header, Decision 6):
> "Does NOT read `news:digest:v1:india:en`, does NOT touch the news pipeline or `entity_timeline`."

It runs as its **own hourly Railway cron** (not the 10-min news cron) for failure isolation, and because
the whole point of the V2-018 thread is that bourse filings *lead the newswire by hours* — so it captures
each filing within ~1h rather than waiting for it to surface in news. BSE is a documented stub
(`fetchBSE()`), unused in V1; **NSE is the sole live source** (the check below confirms `sources=1, nse`).

### How a raw NSE row maps to our columns (`mapRow`)
| Our column | NSE field | Notes |
|---|---|---|
| `announcement_id` | `seq_id` | PK part; row skipped if missing |
| `announced_at` | `sort_date` | IST `YYYY-MM-DD HH:MM:SS`, stamped `+05:30` → timestamptz |
| `symbol` | `symbol` | NSE equity symbol |
| `company_name` | `sm_name` | |
| `category` | `desc` | e.g. "Outcome of Board Meeting", "Financial Results" |
| `subject` | `attchmntText` | free-text, e.g. "…submitted the financial results for…" |
| `attachment_url` | `attchmntFile` | the actual filing **PDF** on NSE |
| `isin` / `industry` / `has_xbrl` | `sm_isin` / `smIndustry` / `hasXbrl` | |

So an "earnings announcement report" in our system = an NSE corporate filing whose `category`/`subject`
matches an earnings-results pattern, with a link to the original PDF on NSE.

---

## 2. How Exp16 picks out "earnings" filings

The table holds *all* corporate filings (board meetings, press releases, results, corrigenda…). Exp16
(and Exp2) treat a row as an earnings result when `category`+`subject` matches:

```
/financial result|unaudited|audited.*result|quarterly result/   (case-insensitive)
```

This is a **text classifier on the filing metadata**, not a separate "earnings" source. The same regex is
used in this check script so the counts match what Exp16 sees.

---

## 3. Live data check (read-only, run 2026-06-05)

Script: `scripts/research/check-earnings-announcements.mjs` (SELECTs only — safe on prod).

```text
ALL announcements:
  rows=321,010   symbols=2,385   sources=1  (nse)
  span: 2024-05-30 18:30  →  2026-05-29 19:20  (IST instants, timestamptz)

RESULTS-classified subset (earnings reports — what Exp16 trades on):
  rows=27,127    symbols=2,348   span: 2024-05-30 → 2026-05-29
```

**Latest 15 results filings** (IST · symbol · has-PDF · category · subject):

```text
2026-05-30 00:09  KMEW       PDF  Corrigendum               Knowledge Marine & Engineering Works…
2026-05-30 00:04  FOODSIN    PDF  Outcome of Board Meeting  Foods & Inns — financial results…
2026-05-29 23:54  DBREALTY   PDF  Press Release             Valor Estate — press release…
2026-05-29 23:42  TNTELE     PDF  Outcome of Board Meeting  Tamilnadu Telecommunication — results…
2026-05-29 23:36  DBREALTY   PDF  Outcome of Board Meeting  Audited standalone & consolidated…
2026-05-29 23:26  NURECA     PDF  Outcome of Board Meeting  Nureca — financial results…
2026-05-29 23:25  UNIVPHOTO  PDF  Outcome of Board Meeting  Universus Photo Imagings — results…
2026-05-29 23:04  PROZONER   PDF  Outcome of Board Meeting  Prozone Realty — financial results…
2026-05-29 22:55  TASTYBITE  PDF  Outcome of Board Meeting  Q4 & FY ended 31 Mar 2026…
2026-05-29 22:40  ALPA       PDF  Outcome of Board Meeting  Alpa Laboratories — financial results…
2026-05-29 22:39  SVLL       PDF  Outcome of Board Meeting  Shree Vasu Logistics — results…
2026-05-29 22:36  MADHAV     PDF  Outcome of Board Meeting  Madhav Marbles & Granites — results…
2026-05-29 22:35  GUFICBIO   PDF  Outcome of Board Meeting  Gufic Biosciences — audited results…
2026-05-29 22:29  RMC        PDF  Outcome of Board Meeting  Rmc Switchgears — financial results…
2026-05-29 22:29  GENESYS    PDF  Outcome of Board Meeting  Genesys International — results…
```

Every row carries a `PDF` (link to the original filing on NSE), confirming these are the genuine bourse
documents, not news summaries. The Q4/FY-ended-31-Mar-2026 subjects line up with the Indian results season.

---

## 4. Freshness flag → CONFIRMED: the hourly cron is DEAD since ~2026-05-30

Diagnosed 2026-06-05 with three read-only probes. **Verdict: the V2-018 hourly Railway cron
(`seed-india-announcements.mjs`) has not successfully run since ~2026-05-30. The NSE source is healthy;
the collector process is the failure.**

| Probe | Result | Reads as |
|---|---|---|
| **Daily histogram** (`scratch_ann_histogram.mjs`) | 1,246 filings 5/29 → 8 on 5/30 → **0 every day 5/31–6/5** | **Hard cliff, not a lull** — weekend dips (5/24, 5/17, 5/10) always recover the next weekday; this flatlines |
| **Redis freshness key** `seed-meta:india:announcements` | `fetchedAt = 2026-05-29T20:04Z` (=05-30 01:34 IST), `recordCount:0`, **never refreshed since** | The cron's own "last run" stamp is frozen at the cliff (7-day TTL key, written only on a successful run) |
| **Live NSE API probe** (`warmUpNSE` + `fetchNSEAnnouncements`) | **462 rows** for 04→05 Jun, newest `2026-06-05 10:24 IST` | **Source is fine** — NSE is serving normally right now; not a bot wall or markup change |

**So this is NOT** a bot wall, NOT an NSE markup change, NOT a results-season lull. It is the **collector
not firing** — most likely the Railway cron was disabled/crashed/hit a quota around 2026-05-30, or it is
firing but crashing before `runSeed` writes freshness meta (the graceful-fail path writes nothing).

**Cost of the outage:** ~6 days × ~600–1,200 filings/day ≈ **3,000–5,000 missing filings** (incl. ~500+
earnings results), and growing daily. More important than the rows: **a core alpha source went silently
dark for a week and nothing noticed** — there is no freshness alert.

### Fix (ops — Lijo/James; I write code + read-only checks, Lijo runs prod writes)
1. **Restart/re-enable** the Railway cron for `seed-india-announcements.mjs`; check its run logs for the
   crash/disable around 2026-05-30.
2. **Backfill the gap** 2026-05-30 → today. The hourly seed only walks a 2-day window, so the 6-day hole
   needs `scripts/backfill-india-announcements.mjs` over `30-05-2026 → <today>` (idempotent upsert — safe to
   overlap).
3. **Add a freshness alarm** so the next silent stall is caught in hours, not by accident a week later
   (e.g. alert if `max(announced_at)` is > 36h behind `now()` on a trading week). This is the real fix —
   the outage is a symptom of having no monitoring on the asset.

---

## 6. Reflection — what we're missing, and how to actually get the alpha

Stepping back from the broken cron to the strategy. Exp16 returned NULL, and it's tempting to read that as
"midcap PEAD doesn't work." The honest read is sharper: **Exp16 tested a *slow* signal, entered *late*,
through a *weak* proxy — all three of which point away from where SachNetra's structural edge actually is.**
We're missing on three layers, in priority order:

### Layer 0 — a *live, monitored* feed (the precondition for everything)
The cron above. You cannot "be your own first customer" on a feed that can die for a week unnoticed. This is
cheap to fix and gates all of the below — a backtest on stale data is fiction the moment you try to trade it.

### Layer 1 — the fundamental *surprise* (SUE), not the price *reaction* (EAR)
Exp16's EAR proxy = the **day-0 price move**, which conflates a genuine earnings surprise with an
*overreaction* that mean-reverts (the opposite of drift). The leg that academically *drifts* is **SUE**
(actual EPS vs expectation). We flagged this as the binding limitation — and the data to fix it is **already
in our hands but unparsed**:
- **54% of our results filings are XBRL** (`has_xbrl=true`, 14,532/27,127 — measured today). XBRL is
  machine-readable structured financials: **actual quarterly EPS/PAT with no OCR**.
- Per [[2026-06-04_sue-leg-data-sourcing]], the canonical **time-series SUE** (Bernard–Thomas seasonal
  random walk) needs *only a history of quarterly EPS* — **no paid analyst-consensus feed**. So the
  drifting leg is buildable from data we already bank.
- **The wedge:** parse the XBRL EPS off the `attachment_url` / XBRL filings we already store → build a
  quarterly-EPS panel → compute time-series SUE → **re-run PEAD on SUE (or top-SUE ∩ top-EAR, the canonical
  intersection Exp16 could only half-do).** That tests the *real* surprise variable, not a sample-size patch.

> Note: more *history* alone (the "≥5–7y announcement backfill" Exp16 named) raises N and makes the recency
> test possible, but the EAR drift was ~+0.5% **and insignificant** — tightening the CI around ~0.5% still
> won't clear a 100–250 bps cost floor. **The miss is the signal, not the sample.** Backfill history *in
> service of* the SUE panel, not as a fix on its own.

### Layer 2 — the *fast* edge (latency), not the *slow* edge (multi-day drift)
This is the deepest miss. SachNetra's whole documented edge is **latency** — bourse filings lead the
newswire by hours on under-covered names ([[Exp4]]), the "escape" from the latency-vs-value squeeze
([[Exp10]]). **Exp16 entered at T+1 close — a full trading day after the filing — throwing the entire
latency advantage away** and testing only residual multi-day drift, which efficient markets arbitrage out.
The null may mean "we tested the wrong horizon," not "no edge."
- The alpha the thesis predicts lives in the **minutes-to-hours after a midcap filing hits**, before the
  slow wire and thin analyst coverage incorporate it — exactly the window Exp16 skipped.
- **What that needs:** (a) **intraday prices for midcaps** (`research_prices` is daily — this is the real
  data gap, more than announcement depth), and (b) a **real-time, monitored filing feed** (Layer 0 again —
  hourly is already too slow for an intraday capture, let alone a dead cron).
- Exp10 tested intraday on *large* caps → no value (wired fast). The clean, un-run test is **intraday on
  midcaps** — is the wire slow enough there to capture? We've never had the intraday midcap prices to ask.

### The one-line synthesis
**Fix and monitor the feed (Layer 0) → extract XBRL EPS we already hold and re-run PEAD on a real SUE
signal, not EAR (Layer 1) → get intraday midcap prices and test the fast latency-capture the thesis is
actually about, instead of the slow drift markets kill (Layer 2).** Exp16's null isn't a dead end; it's a
signpost that we tested the cheapest-to-build version of the bet and need to build the version the edge
actually lives in.

---

## 7. UPDATE — Gate 0 (Exp17) ran 2026-06-05: Layer 2 is 🔴 RED

We ran the free daily-data gate before any minute-data spend ([[Exp17]],
`scripts/research/exp17-intraday-reaction-gate.mjs`). **The intraday-capture bet (B) is dead — but not for
the reason expected.**

- **The reaction is LARGE, not small:** 35% of intraday-filer events and 44% of after-close events move
  **>2.5%** on the day. This *refutes* the simple "moves too small" reading of the Exp10 squeeze.
- **It does NOT persist:** top-quintile positive-EAR events drift **−0.34%** (intraday) / **−0.05%** (all)
  the next session — statistically zero, leaning negative. The market reprices *within the session*; a
  slower participant captures nothing net of 100–250 bps.
- **Geometry confirms the limit:** only ~25% of filings are intraday; ~44% of the after-close move is
  locked in a non-capturable overnight gap.

**So Layer 2 (the fast latency capture) is exhausted on NSE mid-cap *results* — the third efficiency null
after [[Exp16]] and [[Exp14]].** The squeeze, refined: reactions are big but *fully priced by the close*,
and on a public feed we aren't faster than the algos that price them. **Do not buy intraday data for a drift
bet.** The only cheap thread left is **Layer 1 / SUE selection** (XBRL we already hold) — worth one shot,
but the flat next-session canvas makes it a long shot. After that, the open lane is **G1 tagging**.

---

## 5. Relevance to Exp16 (and the real bottleneck)

This confirms [[Exp16]]'s structural finding: **the binding constraint is announcement-history depth, not
prices.** The table only goes back to **2024-05-30** (~2 years), because the V2-018 collector started then
— NSE's live API only serves a rolling recent window, so deep history needs an explicit backfill. That's
why Exp16 was capped at N=105 events and H16c (recency vs full-sample) was untestable.

**The unblock remains the same:** a historical `india_bourse_announcements` backfill (≥5–7 years) — the
same lever [[Exp14]] used — would lift N and make the fading-anomaly test real. Note this would *not*
come from the NSE live API (which only serves recent dates); it needs an archival source.

→ **The archival source is now scoped**: [[2026-06-05_earnings-history-backfill-source-scoping]] — prime
candidate is the **BSE corp-announcements API** (free, supports historical `from_date`/`to_date` ranges
unlike NSE; `fetchBSE()` stub already exists; ISIN-mappable). PARK, conditional on the SUE go/no-go, with a
Gemini recon plan to confirm BSE's actual archive depth before any backfill.

---

## Artifacts
- `scripts/research/check-earnings-announcements.mjs` — this read-only data check.
