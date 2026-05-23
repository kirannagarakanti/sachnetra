---
tags: [experiment, sachnetra, research, quant-finance, latency, lead-lag, product-a]
source: [[sachnetra_research_playbook]]
experiment_id: Exp4
status: COMPLETE
run_date: 2026-05-22
verdict: 🟡 SUPPORTED (the FIRST leading signal in the program — but modest & large-cap-gated) · bourse leads newswire 60.3% of the time, median +0.22h (~13 min), sign-test p≈0.002, n=239 · robust on scraped_at (66.7%, p<0.001)
audience: Lijo, James, future Claude Code sessions
---

# Experiment 4 — Does the bourse lead the newswire? (latency edge)

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> Follows [[Exp1]] (FII reacts, doesn't lead), [[Exp2]] (announcements too young), [[Exp3]]
> (sentiment coincident, not leading). This tests the **latency** thesis behind **Product A** —
> and is the **first experiment in the program to find a leading signal**, however modest.

---

## 1. Hypothesis (written before looking)

**H4:** *For a given company, the NSE filing (`announced_at`) systematically **precedes** the
matching news headline (`published_at`) by hours — i.e. the bourse leads the newswire.*

Direction: news lands **after** the filing. No price horizon — this is a **timestamp-delta** test,
not a return test. Falsifiable: if headlines arrive before filings (rumours/leaks) or at the same
time (wire republishes the filing instantly), H4 is rejected.

---

## 2. Why this experiment

Exp 1–3 converged on one finding: **every SachNetra signal examined so far is coincident with the
market, not leading it.** Exp 4 is different *in kind*. It does not test whether a signal predicts
**price**; it tests whether SachNetra's own filing feed beats the **newswire**. That is a **latency
edge** (be first to the fact), not a forecasting edge (predict the move) — and it's the one
leading-signal claim the research hasn't touched.

The pivot doc asserts *"the market reacts in minutes after a filing; journalists take hours."*
Exp 4 **measures** that claim instead of asserting it. A confirmed positive median lead is one of the
most compelling things to put in front of a B2B (Product A) pilot.

---

## 3. Method — paired timestamp delta (no price needed)

Script: `scripts/research/exp4-bourse-leads-news.mjs` (read-only — SELECTs only, writes nothing).

- **Match key:** announcement `symbol` ∈ news `nse_tickers[]` (NSE trading symbol, upper-cased).
  Optional `--use-companies` also matches `company_name` ∈ `companies[]` (looser; off by default).
- **Pairing:** for each announcement, find the **nearest** news item for the same ticker whose
  news-time falls within **±WINDOW hours** (default 48h) of `announced_at`; record the **signed**
  delta `Δ = published_at − announced_at`. **Positive Δ = news AFTER filing = bourse leads.**
- **Timezone:** both columns are `TIMESTAMPTZ` (absolute instants); the delta is computed from
  `EXTRACT(EPOCH …)`, so no IST alignment is needed — the interval is timezone-independent.

### 3.1 The critical design choice — a *symmetric* window
The window is symmetric on purpose. The naive design ("match each filing to the next headline after
it") would force every Δ positive and **fake-confirm** the hypothesis. A symmetric ±window lets Δ go
negative, so if rumours/leaks actually precede filings the test can detect it. **The sign of the
median is therefore a genuine measurement, not a construction artefact.**

### 3.2 Statistics (pure Node, no deps)
Lead-time distributions are heavy-tailed, so the headline statistic is robust + a sign test:
- **median / p10·p25·p75·p90** of Δ (hours) — the robust centre and spread;
- **sign test** — fraction of pairs with news-after vs a 50% coin flip (binomial z); **this is the
  headline number**;
- **mean Δ with a t-stat vs 0** — parametric, reported but secondary (distribution is non-normal);
- a **before/after histogram** (news-before / 0–1h / 1–6h / 6–24h / >24h after);
- a **per-category breakdown** (same Exp 2 buckets), guarded by `--min-events`.
- Significance markers: `*` p<0.10, `**` p<0.05, `***` p<0.01.

---

## 4. Commands run

```bash
node scripts/research/exp4-bourse-leads-news.mjs                       # default: ticker match, ±48h, published_at
node scripts/research/exp4-bourse-leads-news.mjs --time-col=scraped_at # sensitivity: OUR latency (upper bound)
# optional:
node scripts/research/exp4-bourse-leads-news.mjs --window=72           # widen match window
node scripts/research/exp4-bourse-leads-news.mjs --use-companies       # also match on company_name
node scripts/research/exp4-bourse-leads-news.mjs --require-market-moving
```

---

## 5. Data reality (the binding constraints — fill from the run's funnel)

The script prints a match funnel; recorded here — it is a real output of Exp 4 either way.

| Fact | Value | Consequence |
|---|---|---|
| Announcements with a symbol | 17,322 | denominator |
| ...whose ticker appears in **any** news item | **616** | gated by `nse_tickers` tagging coverage |
| ...with a nearest news item inside ±48h (**matched pairs**) | **239** (237 on `scraped_at`) | the usable N |
| News rows total | 17,461 | — |
| News rows with a **non-empty** `nse_tickers` | **301 (~1.7%)** | **the binding ceiling** — only ~1.7% of news is ticker-tagged |
| News rows with non-empty `companies` | 374 (~2.1%) | company-name match is no better |
| Distinct tags present | large-caps only (ITC, SBIN, RELIANCE, BHARTIARTL, …) | **large-cap-only result** (see §7.4) |
| Announcement date range | ~2026-04-21 → 2026-05-22 (rolling ~30-day NSE window) | can't backfill — accumulates forward |

### 5.1 The `.NS`-suffix bug (found and fixed mid-experiment)
The **first run returned 0 matched pairs.** Root cause was a key-format mismatch, *not* missing data:
news `nse_tickers` carry the Yahoo exchange suffix (`SBIN.NS`), while announcement `symbol` is the
bare NSE symbol (`SBIN`) — so `'SBIN.NS' ≠ 'SBIN'` and nothing joined. Fixed by canonicalising both
sides to the bare upper-cased symbol (`norm()` now strips a trailing `.NS`/`.BO`). **Lesson for future
joins: these two tables disagree on ticker format — always reconcile the suffix.** The fix is
permanent in `exp4-bourse-leads-news.mjs`.

> The remaining gate is real and not a bug: **only ~1.7% of news rows are ticker-tagged**, and only
> for large-caps. This is the analogue of [[Exp1]]'s DII gap and [[Exp2]]'s Nifty-only-prices ceiling —
> a James action item on the news pipeline, see §9.

---

## 6. Results (fill from run output — nothing omitted)

### 6.1 Default run (`published_at`, ±48h)

**Lead-time distribution (hours; + = bourse leads):**
| n | median | mean (t vs 0, p) | p10 | p25 | p75 | p90 |
|---|---|---|---|---|---|---|
| 239 | **+0.22** | +2.19 (t=2.43, p=0.015 **) | −11.30 | −1.19 | +5.96 | +19.00 |

**Sign test (news after filing vs coin flip):**
| news after | news before | ties | fraction after | z | p | sig |
|---|---|---|---|---|---|---|
| 144 | 95 | 0 | **60.3%** | 3.17 | **0.002** | *** |

**Arrival histogram:**
| bucket | count |
|---|---|
| news BEFORE filing (<0) | **95** |
| 0–1h after | 52 |
| 1–6h after | 34 |
| 6–24h after | 43 |
| >24h after | 15 |

**Per-category lead (min 20 pairs):**
| bucket | N | median(h) | mean(h) | %after |
|---|---|---|---|---|
| acquisition | 21 | 1.98 | 3.81 | 67% |
| financial_results | 22 | 0.30 | −1.48 | 82% |
| board_meeting | 21 | 0.26 | 0.29 | 62% |
| dividend | 23 | 0.23 | 0.00 | 70% |
| ALL | 239 | 0.22 | 2.19 | 60% |

### 6.2 Sensitivity run (`--time-col=scraped_at`)
`scraped_at` is **our** collection time, not the newswire's — an **upper bound** on the apparent
lead. The lead survives on `published_at` and *grows* on `scraped_at` (0.22h → 0.75h), exactly the
expected signature: the extra ~0.5h is our own polling latency added on top of the journalists'.

| stat | published_at | scraped_at |
|---|---|---|
| matched pairs | 239 | 237 |
| median Δ (h) | +0.22 | +0.75 |
| mean Δ (h) | +2.19 | +2.94 |
| fraction after | 60.3% | 66.7% |
| sign-test p | 0.002 *** | <0.001 *** |

---

## 7. Interpretation

1. **The bourse does lead the newswire — directionally confirmed, for the first time in the program.**
   60.3% of matched headlines land *after* the filing vs 39.7% before (sign-test z=3.17, **p≈0.002**).
   This is not a coin flip, and it's the **first leading signal** in Exp 1–4 — every prior signal was
   coincident with price. The result is robust: it holds on both time bases (§6.2) and in every
   category bucket (62–82% news-after).

2. **But the lead is small, and the distribution is messy.** Median lead is **+0.22h (~13 minutes)**,
   not the "hours" the pivot doc claims. The mean (+2.19h) is larger only because of a long right tail
   (p90 = +19h). Crucially, **95 of 239 pairs (40%) have news *before* the filing.** Some of that is
   genuine (a board-meeting *outcome* filing follows earlier news that the meeting was scheduled), but
   much is **matching noise** — the nearest headline in ±48h is often reporting a *different* event,
   not that filing. The 40%-before is the honest counterweight to the headline 60%.

3. **The measured lead is the journalists' latency, not ours.** Going from `published_at` (median
   0.22h) to `scraped_at` (median 0.75h) *grows* the lead by ~0.5h — that increment is **our own
   polling cadence** stacking on top. So our infrastructure isn't manufacturing the edge; if anything
   our collection latency *understates* how fast we could theoretically be off the raw NSE feed.

4. **The result is large-cap-only — which means it understates the valuable case.** Only ~1.7% of news
   is ticker-tagged, and only for large-caps (ITC, RELIANCE, SBIN…). Large-caps are exactly where the
   newswire is **fastest** (wire services cover a RELIANCE filing in minutes), so a 13-minute lead is
   the *floor*. The real Product A thesis lives in **mid/small-caps**, where journalists are slow or
   absent and the lead should be *hours* — and those names are not tagged at all yet. **We measured
   the hardest case and still found a lead.** That is the encouraging read.

5. **Verdict: 🟡 SUPPORTED but modest & gated.** The narrow claim ("the bourse leads the newswire") is
   confirmed and robust. The *valuable* claim ("we beat journalists by hours on actionable names") is
   **not yet proven** — it's blocked by ticker-tagging coverage, not by the thesis. This is the first
   green shoot in the research program; it justifies investing in the tagging pipeline to test the
   version that actually sells (§9).

---

## 8. Caveats & limitations (read before citing this)

- **Matching noise.** Pairing is ticker + nearest-time; the nearest headline may report a
  **different** event than the nearest filing. No semantic match between filing subject and headline.
- **`published_at` provenance.** It is the feed's *stated* publish time. If a feed actually emits its
  fetch/scrape time, the lead is overstated — hence the `scraped_at` sensitivity run as a bound.
- **One news item can match multiple nearby filings** (filings cluster: board meeting + results +
  dividend same day). Inflates pair count without adding independent information.
- **Data age.** Announcements are a rolling ~30-day NSE window; scored/tagged news ramped mid-May
  2026. Small N likely → treat as a baseline, re-run monthly (same posture as [[Exp2]]/[[Exp3]]).
- **Ticker-tagging coverage** on `india_news_signals.nse_tickers` upper-bounds what's matchable; thin
  tagging looks like "no edge" but is really "no join".
- **p-values normal-approximated** (sign-test z, mean t). Fine at moderate N; read small-N runs as
  indicative only.
- **No semantic verification** that a matched headline is *about* that filing — a precision ceiling.

---

## 9. Action items / what unblocks a stronger Exp 4

**§5 confirmed the gate is here** — only ~1.7% of news is ticker-tagged, large-caps only.

| # | Need | Why | Owner |
|---|---|---|---|
| 1 | **Widen `nse_tickers` tagging coverage** (esp. mid/small-caps) | Only 301/17,461 news rows (~1.7%) are tagged, all large-cap. This is THE gate: 98% of news is invisible to the join, and large-caps are where the wire is fastest, so we're locked into the weakest case. Tagging mid/small-caps unblocks the *valuable* (hours-of-lead) version. | **James** (news pipeline / NER over headline+body → `market-taxonomy.json`) |
| 2 | **Standardize ticker format across tables** | News stores `SBIN.NS` (Yahoo suffix); announcements store bare `SBIN`. Mismatch silently zeroed the first run. Latent bug for ANY news↔announcement/price join. Canonicalize at write time or document loudly. | **James** |
| 3 | **Let announcements + tagged news accumulate; re-run monthly** | N=239 today (rolling 30-day window + young tagged-news). Per-category lead times become trustworthy only with calendar time. | time + collectors running |
| 4 | **Semantic filing↔headline match (future Exp 4b)** | Replaces "nearest in time" with "is this headline actually about this filing" (embedding similarity, subject vs headline). Kills the 40%-news-before matching noise → a precise per-event lead, the clean number for a B2B pilot. | future Exp |

---

## 10. Outputs & artifacts

- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): row **H4** logged 2026-05-22.
- **Code:** `scripts/research/exp4-bourse-leads-news.mjs` (read-only; includes the `.NS`-suffix fix).
- **Data used:** `india_bourse_announcements` (V2-018) + `india_news_signals` (`nse_tickers`,
  `published_at`). No price series needed — first experiment that doesn't touch `research_prices`.
- **Diagnostic:** the empty-join probe (`_exp4-diagnose.mjs`) was temporary and has been deleted;
  its evidence is preserved in the Appendix (§14) so it never needs re-running.

---

## 11. Reproducibility

Deterministic given the same DB snapshot — **but the announcement window slides forward daily**
(rolling NSE feed) and news accumulates, so re-running later samples more (and different) pairs.
Re-run: the commands in §4. Flags: `--window=N`, `--time-col=published_at|scraped_at`,
`--use-companies`, `--require-market-moving`, `--min-events=N`, `--from=`, `--to=`.

---

## 12. Next experiment

**Exp 5 — sentiment + flow tails vs market shocks (EVT teaser).** Co-occurrence of worst-decile
sentiment / largest FII-outflow days with worst ^NSEI days vs a random baseline; later a Generalized
Pareto on the tail. Turns OSINT/sentiment into a *risk* product, not just a *direction* product.

---

## 13. Cross-experiment summary (update after Exp 4 runs)

| Exp | Signal | Verdict | Leading? |
|---|---|---|---|
| 1 | FII daily flow | ❌ no next-day prediction | coincident only |
| 2 | NSE announcements (price) | ⬜ inconclusive (1 mo data) | same-day pop; post-drift unproven |
| 3 | News sentiment | ⬜ inconclusive (16 days) | coincident (~0.56 same-day) |
| 4 | Bourse vs newswire (latency) | 🟡 supported (modest, large-cap-gated) | **YES — first leading signal**: 60% news-after, median +13 min, p=0.002 |

**The honest state after Exp 4:** three of four signals are coincident; the fourth (Exp 4) is the
first to *lead*, but it leads the **newswire**, not **price**, by a modest ~13 min on large-caps. The
strategic implication is unchanged and now sharper — *the database is the asset; the proof needs the
collectors running AND the news pipeline tagging more tickers* so the mid/small-cap version (where the
real hours-of-lead edge should live) becomes testable.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Scaffold created (method, design rationale, placeholders) ahead of the prod run. |
| 2026-05-22 | Run complete. Found + fixed the `.NS`-suffix join bug (first run = 0 pairs). Filled all result tables (n=239, 60.3% news-after, p≈0.002; scraped_at sensitivity 66.7%, p<0.001), interpretation, verdict 🟡 SUPPORTED, and the ~1.7% ticker-tagging ceiling. First leading signal in the program. |

---

## 14. Appendix — diagnostic evidence (the empty-join investigation)

When the first run returned 0 matched pairs, a read-only probe (`_exp4-diagnose.mjs`, since deleted)
established exactly why. Preserved here verbatim so the conclusions never need re-deriving.

### 14.1 News ticker-tagging coverage — the binding ceiling
```
india_news_signals:
  total rows ................................. 17,461
  nse_tickers non-null ....................... 17,461   (column always present)
  nse_tickers NON-EMPTY (array_length > 0) ...    301   (~1.7%)   ← the real coverage
  companies  non-empty .......................    374   (~2.1%)
  published_at present ....................... 17,461
```
**Takeaway:** the column is never NULL, but it's an empty array on ~98% of rows. Coverage — not
NULL-ness — is the constraint. Company-name tagging is no better (~2.1%).

### 14.2 The format mismatch — why the join was empty (the bug)
```
sample nse_tickers (news)            sample symbol (announcements)
  ['SBIN.NS','TITAN.NS']               20MICRONS
  ['INDUSINDBK.NS']                    360ONE
  ['BHARTIARTL.NS']                    3MINDIA
  ['TATAMOTORS.NS']                    AARTIDRUGS
                                       ...
overlap (upper(ticker) = upper(symbol)) ......... 0 symbols
overlap via company name ........................ 0 companies
```
News tickers carry the Yahoo `.NS` suffix; announcement symbols are bare. `'SBIN.NS' ≠ 'SBIN'` → zero
overlap. Fix: `norm()` strips a trailing `.NS`/`.BO`. After the fix, 616 announcement symbols overlap
a news ticker and 239 fall within the ±48h window.

### 14.3 What IS tagged — top news tickers by frequency (all large-cap)
```
ITC.NS 41 · SBIN.NS 31 · RELIANCE.NS 27 · BHARTIARTL.NS 27 · SUNPHARMA.NS 22 · MARUTI.NS 20 ·
NTPC.NS 19 · HINDALCO.NS 18 · EICHERMOT.NS 18 · GRASIM.NS 16 · TCS.NS 15 · TATASTEEL.NS 13 ·
M&M.NS 12 · APOLLOHOSP.NS 9 · DRREDDY.NS 8
```
Every tagged name is a Nifty large-cap. Announcement symbols, by contrast, span the whole listed
universe (`20MICRONS`, `3IINFOLTD`, `AARTIDRUGS`, …) — almost all mid/small-cap. This is why §7.4
calls the result large-cap-only and a *floor*: the names where journalists are slowest (mid/small-cap)
are precisely the ones the news pipeline never tags.
