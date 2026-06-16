---
date: 2026-06-04
source_url: https://quantnet.com/threads/the-quantnet-reading-list.1073/
source_type: article
publication: QuantNet Forum (community-curated)
author: QuantNet Community / Andy Nguyen (admin)
publish_date: 2024-01-01
tags: [quant, reading-list, books, mathematics, programming, interview-prep, career, stochastic-calculus, microstructure, ml]
status: raw
---

# The QuantNet Master Reading List for Quant Finance

> **Why Lijo read this**: What books do working quants and top MFE programs actually read — and in what order?

---

## TL;DR (3 bullets)

- The canonical QuantNet reading stack has three tiers: **math foundations** (probability, stochastic calc), **finance mechanics** (derivatives, microstructure), and **interview prep** (the colored books: Green, Red, Joshi).
- Machine learning books (Lopez de Prado) are now tier-1 additions, but they sit on top of — not instead of — the math foundations.
- For programming: Python for research + C++ for production is the minimum viable combo; no one tier substitutes the other.

---

## ELI12 — what is this actually saying?

Imagine you want to become a professional chess player. There are books on basic rules, then books on openings, then books on famous games, then books on psychological tactics. QuantNet has a similar tiered list for quant finance. First you learn the math (like learning the chess rules deeply). Then you learn how financial instruments work (openings). Then you practice with books that simulate job interviews (tactical drills). If you skip tier 1, tier 2 books will confuse you.

---

## Glossary (new terms only)

- **Stochastic calculus** — Calculus applied to random processes (like stock prices). Foundation for derivatives pricing.
- **Shreve I & II** — *Stochastic Calculus for Finance* Vol. I (discrete time) and Vol. II (continuous time) by Steven Shreve. The MFE gold standard.
- **Hull** — *Options, Futures, and Other Derivatives* by John C. Hull. The universal reference text for derivatives. Updated every ~3 years.
- **Green Book** — *Heard on the Street* by Timothy Crack. Probability and math interview questions from Wall Street.
- **Red Book** — *A Practical Guide to Quantitative Finance Interviews* by Xinfeng Zhou. Brain teasers + probability for quant interviews.
- **Lopez de Prado (MdP)** — Marcos Lopez de Prado. Author of *Advances in Financial Machine Learning* (AFML). Chief Investment Officer at AQR (former); pioneer of ML applications in finance.
- **Market microstructure** — The study of how trading rules, order flow, and exchange mechanisms affect prices and liquidity. Distinct from macro-economics.
- **LOB (Limit Order Book)** — The queue of outstanding buy and sell orders at a venue. Core data structure for HFT and market-making.

---

## State of the market RIGHT NOW (per this source)

This source is **descriptive** (canonical reading list), not a trading prediction.

- The reading list's evolution is itself a market signal: the addition of Lopez de Prado's books as tier-1 resources signals that **ML is no longer optional** in quant research — it is a baseline expectation.
- **Time horizon**: Career / educational arc (3–5 years to execute fully).

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — Test if any signal from Larry Harris's *Trading & Exchanges* (LOB imbalance) correlates with short-term returns in NIFTY futures. Hypothesis: order imbalance predicts 1–5 minute price direction.
- N/A: Most other books are math/theory — no direct experiment trigger.

**Features to build**:
- LOB imbalance metric (bid-ask skew, depth ratio) — gated by getting Level-2 data from NSE.
- Probability-calibrated signal scoring — once we have enough signals, score them by expected value like a poker hand.

**Data to capture**:
- Level-2 order book snapshots (NSE) for LOB features — gated by NSE data access or Zerodha Kite WebSocket Level 2.
- Historical implied vol surface data — needed before implementing stochastic vol models (Shreve II content).

**Pursue / Park / Kill** (pick exactly one):

- **Park** — Re-triaged from Pursue (2026-06-04, Claude review). The LOB-imbalance experiment is the one genuinely interesting microstructure idea here, but it is gated on Level-2 depth data (Zerodha Kite WebSocket) we don't have. Larry Harris is fine as personal reading, but it's not a roadmap-mover until that data gate opens. Becomes Pursue when Level-2 access is secured.

---

## Open questions (for next session)

- Does Zerodha/NSE provide Level-2 (full depth) order book data for retail algo traders?
- What is the practical minimum LOB depth data needed to compute useful imbalance features?
- Is Lopez de Prado's *AFML* accessible as a study text without an MFE background, or does it require Shreve first?
- Which "colored book" (Green vs Red vs Joshi) is most relevant for Indian quant firm interviews (Graviton, Optiver India, AlphaGrep)?

---

## Wiki impact

> To be filled at the promote-to-wiki step.

- **Created**: [[quant_reading_list]], [[limit_order_book]], [[stochastic_calculus]]
- **Updated**: [[quant_career_path]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

> QuantNet website blocks automated access (403); content below reconstructed from public citations, QuantNet community references, and HN/Reddit discussions of the reading list.

**The QuantNet Tiered Reading List (reconstructed)**

### Tier 0 — Prerequisites (before MFE or quant study)
| Book | Author | Why |
|------|--------|-----|
| *Calculus* (any standard text) | Stewart / Spivak | Derivatives, integration, series |
| *Linear Algebra Done Right* | Axler | Matrix methods ubiquitous in quant work |
| *Introduction to Probability* | Blitzstein & Hwang | Best intuitive probability text; pairs with Harvard Stat 110 |

### Tier 1 — Mathematical Finance Core
| Book | Author | Why |
|------|--------|-----|
| *A Primer for the Mathematics of Financial Engineering* | Dan Stefanica | Bridge between math & finance |
| *Stochastic Calculus for Finance I* | Steven Shreve | Discrete-time; binomial trees → Black-Scholes |
| *Stochastic Calculus for Finance II* | Steven Shreve | Continuous-time; Itô's lemma; Girsanov |
| *All of Statistics* | Larry Wasserman | Frequentist + Bayesian; regression to ML bridge |

### Tier 2 — Finance Mechanics
| Book | Author | Why |
|------|--------|-----|
| *Options, Futures, and Other Derivatives* (Hull) | John C. Hull | The universal derivatives reference |
| *Concepts and Practice of Mathematical Finance* | Mark Joshi | Practitioner lens on math finance |
| *Trading and Exchanges* | Larry Harris | **Market microstructure bible** — order books, liquidity |
| *Statistics and Data Analysis for Financial Engineering* | Ruppert & Matteson | Real-world messy financial data |

### Tier 3 — Machine Learning & Advanced
| Book | Author | Why |
|------|--------|-----|
| *Advances in Financial Machine Learning* (AFML) | Marcos Lopez de Prado | Canonical ML-for-finance text |
| *Machine Learning for Asset Managers* | Marcos Lopez de Prado | Concise applied follow-up to AFML |

### Tier 4 — Interview Prep (Colored Books)
| Book | Author | Nickname |
|------|--------|---------|
| *Heard on the Street* | Timothy Crack | Green Book |
| *A Practical Guide to QF Interviews* | Xinfeng Zhou | Red Book |
| *Quant Job Interview Q&A* | Mark Joshi et al. | Joshi Book |
| *Fifty Challenging Problems in Probability* | Frederick Mosteller | Mosteller |

### Tier 5 — Industry/Culture Reading
| Book | Author | Why |
|------|--------|-----|
| *My Life as a Quant* | Emanuel Derman | Physics-to-finance career memoir |
| *The Quants* | Scott Patterson | Rise of quant trading firms |
| *The Man Who Solved the Market* | Gregory Zuckerman | Jim Simons / Renaissance Technologies |
| *Quantitative Trading* | Ernest P. Chan | Building an algo trading business |
