---
tags: [experiment, sachnetra, research, quant-finance, latency, event-study, mid-cap, filing-vs-press, coverage, pre-design-brief]
source: [[sachnetra_research_playbook]], [[Exp4]], [[Exp10]], [[project-latency-value-tradeoff]], [[exp16_brief]]
experiment_id: Exp21
status: BRIEF — pre-registration design phase · the TIMING half is runnable NOW (announcements fresh post-V2-018d; news live; G1 tagging improved). Price-impact half deferred to a follow-on (needs research_prices, currently stalled).
authored_date: 2026-06-09
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Pre-register the filing→press LATENCY measurement across market-cap tiers — does an NSE filing give a bigger head-start over the press for mid/small-caps than large-caps? Built on the latency-vs-value squeeze ([[Exp4]]/[[Exp10]]). Includes a web-search coverage-honesty layer so the head-start isn't faked by our own feed gaps.
registry_note: "Claims Exp21 (next free per _index.md). _index row + 'next free ID → Exp22' to be added when this brief is accepted — this file does not edit _index.md."
---

# Experiment 21 — Brief: Filing→Press Latency by Market-Cap Tier (the "head-start" measurement)

## 1. Why this experiment, why now

SachNetra's event-arbitrage thesis rests on one untested number: **the head-start.** You collect the **NSE
filing** (the primary source, exact timestamp in `india_bourse_announcements`) AND the **press coverage** of
it (`india_news_signals`). The gap between those two clocks = how long you know something before the crowd.

[[Exp4]] found the filing leads the newswire by ~13 min, but only on **large-caps** — where the price moves
instantly, so the lead buys nothing (the **latency-vs-value squeeze**, [[Exp10]] / [[project-latency-value-tradeoff]]).
The documented escape: **mid/small-caps**, where the press is slow and under-staffed, so the filing should
lead by *much more* and the stock hasn't moved yet. **This experiment measures whether that head-start
actually grows as company size shrinks.** If it does, there is a tradable window; if it's flat across tiers,
the thesis is in trouble.

**Why now:** announcements are fresh again (V2-018d fix, 2026-06-09), the news cron is live, and the G1
historical re-tag improved ticker coverage — so filings and news can finally be joined per-stock.

> **Scope split (read this).** This brief covers the **TIMING half** — *how big is the head-start, by tier* —
> which needs only announcements + news + tagging, all available now. **It does NOT test whether the window
> is profitable** (does the price drift inside it?). That payoff half needs `research_prices` (currently
> stalled since 2026-05-29) and is filed as the **Exp22 follow-on**. A head-start with no price move is
> worthless; a price move with no head-start is unreachable — Exp21 proves the *first* precondition only.

---

## 2. Core hypotheses (written before looking)

- **H21a (head-start exists & grows down-cap):** The lag `first_press_time − filing_time` is **positive** and
  its central tendency **increases monotonically** from large → mid → small cap. (Large-cap ≈ the [[Exp4]]
  ~minutes; mid/small materially larger.)
- **H21b (coverage honesty — the load-bearing guard):** Our RSS-measured lag is a **biased proxy** of the true
  public-first-appearance time. On a web-searched sample, (i) the RSS lag is *confirmed* where we have the
  outlet, and (ii) a measurable share of mid/small-cap filings are either covered *late by us* (a fixable
  feed gap) or **not covered quickly by any press** (the purest latency signal — the filing stands alone).
- **H21c (the un-arbitraged tail):** The share of filings with **no fast press coverage at all** is higher for
  small/mid than large — i.e. the smaller the firm, the more often the filing is the *only* early signal.

### Pre-registered success reads
| Outcome | Trigger |
|---|---|
| ✅ SUPPORTED | Median lag rises large→mid→small with non-overlapping bootstrap CIs **AND** a rank test (Kruskal–Wallis across tiers) rejects "same distribution" at p<0.05 **AND** the web-sample confirms the RSS lag is not an artifact of our own coverage |
| 🟡 PROMISING | Lag is larger for mid/small but noisy / CIs overlap, or the signal is concentrated in one category (e.g. only "results") |
| ❌ NULL | Lag does not grow down-cap (flat or non-monotone) — the press is *not* meaningfully slower on mid/small ⇒ no latency escape from the squeeze |
| 🚩 SUSPECT | Apparent edge is an artifact of `published_at` unreliability, our feed gaps, or matching errors (caught by the H21b web-sample) |

---

## 3. Method

### 3.1 Events (the "filing" clock)
- Source: `india_bourse_announcements`, **material** categories only (financial results, board outcomes,
  orders/awards, fund-raising, M&A, ratings) — exclude routine/procedural filings (e.g. trading-window
  notices). Pre-register the category include-list before running.
- Each event must be **tagged to a single NSE ticker** (G1 `nse_tickers`) to join to news and to assign a cap
  tier. Multi-ticker / untagged filings are dropped (documented coverage loss).
- **Cap tier** = index membership as a proxy: Nifty 100 = large, Nifty Midcap 150 = mid, Nifty Smallcap 250 =
  small, else = micro/other (reported separately, not in the main test). Survivorship caveat: today's
  membership applied back over the window.

### 3.2 The press clock (RSS)
- For each event, find the **first** `india_news_signals` row that (a) is tagged to the same ticker and (b) has
  a timestamp **after** `announced_at`, within a **48 h** match window.
- Lag = `news_time − announced_at`. **Primary clock = `scraped_at`** (when *we* ingested it — under our
  control, reliable) with **`published_at` as a cross-check** (outlet-claimed, noisier, and Google-News-proxy
  feeds report Google's time). Report both; flag events where they disagree by >30 min.
- No-match-within-48h = **"RSS miss"** (carried into the H21b/H21c buckets, NOT counted as lag=0 or dropped
  silently).

### 3.3 The web-search coverage-honesty layer (Lijo's requirement — the heart of this)
A **stratified sample** (~50 events: large/mid/small balanced, spanning the date range and the RSS-miss set)
gets a targeted **web search** ("<company> <subject> <date>") to find the **true earliest public appearance**
of the news. Each sampled event lands in one bucket:

| Bucket | Meaning | Action |
|---|---|---|
| **A — We caught it** | our RSS first-appearance ≈ the web's earliest | RSS lag is real; no action |
| **B — Missed by us, caught by press** | an outlet *we don't ingest* broke it earlier than our feeds | **coverage gap** → record the outlet; if it publishes an **addable RSS feed**, list it as a feed-addition candidate |
| **C — Missed by press (filing-only)** | no press covered it quickly; only the filing exists | the **purest latency edge** — the filing is the sole early signal |

Outputs: (1) a **correction factor** on the RSS lag (how often/by how much our feeds lag the true first
appearance), (2) a **candidate-source list** (Bucket B outlets that are addable), (3) the **filing-only rate**
(Bucket C) per tier (feeds H21c).

> **"Only if we can add the source."** A Bucket-B outlet becomes a candidate **only if** it (a) publishes a
> usable RSS/Atom feed and (b) can pass the three-file allowlist (`shared/rss-allowed-domains.json` +
> `api/_rss-allowed-domains.js`). Breaking sources with no feed (X/Twitter, paywalled terminals, PDF-only) are
> **recorded but not addable** — noted, not chased. **Actually wiring addable feeds in is a separate follow-on
> config task (Exp21-feeds), not part of this measurement.**

### 3.4 Stats
- Per tier: **median lag + 95% bootstrap CI**; full distribution (lags are heavy-tailed → medians, not means).
- Down-cap monotonicity: **Kruskal–Wallis** across tiers + pairwise Mann–Whitney (large vs mid, mid vs small).
- RSS-miss rate and Bucket-C (filing-only) rate per tier.
- All split also **by category** (results vs orders vs M&A) — the head-start may live in specific event types.

### 3.5 `--selftest`
Synthetic events with known injected lags → assert the matcher recovers them and the tier rank test fires on a
known-monotone vs known-flat fixture.

---

## 4. Potential traps & caveats (locked in advance)

1. **`published_at` unreliability / Google-News-proxy feeds** — primary clock is `scraped_at`; `published_at`
   is cross-check only. Disagreements flagged.
2. **Matching fuzziness** — same-ticker + time-window is approximate; a later unrelated story about the same
   company can mis-match. Mitigate with the 48 h window + optional subject-keyword overlap; spot-check the
   web sample.
3. **Tagging coverage caps the sample** — only tagged filings/news join; thin coverage biases toward
   well-covered (larger) names. Report the matchable fraction per tier honestly.
4. **~5-week data depth** — first read, not a verdict; small-N per tier. Re-run as the archive deepens.
5. **Web search ≠ exhaustive** — a sample, and search engines miss/rank-bias; treat Bucket assignment as
   best-effort ground truth, not perfect.
6. **Survivorship** — today's index membership applied historically.
7. **Our own ingest latency** — the 10-min news cron means `scraped_at` lags true RSS publish by up to ~10
   min; this is a *constant* we note (and is itself part of "how fast can WE act").
8. **Timing ≠ profit** — Exp21 proves head-start only; the price-move-inside-the-window test is **Exp22**
   (needs `research_prices`). Do not conclude "tradable edge" from Exp21 alone.

---

## 5. Execution plan & next steps
1. **Script** `scripts/research/exp21-filing-press-latency.mjs` (read-only on prod; research lane).
2. Build the event set, assign tiers, match to first press, compute lag (both clocks).
3. Stratified sample → **web-search** layer → bucket A/B/C, correction factor, candidate sources, filing-only
   rate.
4. Stats (§3.4), write `wiki/experiments/Exp21.md` (post-run record); add the H21 register row to the playbook;
   claim Exp21 in `_index.md`.
5. **Follow-ons:** (a) **Exp21-feeds** — add the vetted addable Bucket-B sources via the 3-file allowlist;
   (b) **Exp22** — price-drift-inside-the-window (gated on the `research_prices` revival).

---
*Pre-registered design only. Measures the head-start and its honesty (vs our own coverage); it does not claim
the window is profitable — that is Exp22. Built on [[Exp4]]/[[Exp10]] and the latency-vs-value squeeze.*
