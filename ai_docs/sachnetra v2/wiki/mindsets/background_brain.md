---
tags: [mindset, learning, passive-learning, compounding-knowledge, worldquant]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Background Brain

**TL;DR:** Background Brain is the practice of continuously absorbing domain knowledge passively — consuming quant finance content the same way you'd listen to music, so that concepts compound in the background while you build.

## The Core Idea

Lijo (SachNetra founder) operates in two modes:
1. **Active building**: writing code, implementing features, managing James
2. **Background learning**: watching lectures, reading papers, absorbing frameworks

The "background brain" strategy means: never let the learning stop even when you can't actively study.

## Why It Works for SachNetra

- Quant finance has a steep learning curve (IC, IR, time series, entity-aware sentiment)
- You cannot afford to stop building while you learn
- But passive absorption fills gaps that active building misses
- After enough background exposure, concepts click suddenly during active work

The moment Lijo described watching a WorldQuant lesson on "Sentiment Buzz" and recognising it was exactly the Poisson surge detector already in SachNetra — that's background brain making a connection.

## The Recommended WorldQuant Brain Watch Sequence

Watch in this order while doing other things:

1. **Sentiment Data Overview & Data Fields** (Lesson 0) — defines what SachNetra should output
2. **Price Volume Data** (Lesson 4) — baseline before alternatives
3. **Fundamental Data & Base Data** (Lesson 3) — company financials as signals
4. **Customer & Sentiment Data** (Lesson 1) — format SachNetra signals need
5. **Sentiment Data** (Lesson 7) — advanced concepts
6. **Analyst Data Value** (Lesson 0) — source credibility framework
7. **Why Use Delayed Data** (Lesson 12) — CRITICAL: explains three-timestamp system and look-ahead bias
8. **Alpha Examples by Data Category: Part 2** (Lesson 2) — watch LAST, recognise SachNetra patterns

Note while watching:
- How does WorldQuant define a "data field"? → Redis key structure
- What format do sentiment scores come in? → match their convention
- How do they handle missing data? → forward fill/zero/NaN?
- What time granularity? → daily vs hourly

## Papers to Absorb (After Pipeline is Running)

Do NOT read before the PostgreSQL table exists. Read AFTER:

1. **SEntFiN 1.0 paper** — 10,753 annotated Indian financial headlines; validate your FinBERT against this
2. **"Entity-aware sentiment in NSE 500" paper** — proves the thesis academically
3. **Grinold's Fundamental Law of Active Management** — IC × √Breadth = IR

## Books (After Month 2 of Data Collection)

- **"Advances in Financial Machine Learning"** — Marcos Lopez de Prado; most important quant ML book written
- **"Algorithmic Trading"** — Ernest Chan; practical Python examples

## The Dunning-Kruger Awareness

Lijo identified the feeling: "I feel like there is much to learn."

This is the Valley of Despair on the learning curve — NOT a sign of failure. It is the first sign you understand something deeply enough to see the horizon.

```
Confidence
│    Peak of "Mount Stupid"
│   /\        (beginner: thinks they know everything)
│  /  \
│ /    \____________  ← Lijo: "too much to learn" (Valley of Despair)
│                    \                    /
│                     \________________/  (Slope of Enlightenment)
└─────────────────────────────────────── Knowledge
```

People who know nothing feel certain. People who know something feel the weight of what remains.

## The Anti-Pattern to Avoid

Using background learning as a substitute for building. Signs:
- "I need to understand X better before implementing Y"
- "Let me read one more paper before writing the code"
- Reading papers at 2am while the PostgreSQL table still doesn't exist

The rule: background brain supplements building; it never replaces it.

## Linked Nodes

- [[quant_finance]]
- [[world_quant]]
- [[sachnetra_quant_pivot]]
- [[compounding]]
- [[personal_investing]]
