# SachNetra V2 Positioning — Be Your Own First Customer

**Decided:** 2026-05-23
**Decider:** Lijo
**Context:** Strategic clarity question — "what am I actually building, and how do I build something not many people can build?"
**Status:** Active — supersedes any earlier implicit positioning. Three gates remain open before sprint planning.

---

## 1. The Decision

SachNetra V2's product is the **research + signal + execution stack that Lijo runs against his own capital**.

- Not a B2B data product
- Not a consumer news+price engine
- Not a hedge-fund SaaS or institutional research API
- Not (yet) a fund that takes outside money

The asset is the dataset compounding in Railway PostgreSQL. The proof of value is P&L on signals derived from that dataset. The path to scale is: prove on own capital → optionally license alpha / raise / register as RIA-PMS-AIF — but those are later forks, not the current goal.

---

## 2. Why This Positioning

### 2.1 Four positionings considered

| # | Positioning                               | Customer                              | Why rejected (for now)                                                                 |
|---|-------------------------------------------|---------------------------------------|----------------------------------------------------------------------------------------|
| A | Buy-side research layer                   | Hedge funds, family offices, AMCs     | Institutional credibility we cannot bootstrap without a quant pedigree or track record |
| B | Dataset of record (Bloomberg-lite India)  | Quants, fintechs, journalists, academics | Requires GTM, billing, support, sales — three full-time jobs for a 2-person shop      |
| C | News+price story engine (consumer)        | Retail investors, journalists         | Consumer distribution is brutal; no clear monetisation; commoditises into ads/SEO     |
| D | **Be your own first customer**            | **Lijo** (later: licensed alpha, fund) | **Chosen** — compounds via P&L, not GTM. No sales required. Track record before pitch. |

### 2.2 Why (D) is the only honest answer for a 2-person shop today

- **No sales burden.** Selling alpha to a hedge fund requires the kind of credentials neither operator has on paper. Selling data to fintechs requires SLAs, support, and a sales motion we cannot staff.
- **No institutional gatekeeping.** Funds will not buy from a vendor without a multi-year track record. The track record is what we are building.
- **The dataset compounds whether or not anyone buys it.** Every day the cron runs, the moat deepens — independent of customer acquisition.
- **It is the same path Vertus AI took pre-product** (and Renaissance, and Two Sigma's earliest days, and Numerai). You prove on capital, then license. Not the other way around.

---

## 3. What This Means For The Roadmap

### 3.1 Kill / deprioritise (consumer-product remnants)

These were features of "SachNetra as a news app." Under the new positioning they are decoration:

- **V2-004** Feedback buttons — there are no users to give feedback we will act on
- **V2-007** Hindi language — no customer to translate for; English is fine for our own use
- **V2-008** WhatsApp daily brief — distribution lever for a product we are no longer building
- **V2-010** Landing page — already blocked; now permanently parked. No public-facing pitch needed
- Consumer UI polish, SEO, branding refinement, marketing pages

These tasks stay in the roadmap but should not be picked up unless the positioning changes again.

### 3.2 Keep / accelerate (quant + research + execution)

- All quant data sources: V2-017, 017b, 018, 019, 020, 024, 030, and the full Tier 2+ pipeline in `sachnetra_quant_roadmap.md`. Every source is potential edge.
- Research layer discipline: `scripts/research/`, experiments, walk-forward, out-of-sample by default. Memory `project-research-layer` shows Exp 1–8 done.
- Story threads (V2-013) and entity timeline (V2-014) — kept, but as **signal inputs**, not UI features. The graph matters; the rendering does not.
- Headline storage + sentiment (V2-011, COMPLETE) — keep healthy; it is upstream of every news-based signal.
- Autonomous pipeline (V2-012, COMPLETE) — the cron that powers everything; treat as load-bearing.

### 3.3 Add to roadmap (not yet task-filed)

Two missing capabilities that this positioning makes mandatory:

1. **Execution infrastructure.** A real path from "signal in Postgres" → "paper trade" → "live trade." Broker API integration (Zerodha Kite / IBKR), position sizing, risk limits, kill switch, daily P&L attribution. Probably 3–5 sequenced tasks.
2. **Backtesting harness.** Promote the ad-hoc research scripts in `scripts/research/` to a repeatable framework: walk-forward windows, point-in-time data integrity (no look-ahead), transaction cost modelling, slippage assumptions. One foundational task, then per-strategy backtests on top.

### 3.4 V1 sachnetra.com — new role

V1 stays **live** but is repositioned in our heads: it is the **free news ingestion pipeline** that feeds the V2 signal layer. The Vercel edge functions, the RSS allowlist, the digest cache — these are infrastructure we maintain at minimum cost. Not a product we grow.

- Do not invest in growth, SEO, or feature work on V1
- Do maintain it (don't let it break — it is upstream of the dataset)
- If V1 acquires users organically, that is fine but not a goal
- The "consumer app" framing is over

---

## 4. Three Gates (must resolve before next sprint)

The positioning is decided; the *operating parameters* are not. Until these are answered, every next-task discussion is partially blind.

### Gate 1 — Capital  *[RESOLVED 2026-05-23]*

**Decision:** Paper-trade with discipline as the starting state. Minimum 1 month before reassessment. Real money is gated, not scheduled.

**Gates to go live (must all be true before risking real capital):**
1. At least one **regime change** observed during the paper window (so we know the signal survives more than one market mood)
2. At least one strategy clears **paper Sharpe ≥ 1.5 out-of-sample, drawdown < 15%** on the walk-forward harness
3. **Real-world trade executor** and **paper trade platform** both operational and tested
4. Lijo has placed at least **one real, tiny, non-strategy trade** (₹500–₹2,000) to learn the mechanics — what the broker screen looks like, what a contract note shows, how STT/brokerage feel. You cannot architect an executor for a workflow you've never personally done.

**Capital amount once live:** Own capital, small tier (₹1–5L). To be confirmed at the live-money gate. **Outside money is off the table** until SEBI registration (PMS/AIF/RIA) — see §5.

**Minimum-1-month is a FLOOR, not a destination.** Honest benchmark for "this signal is real enough to risk capital" is closer to **3 months of disciplined paper + at least one regime change** in that window. We revisit at day 30 with data, not with calendar time.

**Parallel work during the paper phase (does NOT block paper trading itself):**

| Workstream                       | Owner   | Estimate          | Notes                                                             |
|----------------------------------|---------|-------------------|-------------------------------------------------------------------|
| Paper trade platform             | James   | 1–2 weeks         | Realistic slippage model, position tracking, P&L. Task to author. |
| Real-world trade executor        | James   | 3–6 weeks minimum | Kite Connect API, kill switch, risk limits. Cutting corners = lost account. Task to author. |
| Backtesting harness (walk-fwd)   | Lijo    | Ongoing           | Promote `scripts/research/` ad-hoc scripts into a repeatable framework. |
| Continue experiments (Exp9+)     | Lijo    | Ongoing           | `wiki/experiments/` — Exp1–9 done, G1–G6 backlog staged.          |
| Lijo learns mechanics            | Lijo    | This week         | One real ₹500–₹2,000 non-strategy trade. Purpose: learn the system, not P&L. |
| Glossary upkeep                  | Lijo + Claude | Ongoing     | `ai_docs/sachnetra v2/wiki/glossary.md` — seeded 2026-05-23.      |

**Why 1 month is the floor and not less:**

A signal validated on less than one regime is a tourist photo of the market, not a map. Markets have moods (bull, bear, sideways, volatile). A signal that looks brilliant in May 2026 might collapse in July when conditions flip. Less than one month doesn't give you enough samples to even *see* the daily noise distribution honestly.

**Why 1 month might not be enough:**

If May 2026 is sideways-low-vol the entire time, the paper window has tested the signal in *one regime*. Live capital should wait for at least one transition — bull-to-sideways, calm-to-volatile, etc. — visible in the data. Treat day 30 as a checkpoint, not a graduation.

### Gate 2 — Edge thesis  *[RESOLVED 2026-05-23]*

**Current Gate 2 sentence (locked 2026-05-23):**

> *"SachNetra's only confirmed leading signal is filing-vs-newswire latency on large-caps (~13 min, p=0.002). Every other tested signal is coincident, killed by a standard control, or blocked by data age — not by negative results. The next 3–6 months of disciplined collection unlock the announcement category and sentiment time-series tests."*

**Aspirational sentence (target — write into the current slot when evidence supports it):**

> *"SachNetra's edge is informational latency on Indian equity events — being earliest to the fact, then synthesizing news/flow/entity context around it — translating into short-horizon directional opportunities the wire and discretionary investors cannot react to in time. Current proof: 13-min lead on large-cap filings. Outstanding proof: mid/small-cap lead (expected hours, tagging-gated), and translation of latency into price action."*

**What this commits us to:**
- We claim a measured *information* edge, not (yet) a predictive *price* edge.
- We claim the rest of the thesis is waiting on data, not waiting on a new idea.
- We bet that 3–6 months of disciplined collection unlocks additional testable signals.

**What this does NOT claim:**
- That 13 minutes of lead is enough to make money (separate question).
- That we know price direction.
- That the latency edge applies to mid/small-caps (blocked by news tagging coverage — Gap G1).
- That we will generate alpha; only that we have information.

**Update rules — re-write the current sentence when ANY of these happen:**
1. ~~Exp 9 lands and confirms or overturns Exp 7's null.~~ **FIRED 2026-05-23: confirmed Exp 7's null** (γ=−0.0019, LR=0.77, p=0.38; numbers match Exp 7 to three sig figs; outflow-only and post-2012 subsamples also null). Sentence **unchanged** — null was the expected branch, so Option A still reads correctly. The phrase "killed by a standard control" now covers the GARCH-X null on solid (validated-estimator) ground rather than on a flagged self-test.
2. News ticker-tagging coverage (Gap G1) crosses ≥30% — unlocks the mid/small-cap latency claim.
3. Three months of accumulated announcements make per-category event studies meaningful.
4. Sentiment series crosses 60–90 daily points — unlocks Exp 3 / Exp 5.
5. Any new experiment lands a verdict (positive or negative).

**Why Option A and not B or C:**
- **Defensible to Brandon.** Every claim is backed by an experiment whose script and data we own.
- **Doesn't oversell.** A skeptic can read it and say "plausible." Option C would invite "prove the mid/small-cap claim" — we can't yet.
- **Honest about the gap.** Distinguishes data-age blocks (waiting) from negative results (dead).
- **Updatable.** Designed to be replaced as evidence accumulates. It is *current state*, not *final story*.

Full synthesis: `ai_docs/sachnetra v2/wiki/syntheses/research_state_summary.md`.

### Gate 3 — Broker / execution venue  *[RESOLVED 2026-05-23]*

**Decision:** Zerodha Kite Connect, with a staged ramp.

| Phase | Setup | Cost | Trigger |
|-------|-------|------|---------|
| **Paper (months 1–N)** | Yahoo Finance daily bars (already in `research_prices`) + free intraday sources where available. Paper-trade platform simulates **Kite's order/fill semantics** so the eventual executor is a swap-in, not a rewrite. **No broker subscription needed.** | ₹0 | Active now |
| **Live small (₹1–5L tier)** | Zerodha demat + Kite Connect API subscription. Real-world executor talks to Kite. | ~₹2,000/month API + per-trade charges (₹0 delivery, ₹20/order intraday) | All Gate 1 go-live conditions satisfied |
| **Future scale (₹50L+)** | Revisit IBKR; possibly multi-broker setup with Kite as primary, IBKR as backup. | Higher | If/when scale demands |

**Why Kite specifically (not IBKR / Upstox / Dhan):**
1. **Default reduces decision cost.** It's what almost everyone in retail Indian algo trading uses → more example code, more community debugging help, less time on things that aren't our edge.
2. **Cheap enough to not matter.** ₹2k/month is noise relative to everything else.
3. **Light onboarding.** ~3–5 days for demat + KYC + API approval. IBKR India is materially heavier.
4. **Decouples paper from live.** Building the paper platform to mimic Kite's semantics makes the eventual executor a focused integration job.

**Known risks of this default (accepted):**
- Kite API outage during a critical trade → we're down (mitigate later with backup broker if it ever bites).
- Kite WebSocket symbol-subscription limits (~200) — fine for our small universe.
- Kite is a *retail* broker. If SachNetra outgrows it, we change. Crossing that bridge later is cheap.

**Implications for downstream task files:**
- The **paper trade platform** task scopes against simulating Kite's order types (MIS, CNC, LIMIT, MARKET, SL, SL-M) and Kite's fill semantics.
- The **real-world trade executor** task scopes against Kite Connect API (REST + WebSocket), Kite's auth flow (request token → access token), and Kite's rate limits.
- Broker-side setup (Zerodha demat + Kite API subscription) is deferred until Gate 1 go-live conditions are met. **Do not subscribe to Kite Connect yet — the ₹2k/month meter starts the moment you do.**

---

## 5. Regulatory Floor (important to internalise now)

"Be your own first customer" is the **only legal path** that requires zero SEBI registration. The moment outside capital enters:

- **PMS (Portfolio Management Services):** ₹50 lakh minimum per client, ₹5 crore minimum net worth for the manager
- **AIF (Alternative Investment Fund):** ₹1 crore minimum per investor (CAT III), ₹20 crore minimum fund corpus
- **RIA (Registered Investment Advisor):** simpler — needed even to give *advice* for a fee, fiduciary obligations attached

Implication: **friends-and-family money is the trap.** It is the path most founders take to scale faster; it is also where SEBI enforcement bites. Until registered, the wall is "Lijo's own money only." Treat any temptation to pool capital as a gate that requires registration first.

---

## 6. Success Metrics (what "working" looks like)

Under this positioning, the success of SachNetra V2 is measured in P&L, not MAU, not API revenue, not subscriber count.

**Tier 1 — In paper trade (next 6 months):**
- Walk-forward Sharpe ≥ 1.5 on at least one strategy
- Out-of-sample drawdown < 15%
- Transaction costs modelled honestly (not optimistic fills)
- Strategy survives a regime shift visible in the test window

**Tier 2 — In live small-capital trade (after Tier 1 clears):**
- Live Sharpe within 0.3 of paper Sharpe (slippage attribution)
- Three consecutive months of live P&L above costs
- Zero risk-limit breaches

**Tier 3 — Optional later forks (after Tier 2 clears):**
- License alpha to a fund (Numerai-style)
- Register as RIA and advise
- Raise an AIF or PMS

We are at **Tier 0**: signals exist, none yet paper-traded in a disciplined framework.

---

## 7. Kill Signal

If, after 6 months of disciplined paper trade in a real backtesting harness, no signal clears Sharpe 1.0 out-of-sample after honest costs, the positioning has failed and we revisit. Likely fallback would be (B) — dataset-of-record — because by then the data infrastructure is irreplaceable even if our signals aren't.

---

## 8. Open Questions Parked Here (not gates, but worth tracking)

- Do we publish *anything* publicly under this positioning? (Research blog? Quarterly letter? Probably no — every public post is a hostage to fortune for a track record we're still building.)
- Does V1 sachnetra.com get a quiet "About" page explaining the company has shifted focus? Or do we just let it run silently?
- At what live-capital threshold do we make Brandon a formal advisor?
- How do we keep James engaged when most of his V2 work shifts from product features to research/execution infra?

These are not gates. They become real questions once the three gates above are answered.

---

## Appendix — Source Conversation Summary

This document was drafted in a 2026-05-23 strategy conversation between Lijo and Claude, prompted by curiosity about Vertus AI ("frontier AI for high-stakes environments, proven first in quant finance"). The question that triggered the positioning exercise:

> "How do I achieve [building something not many people can build] in our roadmap? I don't know exactly what I am building."

The four-option framing in §2.1 was generated in that conversation and (D) was chosen explicitly. This doc captures the decision so it survives session boundaries.
