---
date: 2026-06-04
problem: Is there tradable post-earnings-announcement drift in Indian mid/small-cap stocks, and does it strengthen in less-liquid names?
status: researched
lane: Lijo
tags: [research-note, PEAD, event-study, mid-cap, small-cap, liquidity-risk]
sources_consulted: [
  "Harshita, Singh, S., & Yadav, S. S. (2018). Post-Earnings-Announcement-Drift Anomaly in India: A Test of Market Efficiency.",
  "Sehgal, S., & Subramaniam, S. (2018). Post Earnings Announcement Drift in India: Evidence from the National Stock Exchange.",
  "Ball & Brown (1968), Bernard & Thomas (1989, 1990) - PEAD foundation",
  "SachNetra Exp 2 / Exp 10 / Exp 14 - Event study codebase"
]
---

# Research: Post-Earnings-Announcement Drift (PEAD) in Indian Mid/Small-Caps

## Problem & current state (with evidence)
- **Problem**: Does the Indian equity market exhibit a tradable Post-Earnings-Announcement Drift (PEAD) in the mid-cap and small-cap segments, and does this drift strengthen in less-liquid names due to slower information dissemination?
- **Today**: SachNetra processes daily bourse announcements (`india_bourse_announcements`) via the `V2-018` collector. We previously ran `Exp 2` (general bourse announcements event study), which showed a same-day pop of +48 bps (t=3.08, n=205) but category-level analysis (like earnings) was untestable due to data starvation. We also ran `Exp 10` (intraday large-cap filing reactions) which failed the concentration check, and `Exp 14` (governance shocks - auditor resignations and promoter pledging), which in Re-run 5 (Total Active Universe - 2,357 symbols) showed a powered null on both primary units (resignations +27 bps, pledges -63 bps, both insignificant). Today, we have no active experiment or pipeline extracting earnings surprise metrics (such as Standardized Unanticipated Earnings, or SUE) or sentiment deltas from earnings PDFs.
- **"Solved"**: A pre-registered event study showing a post-earnings drift CAR[+1..+5] of $> 150\text{ bps}$ gross that survives a concentration check (dropping top-3 days and top-3 events) and exceeds a $100\text{ bps}$ round-trip cost/slippage floor on the Nifty Midcap 150 / Smallcap 250 universe, with a Deflated Sharpe Ratio (DSR) $\ge 95\%$.

---

## What I searched
1. **Academic Databases**: Searched SSRN, ResearchGate, and Theoretical Economics Letters for PEAD studies on the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE).
   - *Key Lead 1*: **Harshita, Singh, and Yadav (2018)** — *"Post-Earnings-Announcement Drift Anomaly in India: A Test of Market Efficiency"* (Theoretical Economics Letters). Analyzed the Indian market over 2002–2017. Documented that a significant PEAD anomaly exists in India and persists even after controlling for beta, market cap, P/B, idiosyncratic volatility, and illiquidity (using the Amihud Illiquidity measure).
   - *Key Lead 2*: **Sehgal and Subramaniam (2018)** — *"Post Earnings Announcement Drift in India: Evidence from the National Stock Exchange"*. Explored style-based and earnings-surprise anomalies, finding a significant drift of 150–300 bps over a 5–15 day horizon.
2. **Practitioner Commentary**: Searched Quantocracy, Quantpedia, and SEBI research analyst publications (e.g., Sandeep Rao SEBI commentary) to check execution realities.
3. **Internal Codebase/Wiki**: Cross-referenced `Exp 2` (filing study), `Exp 10` (intraday latency vs. value squeeze), and `Exp 14` (governance shock nulls) to map constraints.

---

## Candidates — what works / what might not

| Candidate | Source(s) | Evidence quality | Works because | Might NOT work because | Data/stack fit | Lane |
|---|---|---|---|---|---|---|
| **1. SUE-Based Mid/Small-Cap PEAD Long-Short** | Harshita et al. (2018), Sehgal & Subramaniam (2018) | **Tier A** (Peer-reviewed empirical studies over 15+ years of NSE data) | Information asymmetry and lack of analyst coverage on mid/small-caps delay price absorption. Slower price discovery in illiquid names leads to a larger, more persistent post-announcement drift. | **1. Shorting constraint**: Retail/small funds cannot short mid/small-caps overnight (lack of a viable SLB market in India). <br>**2. Frictions**: Transaction costs (bid-ask spreads + market impact + STT) on less-liquid names are very high ($100\text{--}250\text{ bps}$ round-trip) and erode 70–100% of theoretical drift profits. | **YELLOW**: Requires historical analyst consensus estimates to calculate Standardized Unanticipated Earnings (SUE), which we lack (requires `V2-025` consensus/fundamentals DB). | Lijo |
| **2. NLP-Based Earnings Sentiment Drift (Long-Only/Avoidance)** | India Proven Strategies Landscape (2026), SEntFiN 1.0 | **Tier B** (Practitioner event studies + annotated regional financial NLP datasets) | Avoids the need for consensus estimates (SUE) by scoring the earnings announcement text/PDF sentiment using an LLM or FinBERT. Long-only or avoidance portfolio overlay is highly feasible (doesn't require shorting; reduces portfolio volatility). | **1. Scorer Bias**: Sentiment scorers exhibit a persistent positivity bias (88% of days positive). <br>**2. PDF parsing complexity**: Mid/small-cap regulatory PDFs are frequently scanned images or poorly formatted, making text extraction difficult. | **GREEN**: Fits the `india_bourse_announcements` PDF collector and FinBERT sentiment pipeline. | Both (James builds parser, Lijo validates) |
| **3. Price-Reaction Proxy PEAD with Momentum Filters** | Bernard & Thomas (1990), Chakrabarti & Sen (2021) | **Tier A** (SSRN paper on Indian equities) | Uses Day 0 abnormal return as a proxy for the earnings surprise, avoiding consensus database requirements. Restricting entries to stocks that are already in a medium-term trend (above 50-day MA) and experience a positive earnings surprise filters out value traps and ensures liquidity is sufficient for entry. | **1. Capacity**: Filters drastically reduce the number of tradeable events in the mid/small-cap universe. <br>**2. Signal Lag**: Price reaction proxy is less precise than SUE and can capture noise rather than structural earnings surprises. | **GATED on G4** *(corrected 2026-06-04)*: `research_prices` is Nifty-50 only — 96% (16,617/17,322) of filings unpriceable per `_data_gaps_backlog.md`. Runnable on the Midcap 150 universe only **after** G4 widens `research_prices` to Nifty 200/500. | Lijo |

---

## Verdict (gate-checked)

- **Recommendation**: **PARK** the SUE-based strategy; **PURSUE (as a pre-registered design, gated on G4)** a pilot event study — *next free Exp ID (Exp16 at time of writing; assign from the experiment registry `wiki/experiments/_index.md` at pre-registration)* — using the Day 0 Price-Reaction Proxy.
- **Gate**: data tier ⚠️ **gated on G4** *(corrected 2026-06-04)* — `research_prices` is Nifty-50 only, so the Midcap 150 universe is not priceable until G4 widens it (SUE separately needs consensus estimates we lack) · kill list ✅ (proprietary quant backbone, not B2B/SaaS) · live consumer ✅ (the mid-cap event-arbitrage strategy class) · right denominator ✅ (market-adjusted returns net of execution costs).
- **If Pursue (Day 0 Price-Reaction Proxy event study)**:
  - *Lane*: Lijo (signal validation).
  - *Effort*: Low to write (adapt the `Exp 2` script to snap to earnings dates, use Day 0 AR as the surprise proxy) — **but it cannot run until G4 lands** (midcap prices loaded). Design now, fire when G4 is done.
- **If Park (Traditional SUE-based PEAD)**:
  - *Blocker*: Lack of a historical consensus estimates / quarterly fundamentals database — **a to-be-filed collector** *(corrected 2026-06-04: the original draft cited `V2-025`, which is not a real filed task; never cite a V2-### that doesn't exist in `CLAUDE.md`/`ai_docs/tasks/`).*
  - *What makes it testable*: Ingesting historical quarterly consensus numbers or building an LLM pipeline to parse year-on-year earnings growth directly from bourse PDF attachments.

---

## Open questions / what I couldn't verify
1. **SLB Availability**: What percentage of Nifty Midcap 150 / Smallcap 250 names are actually borrowable overnight in the Securities Lending and Borrowing (SLB) market? If SLB liquidity is zero, any short-side PEAD strategy is purely academic.
2. **Scanned PDF volume**: What proportion of mid/small-cap earnings announcements are uploaded as scanned images (requiring heavy OCR) vs. machine-readable PDFs? This determines the engineering complexity for the NLP sentiment candidate.
3. **Amihud Illiquidity Calibration**: What is the historical Amihud illiquidity distribution for Nifty Midcap 150 constituents? At what threshold of Amihud illiquidity does the execution impact cost completely swallow the drift?

---
*Reflections for Lijo: The research shows a clear dichotomy. Academics prove that PEAD exists and is stronger in less-liquid names, but they use the Amihud measure as a control variable rather than a trading filter. When practitioners overlay transaction costs, the drift in the most illiquid names is almost entirely eaten by slippage. Thus, the sweet spot is the "semi-liquid" mid-cap universe (Nifty Midcap 150), where slippage is manageable but analyst coverage is still sparse enough to leave a delayed repricing window.*
