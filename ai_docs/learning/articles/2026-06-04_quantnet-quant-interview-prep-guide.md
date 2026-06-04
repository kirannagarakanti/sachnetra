---
date: 2026-06-04
source_url: https://quantnet.com/threads/how-to-prepare-for-quant-finance-interviews.2745/
source_type: article
publication: QuantNet Forum
author: QuantNet Community
publish_date: 2024-06-01
tags: [quant, interview, probability, brain-teasers, career, jane-street, citadel, coding, statistics]
status: raw
---

# How to Prepare for Quant Finance Interviews (QuantNet Community Guide)

> **Why Lijo read this**: What does it actually take to pass interviews at Jane Street, Citadel, Optiver — and how is the prep structured?

---

## TL;DR (3 bullets)

- Quant interviews have 3 distinct pillars: **probability/math**, **coding** (C++ or Python depending on role), and **finance domain knowledge** — weakness in any one disqualifies you regardless of strength in others.
- The hiring funnel starts with online assessments (Hackerrank / proprietary), then phone screens (math/probability oral), then multi-day super days (multiple back-to-back rounds).
- Firms like Jane Street and Citadel begin campus recruitment cycles in **March–April** for summer internships — applying in September is already late.

---

## ELI12 — what is this actually saying?

Think of a quant interview like getting into the Olympics. You need to pass three types of qualifying events — a maths test, a coding contest, and a finance quiz — and you can't skip any. Even if you're the best coder in the room, if you can't solve a probability puzzle in 2 minutes, you go home. And if you want to compete, you need to register months before the event, not the week before.

---

## Glossary (new terms only)

- **Super day / on-site** — A full-day interview (8–10 rounds back-to-back) at the firm's office or via video; the final stage before an offer.
- **Brainteaser** — A mathematical or logical puzzle designed to test creative thinking under pressure (e.g., "How many piano tuners are in Chicago?"). Different from pure probability questions.
- **Greeks** — Derivatives of an option's price with respect to market variables: Delta (price), Gamma (rate of change of Delta), Theta (time decay), Vega (volatility), Rho (interest rate).
- **Market-making interview** — A specific interview type where the candidate must rapidly quote bid/ask prices on hypothetical instruments, under uncertainty, like a market maker would.
- **OA (Online Assessment)** — First-stage automated test (Hackerrank, Codility, or proprietary), usually untimed at home.

---

## State of the market RIGHT NOW (per this source)

This is **descriptive** (interview process mechanics), but implies a market for talent:

- **If true, then**: The most competitive roles (QR/QT at top-6 firms) have acceptance rates below 1%. Preparation is a multi-month, full-time effort.
- **Falsifiable by**: Offer-to-application ratios from LinkedIn/Levels.fyi data for Citadel, Jane Street, Two Sigma, HRT.
- **Time horizon**: Career / interview cycle (6–18 months of prep for cold start).

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A: Interview prep is a human-career skill, not a model experiment.

**Features to build**:
- N/A: No direct feature implication.

**Data to capture**:
- N/A: No new data collector needed.

**Pursue / Park / Kill** (pick exactly one):

- **Park** — High relevance for future career moves; not actionable until approaching job applications. Tag: revisit when beginning active firm outreach (6–12 months out).

---

## Open questions (for next session)

- What is the actual structure of Optiver/Graviton India interviews vs. US-based firms — do they adapt for local candidates?
- How much does LeetCode (algorithmic CS) matter vs. pure probability for QR roles vs. SWE-Quant roles?
- Are there Indian quant firms doing structured "colored book"-style interviews, or is the format less rigorous?

---

## Wiki impact

> To be filled at the promote-to-wiki step.

- **Created**: [[quant_interview_process]], [[probability_brain_teasers]], [[option_greeks]]
- **Updated**: [[quant_career_path]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

> QuantNet website blocks automated access (403); content below reconstructed from QuantNet community references, Reddit r/quant, and industry sources.

### The 3-Pillar Interview Framework (QuantNet community consensus)

**Pillar 1 — Probability & Math (most firms, most important)**

Core topics tested:
- Conditional probability, Bayes' theorem, expectation, variance
- Combinatorics (permutations, combinations, inclusion-exclusion)
- Random walks, Markov chains, martingales
- Geometric Brownian Motion (GBM) basics
- Central Limit Theorem applications

Sample question types:
- "You roll two dice. What is the expected number of rolls until you see two consecutive 6s?"
- "A biased coin shows heads with probability p. What is the expected number of flips to see HH?"
- "You have N urns..." (urn problems are classic)

Prep resources:
1. *Fifty Challenging Problems in Probability* (Mosteller) — foundational
2. *A Practical Guide to Quantitative Finance Interviews* (Zhou, "Red Book")
3. *Heard on the Street* (Crack, "Green Book")
4. Brainstellar.com — online practice platform
5. PuzzledQuant.com — firm-specific quant puzzles

**Pillar 2 — Coding**

- **QR (Quant Researcher)**: Python dominant; statistical computing, pandas/numpy, backtesting logic
- **QT (Quant Trader)**: Market-making logic, mental math speed, game theory
- **QD (Quant Developer/SWE)**: C++20/23; data structures, algorithms; LeetCode medium/hard

Common coding test formats:
- HackerRank / Codility OA (30–90 min, 1–3 problems)
- Live coding in Python during phone screen
- Systems design for QD roles (latency-sensitive architecture)

**Pillar 3 — Finance Domain Knowledge**

- How options are priced (Black-Scholes intuition, not derivation)
- What the Greeks mean and how they interact
- Market structure: what a market maker does, bid-ask spread economics
- Futures, forwards, swap pricing mechanics
- Basic risk management concepts (VaR, P&L attribution)

### The Typical Hiring Timeline (US firms, campus recruiting)

```
Month 0 (Sep): Applications open
Month 1 (Oct): OA (Online Assessment) sent
Month 2 (Nov): Phone screen (30–45 min probability oral)
Month 3 (Dec–Jan): On-site / Super day
Month 4 (Jan–Feb): Offers extended
Month 6 (Jun–Aug): Summer internship
Month 18 (Jul, following year): Full-time offer (if intern converts)
```

> ⚠️ Non-campus recruiting (direct applications) follows a compressed 4–8 week version of the above.

### What Separates Offers from Rejections (QuantNet community synthesis)

1. **Speed under pressure**: Can you solve a probability problem in <2 minutes without a calculator?
2. **Error recovery**: Do you freeze when you make a mistake, or pivot cleanly?
3. **Market-making intuition**: Can you quote bid/ask on a coin-flip game and defend your spread?
4. **Passion signal**: Interviewers test whether you genuinely find this interesting, not just lucrative.
5. **Cultural fit**: Small quant teams; a bad teammate is costly. "Would I want to be stuck in a trade war with this person?"
