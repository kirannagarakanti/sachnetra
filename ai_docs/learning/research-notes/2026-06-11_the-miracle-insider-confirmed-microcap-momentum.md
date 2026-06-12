---
date: 2026-06-11
problem: Lijo handed me the wheel — "find me the miracle." Read the whole codebase + research ledger cold, decide where the one real edge most plausibly lives now that the two candidates the 2026-06-06 edge-hunt proposed (bulk-deal drift, multi-signal ensemble) have BOTH been run and BOTH failed standalone — and document every idea, how it works, and how to build it. No code changes.
status: synthesis — opinion + page-checked externals. Proposes the next experiment(s); mints no Exp ID (next free = Exp21). Companion to and supersedes the live frontier of 2026-06-06_edge-hunt.
lane: Lijo (decide the bet) + James (build the feeder/harness)
tags: [research-note, edge-hunt, miracle, insider-trading, promoter-buying, microcap, momentum, ensemble, latency, exp19, exp20, pledge, codebase-corrections, strategy]
sources_consulted: [
  "Internal (read this session): CLAUDE.md; positioning_v2.md; experiments/_index.md (Exp1–20 ledger, live); exp19_brief.md; midcap-event-arbitrage-dossier.md; 2026-06-06_edge-hunt; 2026-06-05_external-review-and-improvement-reflection; sachnetra_db_schema.md; seed-india-*.mjs inventory; grep for insider/pledge/SAST across scripts/ (no dedicated collector found)",
  "External page-checked 2026-06-11: arXiv 2602.06198 Zhao 'Insider Purchase Signals in Microcap Equities: Gradient Boosting Detection of Abnormal Returns' (US microcap $30M–$500M, 17,237 Form-4 buys, 2018–24; 6.3% CAR when insider buys AFTER >10% run-up; GBM AUC 0.70 OOS; distance-from-52wk-high = 36% of signal; momentum-confirmation > mean-reversion)",
  "External: Emerald MF-08-2021-0374 bulk deals (5–7%/wk, mostly pre-disclosure — confirms Exp18 null); JAMR-01-2023-0003 promoter share-pledging → crash-risk (BSE500, 2011–20, pledge↑ ⇒ crash-risk↑, perf↓); SEBI PIT 2015 + SAST 2011 + System-Driven Disclosure (NSDL) — insider/promoter buy disclosures filed ~2 trading days, public same/next day",
  "External: UCLA Anderson 2025 PEAD-microcap split; SEBI Feb-2025 retail-algo regime (<10 OPS exempt, India-server, April-2026)"
]
---

# The Miracle: Insider-Confirmed Microcap Momentum (and the honest map of everything else)

> Lijo asked for a miracle. The honest gift is not a fabricated one — it's pointing the last cheap shots at
> the single thesis that (a) is **new** to this program, (b) **explains** the one positive thing 19
> experiments found, and (c) sits **exactly on top of the only edge SachNetra has ever proven** (latency /
> early-to-filings in low-coverage names). This note reads the live state cold, names that thesis, and writes
> the full how-it-works + how-to-build for it and every supporting idea. It changes no code.

---

## 0. Read this first — where the program ACTUALLY is (2026-06-11, live ledger)

The 2026-06-06 edge-hunt proposed two paths. **Both have since been run. Both failed standalone.** The
program is further along — and more sobering — than the dossier tone:

| Since the edge-hunt | Verdict | The detail that matters |
|---|---|---|
| **Exp18** — post-disclosure drift after institutional BUY bulk/block deals (edge-hunt §2, "the closest thing to a miracle") | ❌ **NULL** | BUY post-disclosure CAR **−0.31% gross / −2.81% net@250bps**. The big number was real but **+9.89% PRE+DAY0 — all pre-disclosure leakage**, untradeable. Buy−sell asymmetry veto **failed** (−0.10%). N=6,120. *The literature's 5–7% is front-running we can't touch.* |
| **Exp19** — IC-weighted, size/sector-neutral, walk-forward cross-sectional ensemble (edge-hunt §3, "the methodological miracle") | ❌ **NOT SUPPORTED** — *but* | Composite OOS IC **+0.043** (IR 0.26), gross **+0.84%/mo**, net **−1.66%@250bps**. **The blend is just momentum**: drop the momentum column → IC collapses to **0.010**; ear-drift and deal-intensity add **≈0**. BUT: **first non-negative cross-sectional read in the whole program, and the harness now exists.** |
| **Exp20** — calibrate sentiment (G6) + add a **per-ticker** sentiment column to the ensemble | 📝 **BRIEF / live frontier** | The pre-registered ablation: does a *unique* SachNetra feeder add IC **beyond momentum**, net of cost? This is the open question the whole program now rests on. |

**The distilled situation.** Nineteen single signals are dead or cost-fragile. The *only* column with
non-negative cross-sectional information is **price momentum** — which is generic, which everyone has, and
which **loses to cost** (net −1.66%). So the live question is brutally specific:

> **Is there any signal SachNetra uniquely owns that turns generic, cost-losing momentum into a conditioned
> subset of momentum that actually clears 250 bps?**

That is the needle's eye. Everything below is judged by whether it threads it. (Kill-signal context:
`positioning_v2 §7` = 6 months / no Sharpe-1.0 OOS → fall back to dataset-of-record. Three-plus nulls in. The
budget is real and closing — so spend the next shots on the *highest-information* question, not another
single-signal lottery ticket.)

---

## 1. The honest prior (unchanged, and it constrains the answer)

There is **no single hidden alpha** — the program proved that the rigorous way, and India's classic anomalies
are decaying (Sharma 2021; the EAR/SUE/momentum/FII-flow graveyard). A "miracle" that survives is therefore
**not** a new lone signal. It is one of exactly two shapes:

1. **A conditioning variable that rescues a known weak effect** — i.e. something that says *"momentum works,
   but only in this subset, and I uniquely know the subset."* (This is where §2 lives. It is the strongest
   shot.)
2. **A moat that's valuable even if no fast trade survives** — the alt-data nowcasting / dataset-of-record
   fallback, which is a *good* outcome, not a defeat. (§6.)

The miracle, defined honestly: **the cheapest experiment that most changes our belief about whether a
unique-data edge exists.** By that definition the lead idea is §2.

---

## 2. THE LEAD IDEA — Insider-confirmed microcap momentum

> **One line:** *Generic momentum loses to cost (Exp19). But momentum in a low-coverage microcap, **confirmed
> by a company insider buying their own stock after the run-up**, is a different, documented, 6%-class effect —
> and the reason it persists (slow information diffusion in uncovered names) is **literally the latency edge
> SachNetra already proved (Exp4).** SachNetra does not yet collect insider buys. That is the gap, and the
> opportunity.*

### 2.1 Why this is new — and why it's not just "Exp18 again"

This is the key distinction the program has **not** drawn. Exp18 tested **bulk/block deals** — *third-party*
institutions buying *through* the market, disclosed end-of-day, and the literature's own number is
**pre-disclosure front-running** we can't touch. Insider / promoter disclosures under **SEBI PIT 2015 + SAST
2011** are a **different animal**:

- The buyer is a **company insider** (promoter, director, KMP) buying **their own** shares — the single
  highest-information trade in the literature, globally and in India.
- It is **not front-runnable the same way** in microcaps: there is no analyst desk watching, no block-deal
  tape leaking ahead. The disclosure (filed ~2 trading days, public same/next day; increasingly
  **system-driven** via NSDL) is often the *first* public signal — exactly the "slow diffusion" regime.
- It is the buy-side mirror of the **pledge** signal (§4) — promoters putting personal capital *in* (bullish)
  vs pledging it away (bearish). The program tested the bearish leg (Exp14 pledge, null as a price-crash event
  study) but **never the bullish leg as a cross-sectional tilt.**

### 2.2 The external evidence (page-checked 2026-06-11)

**arXiv 2602.06198 — Zhao, "Insider Purchase Signals in Microcap Equities" (Feb 2026).** US microcaps
($30M–$500M), **17,237 open-market insider buys, 2018–2024, Form-4 filing-date timing.** Findings that map
straight onto SachNetra:

- **Headline:** insider purchases disclosed **after** a price run-up **> 10%** yield the **highest mean CAR =
  6.3%** and the highest outperformance probability. *Counter to mean-reversion* — momentum **confirmation**,
  not contrarianism. **"Trend confirmation filters for higher-conviction insider signals in illiquid
  microcaps."**
- **Distance-from-52-week-high = 36% of the model's predictive signal** — the dominant feature. (A momentum/
  position-in-range variable. This is the bridge to Exp19's finding.)
- A gradient-boosting classifier on insider identity + transaction history + market conditions hits **AUC 0.70
  out-of-sample (2024)**. Non-linear, beyond the program's linear IC-weighting.
- The author's own framing of *why it works*: **"sparse analyst coverage and low institutional ownership
  impede rapid diffusion of public information"** in microcaps. **That is SachNetra's latency thesis, written
  by an academic.** The drift exists because the information diffuses slowly — and SachNetra is *early to the
  filing that starts the diffusion.*

It is US data — so this is a **hypothesis to test on India, not a result to import.** But the structural
mechanism (slow diffusion in uncovered names) is *more* true in Indian micro/small-caps than US ones, and the
SEBI disclosure plumbing gives us the identical raw input.

### 2.3 Why it threads the needle (the three reasons it's the lead)

1. **It explains Exp19's only positive finding instead of contradicting it.** Exp19 said "the blend is just
   momentum, and momentum loses to cost." This paper says momentum's edge **concentrates in an
   insider-confirmed, microcap, near-highs subset** — exactly a conditioning variable that could lift the
   cost-losing average into a cost-clearing subset. It's the *rescue* shape from §1.1.
2. **It sits on the one proven edge.** Exp4 = SachNetra is ~13 min early to filings. The whole reason this
   drift is capturable is slow diffusion — and being early to the insider filing is the most direct possible
   expression of the latency edge. **For the first time, the proven edge (latency) and the candidate alpha
   (insider drift) are the same mechanism**, not two things we hope to bolt together.
3. **It's a cheap, in-character build.** SachNetra's core competency is *collecting Indian disclosures into
   Postgres*. The insider-trading feed is one more collector of exactly the kind already running 10 times.
   And it slots straight into the **Exp19 harness that already exists** as a new column + a new conditioning
   filter — no new infrastructure.

### 2.4 How it should work (the mechanism, end to end)

```
NSE/BSE insider-trading disclosure (SEBI PIT Reg 7(2))  ──┐  promoter/director/KMP BUYS own stock
NSDL system-driven SAST disclosure (promoter shareholding↑)─┤  acquisition, open-market
                                                            ▼
   seed-india-insider.mjs  (NEW collector, daily) ──► india_insider_trades  (NEW table)
        cols: disclosure_date, filing_date, symbol, person_name, person_category
              (promoter/director/kmp), acquisition_disposal ('ACQ'|'DISP'), mode
              ('market'|'off-market'|'pledge-invoke'), shares, value, post_holding_pct
                                                            ▼
   build-xs-panel.mjs  adds two columns to the existing Exp19 panel, per (symbol, date):
        insider_buy_flag   = 1 if a promoter/director ACQ (market) filed in trailing N days
        insider_buy_intensity = signed value / ADV over trailing window (BUY positive)
                                                            ▼
   THE CONDITIONED SIGNAL (the actual bet), tested two ways:
     (a) cross-sectional tilt:  add insider_buy_intensity as an ensemble column (does it add IC>momentum?)
     (b) the headline replication:  long microcaps where  momentum>0 (near 52wk high)  AND  insider_buy_flag=1
         held H days; CAR vs size-matched basket, net of 250 bps.  <-- the arXiv 2602.06198 setup, on India
```

The signal is **the conjunction**: not momentum alone (Exp19 killed that), not insider-buy alone (sparse,
and Exp18 warns disclosure signals can be pre-leaked) — but **insider-buy ∩ momentum ∩ microcap**, the exact
6.3%-CAR cell from the paper, in the segment where SachNetra is early and the wire is slow.

### 2.5 How to build it (concrete, sequenced, read-only research lane)

**Step 0 — confirm the data is reachable (1 session, James or Claude recon).**
- NSE `corporate-filings-insider-trading` and BSE equivalent expose PIT Reg-7(2) disclosures (acquirer name,
  category, ACQ/DISP, shares, value, mode, pre/post holding). NSDL "System Driven Disclosure" carries the
  SAST promoter-shareholding-change feed. Verify field availability + history depth + the Akamai/two-hop
  warm-up the other NSE collectors already solved (see `reference_data_pipeline_health`). **Park-or-go gate:**
  is there ≥ ~3 years of disclosure history (for a walk-forward), and does it carry a clean ACQ/market flag?
- *Per the external-agent-recon norm (`feedback_external_agent_recon`): the Gemini agent does the scrape recon
  in `scratch/`; Claude synthesizes into a task file; nobody runs probes from here.*

**Step 1 — collector `scripts/seed-india-insider.mjs` (James; mirrors `seed-india-deals.mjs`).**
Idempotent daily upsert into a new `india_insider_trades` table; `seed-meta` freshness row; **freshness alarm
from day one** (the §5 correction — never ship a signal collector without one). Backfill the available history.

**Step 2 — research script `scripts/research/exp21-insider-momentum.mjs` (Claude authors, Lijo runs).**
Pre-register as **the next free Exp ID (Exp21 at time of writing)**. Two pre-registered legs:
- **Leg A (event-study replication of 2602.06198 on India):** events = promoter/director **market ACQ**
  disclosures on liquid-enough micro/small-caps; entry **T+1 open, strictly post-disclosure** (the Exp18
  discipline — no pre-leak capture); CAR over {5,10,20} days vs size-matched basket. **Pre-registered first
  gate:** is the **post-disclosure** CAR positive and **> 250 bps net**, and is it **concentrated in the
  near-52wk-high / positive-momentum subset** (the paper's central claim)?
- **Leg B (ablation into the Exp19 ensemble):** add `insider_buy_intensity` as one column; run the *exact*
  Exp19 §3.7 ablation (same universe/windows/splits/cost, change only the column). It "earns its column" only
  if it lifts **both** OOS composite IC **and** net@250bps spread, **and** has positive drop-one-out
  contribution.

**Step 3 — guards (every lesson from the null streak, locked before running):**
- **Strictly post-disclosure entry** (Exp18's killer was pre-event leakage — entry on filing_date+1).
- **DISP veto / falsification:** insider *sells* should **not** drift up; if they do, the signal is just
  microcap momentum re-discovered, not insider information. Build it in as Exp18's buy−sell asymmetry was.
- **Liquidity floor** (Amihud, same as Exp16/18) — the microcap drift famously lives in names you can't trade
  after 300 bps; **only accept on the liquid-enough band, net of 250.**
- **DSR ≥ 0.95** over all horizons×subsets; **recency sub-period** (anomaly-decay guard); **concentration
  drop** (top-3 names/days); **capacity** (count tradeable insider-buy events/yr after filters — need
  ≥~30/yr to matter, the honest worry for a sparse signal).
- **Survivorship / point-in-time** — the perennial ceiling (§5.4); prefer the recency-valid window.

### 2.6 Pre-mortem (why it might still fail — stated up front, honestly)

- **Sparsity.** Indian promoter open-market *buys* (vs creeping-acquisition or pledge mechanics) may be too
  few per year on liquid microcaps to trade — capacity could kill it before edge does. *(This is the most
  likely failure mode; the capacity count in Step 2 is the real first gate.)*
- **Pre-leak.** If Indian microcap insider buys leak before disclosure like bulk deals did (Exp18), the
  post-T+1 slice is flat → honest kill.
- **It's still just momentum.** If Leg-B's drop-out shows insider adds ≈0 beyond the momentum column, then
  insider-buy is a momentum proxy, not independent information — a clean, informative null.
- **Decay.** US 2018–24 ≠ India 2026; the recency slice must hold.

**But the asymmetry is the best in the program:** the build is one in-character collector + one research
script on an **existing harness**; the documented effect (6.3%) is an **order of magnitude over the cost
floor**; and unlike Exp18 it's a *clean insider* signal entered *strictly post-disclosure*. **This is the
highest expected-value next experiment.** Run it before anything else on this list.

---

## 3. Supporting idea — FINISH Exp20 (the live frontier you already started)

**Status:** brief written, not run. **Do not skip it for the shiny new §2.** Exp20 asks the *same shape* of
question (does a unique feeder beat momentum?) about the feeder you've already invested in: **calibrated,
per-ticker news sentiment.**

- **How it works:** fix G6 (the 88%-positive bias — re-scoped to *rank* quality, since z-scoring already
  removes uniform bias), produce a **per-ticker** (not market-aggregate) sentiment column, add it to the
  Exp19 panel under the §3.7 ablation.
- **How to:** the harness, panel builder, and ablation protocol all exist (exp19_brief §3.7). The blockers are
  upstream and known: **G1 tagging recall** (sentiment needs a ticker to attach to) and **gold-label
  quality** (the V2-031f gate/gold-set work). So §2 and Exp20 share a dependency — **G1 tagging recall is the
  common feeder** for both the latency column *and* the sentiment column. That makes **G1 the highest-leverage
  infrastructure investment**, because it unblocks two independent shots at "beat momentum," not one.
- **Decision rule (from exp19_brief §3.7):** Exp19 landed **🟡-ish** (positive IC +0.043, fails cost) → that's
  the *strongest* case for adding one more independent column. Both §2 (insider) and Exp20 (sentiment) are
  exactly "one more independent column." Run both as ablations; keep whichever earns its column.

---

## 4. Supporting idea — Pledge as a RISK overlay, not alpha

The bearish mirror of §2. **Page-checked (JAMR-01-2023-0003, BSE500 2011–20): rising promoter share-pledging
predicts higher stock-price-crash risk and weaker future performance.** Exp14 tested pledge as a *price-crash
event study* and got a null (N=42, tiny, listed names) — but that's the wrong use.

- **How it should work:** not as an alpha column (it won't time entries) but as a **portfolio risk filter** —
  *exclude or down-weight* any long candidate whose promoters have a **rising pledge trend** (the literature's
  ">25% pledged + rising = sell" rule). It's a **veto**, applied after the §2/Exp20 ranking, to strip the
  left-tail crash names a long-only microcap book is most exposed to.
- **How to:** the same `india_insider_trades` collector (§2.5) captures pledge/invocation disclosures (mode =
  `pledge`); derive a per-symbol `pledge_trend` (Δ pledged-% over trailing window); in the backtest,
  **drop names with rising pledge** from the long book and check whether it *improves net drawdown/Sharpe*
  (the only test that matters for a risk overlay). Cheap, comes free with the §2 collector.

---

## 5. Corrections in the codebase (what's actually wrong / drifting)

You asked for corrections. Here are the real ones — none are emergencies, all are cheap, and the first two
are load-bearing for *trusting any backtest you run*:

1. **`sachnetra_db_schema.md` is fiction relative to the live DB (highest doc-integrity issue).** It's dated
   **2026-05-05** and describes an *aspirational* normalized schema (`news_articles`, `entities`,
   `article_entity_mentions`, `market_prices`, pgvector clusters) that **does not match the tables the
   pipeline actually writes** (`india_news_signals`, `india_bulk_block_deals`, `india_announcements`,
   `research_prices`, FII/DII, FASTag, electricity…). A cold session trusting this doc will mis-design every
   query. **Fix:** regenerate it from `\d` against the live DB; make it the single schema contract the
   dashboard also cites (the dual-codebase drift risk from the 06-05 review). *Documentation fix, not code.*
2. **No freshness alarm on any collector — and it already cost a silent week.** V2-018 announcements died
   ~2026-05-30, unnoticed ~7 days (~3–5k missing filings). For a program whose thesis is "the database is the
   asset," **a signal collector that can flatline in silence invalidates every backtest built on it.** This is
   the precondition for §2/§3 (an insider/sentiment backtest on a feed that can die unnoticed is fiction).
   **Fix:** alarm on `seed-meta` `max(timestamp)` lag per collector (alert if > 36h behind on a trading week),
   extend to **every** signal-bearing feed. *(Confirmed still open — see `reference_data_pipeline_health`:
   research_prices itself stalled since 2026-05-29.)*
3. **CLAUDE.md roadmap contradicts `positioning_v2`.** CLAUDE.md still lists **V2-004 / 007 / 008 / 010** as
   "not started" (as if pending); `positioning_v2 §3.1` **killed/parked all four** as consumer-product
   remnants. **Fix:** mark them `[PARKED — positioning_v2 §3.1]` so the two source-of-truth docs agree. *(Open
   per the 06-05 review; one-line edits.)*
4. **No point-in-time universe (survivorship ceiling).** Every backtest applies *today's* index membership
   backward (Exp14/16's acknowledged ceiling; the Exp19 caveat #3). A crude **delisting/membership log** is the
   real fix and it keeps biting validity — start one before the §2/Exp20 results are trusted as more than
   recency-window reads.
5. **G6 sentiment is uncalibrated (88% positive) — don't feed it as a model input before calibrating.** This
   *is* Exp20's first step; flagged here as the gate it is (`exp19_brief` trap #1: garbage-in poisons the
   blend).
6. **No documented off-Railway DB backup.** The asset is one Railway PostgreSQL; the G4 backfill once crashed
   it on disk-full (`feedback_check_disk_before_prod_writes`). For "the database is the asset," a tested
   off-platform backup should exist *before* live money, not after the first incident. Document it in
   ARCHITECTURE.md (or create it). *Ops, not code.*

---

## 6. The fallback that isn't a defeat — the alt-data nowcasting moat

If §2, Exp20, and the pledge overlay all fail honestly after cost, the kill-signal (`positioning_v2 §7`)
fires — and the **right** landing is the dataset-of-record fallback whose crown jewel is the **alt-data
nowcasting moat**: POSOCO electricity (page-checked: *beats oil and stock-price predictors for industrial
production*) and NETC FASTag (freight/mobility) → sector-rotation nowcasts nobody else has structured for
free. It's slow, low-capacity-friendly, and **the most replication-resistant thing the program owns.** Build
it in parallel as the moat regardless of the trade verdict — it's never wasted work, and it's the honest
definition of "a miracle even if the fast trade never comes": *a dataset of Indian reality that no one else
has.*

---

## 7. What I'd do, in order (expected-value ranked — my call, since you asked me to make it)

1. **Close the two load-bearing corrections first** (§5.1 schema regen, §5.2 freshness alarms). Nothing below
   is *trustworthy* until the asset is monitored and the schema doc is real. Cheap; do this week.
2. **Recon + build the insider-trading collector (§2.5 Steps 0–1).** The one genuinely new, perfectly-aligned
   data source. In-character work the team is fast at. Alarm it from day one.
3. **Run Exp21 — insider-confirmed microcap momentum (§2.5 Step 2).** The highest-EV experiment: a documented
   6%-class effect, entered strictly post-disclosure, that conditions the one column Exp19 found positive, on
   the segment where the proven latency edge lives. **First gate: post-disclosure CAR > 250 bps net,
   concentrated in the momentum subset.**
4. **In parallel, push G1 tagging recall** — the shared feeder that unblocks *both* the sentiment column
   (Exp20) and the latency column. Highest-leverage infra because it serves two shots, not one.
5. **Run Exp20 (calibrated per-ticker sentiment ablation)** once G6 + G1 land. Keep any feeder that earns its
   column under the §3.7 rule.
6. **Add the pledge risk-overlay (§4)** — free with the §2 collector; judge it purely on net drawdown/Sharpe.
7. **Build the alt-data nowcasting moat (§6) in the background**, as the dataset-of-record asset that makes the
   fallback a strong outcome.
8. **Name the kill-budget (Lijo).** Decide *explicitly* how many more shots (Exp21, Exp20) the one bet gets
   before the §7 fallback conversation. Don't let drift decide it.

> **Kill-budget nuance (added 2026-06-11, follow-up discussion).** The budget in item 8 applies to the
> **directional cash-equity bet** specifically — the question the 18 nulls already interrogated. The
> miracle-hunt note's Candidates **A** (event-conditioned volatility premium) and **B** (slow alt-data
> nowcast rotation) arguably sit *outside* that budget, because they change the question (instrument /
> horizon) rather than retry it — see
> [`2026-06-11_the-miracle-hunt-five-wall-breaks.md`](./2026-06-11_the-miracle-hunt-five-wall-breaks.md) §0.
> So a complete kill-budget statement names **which bucket each candidate counts against**, e.g.:
> *"Exp21 + Exp20 are the last cash-equity shots; if both fail their pre-registered gates net of cost, no
> more directional cash-equity experiments. Candidates A/B get their own separate, smaller budget because
> they attack different walls."* The number matters less than that it's written down **before** the next
> result is known — pre-registration discipline applied one level up: it stops the always-locally-reasonable
> infinite sequence, removes the decision from the post-null moment when sunk-cost bias peaks, and makes the
> dataset-of-record fallback a planned landing instead of an exhaustion. **Still open: Lijo picks the
> numbers and writes them into `positioning_v2.md` §7 next to the existing kill-signal.**

---

## 8. One-paragraph verdict

The miracle isn't a hidden lone signal — the program honestly proved those don't survive here, and the two
2026-06-06 candidates (bulk-deal drift, raw ensemble) have since died too. The probability mass has moved
once more, and this time it lands on something the program has **never tried and is uniquely built for**:
**insider-confirmed microcap momentum.** It is the rescue-shape the situation demands — a conditioning
variable (a company insider buying their own stock) that turns the one cost-losing column Exp19 found
(generic momentum) into a documented 6%-class subset; its persistence mechanism (slow diffusion in
uncovered names) is **the exact latency edge SachNetra already proved**; and it's a cheap, in-character
collector that drops straight into the harness that already exists. It might still fail on capacity or
pre-leak — but it's the single experiment that most changes our belief about whether a unique-data edge
exists, which is the only honest definition of the miracle worth chasing. Build the insider feed, alarm it,
run Exp21 strictly post-disclosure, and let it tell us the truth. If it and the sentiment feeder both fail,
the alt-data nowcasting moat makes the dataset-of-record fallback a *strong* landing, not a defeat.

---
*Reflection: handed the wheel and asked for a miracle, the temptation is to manufacture one. The honest move
was the opposite — read how far the program had already gotten (further and grimmer than the dossier said:
Exp18 and Exp19 both run-and-failed), find the one external result from this year that both explains the
program's only positive finding and rides its only proven edge, and write it up with the same anti-overfit
gauntlet the program kills its own ideas with. Insider-confirmed microcap momentum is not guaranteed. It is
the best-shaped, cheapest, most-in-character shot left — and it's one the program, remarkably, has never
taken. That's where I'd point the next month.*

## Sources (external, page-checked 2026-06-11)
- arXiv 2602.06198 — Zhao, *Insider Purchase Signals in Microcap Equities: Gradient Boosting Detection of Abnormal Returns* (US microcap $30M–$500M; 17,237 Form-4 buys 2018–24; 6.3% CAR after >10% run-up; GBM AUC 0.70 OOS; distance-from-52wk-high 36% of signal; momentum-confirmation).
- Emerald MF-08-2021-0374 — *What's hidden behind bulk deals?* (NSE 2010–19; 5–7%/wk, mostly pre-disclosure — corroborates the Exp18 null).
- Emerald JAMR-01-2023-0003 — *Promoter share pledging, stock-price crash risk and financial performance* (BSE500 2011–20; pledge↑ ⇒ crash-risk↑, perf↓).
- SEBI PIT Regulations 2015 (Reg 7 disclosures) + SAST 2011 + NSDL System-Driven Disclosure — insider/promoter acquisition & pledge disclosures, ~2-trading-day filing, public same/next day.
- UCLA Anderson Review 2025 (PEAD-microcap/measurement split); SEBI Feb-2025 retail-algo regime (<10 OPS exempt, India-server, April-2026 mandatory).
