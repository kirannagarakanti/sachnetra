---
tags: [synthesis, sachnetra, quant-finance, strategy, exp4, exp10, positioning, decision-grade]
source: [[Exp4]], [[Exp10]], [[research_state_summary]]
audience: Lijo (founder/operator) + future Claude Code sessions
created: 2026-05-25
purpose: Document the most important strategic finding from the Exp 10 session — that SachNetra's latency edge and the price impact it implies are structurally inversely related — so neither Lijo nor a future agent has to re-derive it.
---

# The Latency-vs-Value Tradeoff

> **The most important finding from the Exp 10 session (2026-05-24).** It's not a number — it's
> a structural pattern that reshapes what SachNetra's latency edge can plausibly monetise.

---

## TL;DR

SachNetra sees NSE corporate filings ~13 minutes (median) before Indian newswires
([[Exp4]] proved this). The session that ran Exp 10 + the Gemini news-backfill loop
discovered that **this head start is biggest on events where the price barely reacts, and
smallest on events that actually move price**. The valuable corner — *long lead* AND *big
impact* — does not exist in the large-cap universe we measured.

This is structural, not a bug: journalists pay attention to what moves markets and ignore
what doesn't. So our timing edge is biggest exactly where there's nothing to trade.

**Recommended escape route: switch the experimental universe from large-caps to
mid/small-caps**, where both halves of the tradeoff plausibly improve. This is currently
blocked by **G1** (news ticker-tagging coverage at only 1.7%, all large-cap). Fix G1 first;
then re-run [[Exp4]] and [[Exp10]] on a mid-cap universe; the result is decision-grade either
way.

---

## 1. The session that produced this finding (so future agents can locate it)

**Dates:** 2026-05-24 (Exp 10 design + execution + Gemini news-backfill loop).

**Files produced in that session:**
- `scripts/research/backfill-intraday-prices.mjs` — 5-min OHLCV backfill, 69,855 rows.
- `scripts/research/exp10-intraday-filing-event-study.mjs` — read-only event study.
- `scripts/research/output/exp10/` — `exp10_events_matched.csv`,
  `exp10_events_unmatched.csv`, `exp10_results_summary.csv`,
  `exp10_events_gemini_verified.csv`.
- `ai_docs/sachnetra v2/wiki/experiments/Exp10.md` — pre-registered + filled
  (§6/§7/§7.4b/§8/§9.1/changelog).
- `ai_docs/sachnetra v2/wiki/experiments/exp10_gemini_news_backfill_brief.md` — the
  operator brief Lijo pastes to Gemini.

**What Exp 10 was trying to do:** measure whether Exp 4's 13-min latency edge translates
into an intraday price reaction big enough to trade on, for the 15 tagged large-caps.

**What Exp 10 produced as a price verdict:** ⬜ INCONCLUSIVE + 🚩 SUSPECT (the pre-registered
§5 gate fired correctly — see [[Exp10]] §8). Real distinct-event N is ~8.

**What Exp 10 produced as a *strategic* finding:** the latency-vs-value tradeoff documented
in this synthesis. That is the meaningful output, not the +95 bps t+60min number that
collapsed under concentration.

---

## 2. The thesis we were testing

The premise behind SachNetra's quant program has always been one sentence:

> *"We see corporate filings on NSE the moment they're published. News journalists take
> longer to write articles about them. That head start is our edge — we know the fact
> before journalists do, so we can trade before everyone else reacts."*

[[Exp4]] proved this is real: when a large-cap files something on NSE, the matching news
headline shows up on Mint / Moneycontrol / ET about **13 minutes later** (median; sign-test
p=0.002, n=239). That window — when SachNetra has the fact and the wire does not — is the
latency edge.

The next question is whether you can monetise it.

---

## 3. The two preconditions for tradability

To profit from being first to a fact, you need **both** of:

- **(a) A meaningful head start** — enough time to react before the market does.
- **(b) A price reaction worth catching** — the news actually moves the stock enough to
  cover fees, slippage, and risk.

(a) without (b) is being early to news that doesn't matter.
(b) without (a) is being late to news that does.

Both must be simultaneously true on the same event for the edge to translate to PnL.

---

## 4. What the data showed — the squeeze

When you look at the events SachNetra actually collected over the rolling 30-day window
(289 filings on the 15 tagged large-caps, 29 in market hours + tradeable categories), and
you sort them by impact and by lead:

### 4.1 The high-impact events have short head starts

Q4 earnings results are the single biggest price-moving events in stocks. An ITC Q4 results
disclosure can move the price 3–5% in an hour.

But **journalists know exactly when Q4 results are due**. They have reporters at their desks,
fingers poised, waiting for the PDF to drop. The moment the filing lands, they hit publish.

Measured leads on Q4 results we saw (from the Gemini loop in [[Exp10]] §7.4b):
- **MARUTI 2026-04-28:** filing 14:41 IST → Mint headline 15:34 IST = **53 min lead**
- **M&M 2026-05-05:** filing 12:22 IST → Livemint headline 12:27 IST = **5 min lead**

By the time a human reads the filing, decides good/bad, and clicks buy, that 5–60 min lead
is already gone.

### 4.2 The high-lead events have zero impact

The Gemini loop also found two filings where SachNetra had the data and **no journalist ever
wrote about it**, across 6 tier-1 Indian financial-news sites:
- **ITC absorbing Sresta Natural Bioproducts** (a small organic-foods subsidiary)
- **RELIANCE buying Kandla GHA Transmission** (a small power-transmission asset)

For these, our "lead" isn't 13 minutes — it's *infinite*. Nobody on the wire ever picked
them up.

But: **these events don't move the stock.** Reliance is a $200B+ company. A small
power-asset acquisition is a rounding error. *The reason no journalist wrote about it is the
same reason no trader would care.*

### 4.3 The squeeze, visualised

```
                    HIGH IMPACT  ←——————————→  LOW IMPACT
                  (Q4 results, M&A)        (small subsidiaries)

                  Short head start          Infinite head start
                    (5–60 min)               (no coverage at all)
```

The **valuable corner** — high impact AND long head start — was empty in everything we
measured. The events fall on the diagonal.

### 4.4 Why this is structural, not a bug

This isn't a measurement artifact we can fix with more data or better collectors. It's a
truth about how financial journalism works: **journalists allocate attention exactly to the
events markets care about, and ignore the rest.** So our timing edge is biggest precisely
where the market wouldn't move on the information anyway.

That structural pattern — call it the *latency-vs-value squeeze* — is the meaningful output
of Exp 10. It reshapes the question from "can SachNetra make money?" to "where in the market
does the squeeze relax?"

---

## 5. Three plausible escape routes

If the squeeze applies universally to the SachNetra universe, the quant thesis dies. The
question is whether there's any subset of the market where the squeeze loosens.

### Option A — Build software that reads filings instantly

Even a 5-minute lead is enough to trade — **if** you know whether the news is good or bad
the moment it arrives. A human can't parse a 40-page Q4 results PDF in 5 minutes. Software
can.

If SachNetra had a parser that read MARUTI's Q4 PDF the instant it arrived and produced
"PAT down 7% YoY, miss vs consensus → SHORT", that 5-minute lead becomes more than enough
execution time.

- **Pros:** Solves problem (b) by making problem (a) sufficient. Turns the short leads we
  *have* into tradable signals on the *big-impact* events.
- **Cons:** Real engineering project — months, not days. Different filing types have
  different formats; consensus estimates need a separate data source; the parser must be
  robust enough to trade on without manual review.
- **When to revisit:** as a fallback if Option B disappoints.

### Option B — Switch the universe from large-caps to mid/small-caps (recommended)

Everything measured so far is on **15 large-caps** (Reliance, SBI, ITC, etc.). Those names
have dozens of journalists watching them — that's why the wire is so fast.

But India has **~4,000 listed companies**. For names like Astral, Inox Wind, Aarti Drugs,
how many financial journalists are actively monitoring their NSE filings? Almost none.
Coverage of mid/small-cap filings is often *hours or days* late — sometimes nonexistent.

AND a second effect: **smaller stocks are more price-sensitive**. A news event that moves
Reliance 0.5% can move a mid-cap 5%, because fewer shares trade hands to absorb it.

So **both halves of the squeeze improve at the same time on mid/small-caps**:
- Head start gets bigger (wire is slow on under-covered names)
- Price impact per event gets bigger (thin trading amplifies moves)

This is the **valuable corner** the original SachNetra thesis actually points at. It is the
hypothesis [[Exp4]] §7.4 explicitly flagged when it said *"we measured the hardest case
(large-caps) and still found a 13-min lead; the real edge should be much bigger on mid-caps."*

- **Pros:** Addresses both halves of the squeeze in one shot. Consistent with every prior
  finding. Has a clean engineering unblocker (see §7 below).
- **Cons:** We currently **can't even measure this**. Our news pipeline tags only ~1.7% of
  articles by ticker ([[Exp4]] §14.1), and almost all those tags are large-cap. There is no
  mid-cap news data to join against mid-cap filings. **This is the [[_data_gaps_backlog]] G1
  problem.**
- **Status:** blocked on G1 (James task on the news pipeline NER). Once G1 ships, re-run
  Exp 4 + Exp 10 on a mid-cap universe; one month of data accumulation will produce a
  verdict.

### Option C — Aggregate many small-impact events as a portfolio

If each small filing moves a stock by ~5 bps on average and SachNetra sees 50 such filings
per day, theoretically you could capture 50 × 5 = 250 bps/day across a portfolio.

- **Pros:** Uses exactly the events where SachNetra's lead is biggest.
- **Cons:** Assumes the tiny moves are real (at 5 bps you're at the edge of measurement
  error). Requires portfolio-construction software (weighting, exit logic, multi-trade risk
  management). The 5 bps assumption is also unmeasured — probably optimistic.
- **Status:** weakest of the three. Don't chase first.

---

## 6. The recommendation

**Pursue Option B.** Fix G1 first (mid/small-cap news ticker tagging on
`india_news_signals.nse_tickers`). Then re-run [[Exp4]] and [[Exp10]] on a mid-cap universe.

Two reasons:
1. It addresses both halves of the squeeze simultaneously.
2. It has a clean unblocker: G1 is a defined, scoped James task on the news pipeline (NER
   over headline + body, write tags back into the `nse_tickers` array). Not vague.

### Outcome tree

| Result after G1 + mid-cap re-run | What it means | Next step |
|---|---|---|
| Mid-cap leads ≥ 1h AND mid-cap price impact ≥ large-cap × 2 | The valuable corner exists. Thesis intact. | Proceed to [[Exp11]] — paper-trade the rule for 30 days. |
| Mid-cap leads ≥ 1h BUT price impact comparable to large-cap | Lead exists, impact doesn't. Squeeze partial. | Layer Option A (NLP) to extract direction; combine. |
| Mid-cap leads no bigger than large-cap | Wire is faster on mid-caps than expected. Squeeze universal. | Pure-latency thesis dies. Pivot to a different edge (volatility — [[Exp6]] outflow asymmetry survived [[Exp8]] — or NLP-based fundamentals). |

All three outcomes are decision-grade. Right now we're stuck because we can't distinguish
them. G1 is the gate.

---

## 7. What's blocked, who unblocks it, what's parallel

### Blocked on G1 (waiting on James)
- The Exp 4 mid/small-cap re-measurement (the most valuable Exp 4 follow-up).
- The Exp 10 mid/small-cap event study (the actual test of this synthesis's recommendation).

**G1 spec:** widen news ticker tagging from ~1.7% to ≥30% coverage, including mid/small-caps,
by adding a proper NER pass over the headline + article body and writing to
`india_news_signals.nse_tickers`. Specifics live in [[_data_gaps_backlog]] G1.

### Parallel, no blockers
- **Monthly re-run of [[Exp10]]** as the rolling 30-day window slides forward. Even without
  changes, the event count grows by ~6–10 distinct corporate events per month. The script
  bugs from [[Exp10]] §9.1 (multi-filing-per-event inflation, near-close snap-to-next-day,
  no direction extraction) should be fixed before the next monthly re-run.
- **Reuse the Gemini brief** ([[exp10_gemini_news_backfill_brief]]) on each monthly
  unmatched CSV. Each loop calibrates the gap from below and produces useful coverage data.
- **Keep all collectors running.** The autonomous pipeline produces the data that makes
  everything testable.

### Should NOT be done now
- **Don't trade on the Exp 10 v1 numbers.** Pre-registered verdict was INCONCLUSIVE +
  SUSPECT; the +95 bps t+60min number is a story about 3 days, not a tradable signal.
- **Don't add more data sources** (commodity prices, electricity, FASTag, etc.) until G1 +
  the mid-cap re-run produces a verdict. Adding sources without modeling them is
  collection-anxiety, not strategy.

---

## 8. For future Claude Code sessions

If you land in a SachNetra session and the user asks something that implicates
filing-to-news latency, the Exp 4 thesis, "should we trade on the latency edge", or "what
should we build next" — this doc is the load-bearing context. Specifically:

- **The Exp 4 number is real (~13 min median, p=0.002) but is the floor**, measured on the
  large-caps where the wire is fastest. Do not promote it to "tradable" without the
  mid/small-cap version.
- **The Exp 10 v1 +95 bps result is not a green light** — it failed the pre-registered
  concentration check and the §5 INCONCLUSIVE rule. Future runs supersede it once N≥60.
- **Before recommending Option A, B, or C**, verify: is G1 fixed yet? Check `india_news_signals`
  tagging coverage with `SELECT COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0) ::float
  / COUNT(*) FROM india_news_signals`. If still ~1.7%, the recommendation in §6 stands; if it
  has improved, Option B can actually be executed.
- **The [[_data_gaps_backlog]] is the staging ground** for the eventual bundled James task.
  This synthesis's G1 push should be appended there with its experiment-driven justification,
  not filed as a new mid-research task ([[feedback-external-agent-recon]] applies in spirit).
- **Don't re-derive this finding** — link to it. If new experiments confirm or invalidate it,
  update §11 and §6's outcome tree, not the framing.

---

## 9. Cross-references

| To understand… | Read |
|---|---|
| The full Exp 4 result (the latency measurement) | [[Exp4]] |
| The full Exp 10 result (the price-reaction test) | [[Exp10]] |
| The Gemini news-backfill workflow that surfaced this finding | [[exp10_gemini_news_backfill_brief]] |
| What G1 specifically is, and how to fix it | [[_data_gaps_backlog]] G1 |
| Why "be your own first customer" is the positioning context | [[positioning_v2]] |
| Plain-English summary of all experiments | [[research_state_summary]] |
| The canonical hypothesis register | [[sachnetra_research_playbook]] |

---

## 10. The two sentences to remember

If everything else in this doc evaporates, these are the load-bearing claims:

> **(1) The events with the biggest head start are the events with the smallest price
> impact, and vice versa — that's the squeeze.**

> **(2) The cleanest path out is mid/small-caps, where both halves of the squeeze plausibly
> loosen — but we can't measure that until G1 (news ticker-tagging coverage) is fixed.**

Everything operational follows from those two.

---

## 11. Changelog

| Date | Change |
|---|---|
| 2026-05-25 | Initial creation. Synthesises the strategic finding from the 2026-05-24 Exp 10 session — that the latency edge measured by Exp 4 and the price impact it implies are inversely related across the events we collected. Documents the three escape routes (A/B/C), recommends Option B (mid/small-cap pivot, gated on G1), and frames the outcome tree so the next decision is well-posed regardless of which way the mid-cap re-run lands. Cross-referenced from [[research_state_summary]] §7 and from `memory/MEMORY.md`. |
