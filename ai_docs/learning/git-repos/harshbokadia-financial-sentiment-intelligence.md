---
github_url: https://github.com/harshbokadia/financial-sentiment-intelligence
owner: harshbokadia
repo: financial-sentiment-intelligence
license: Unknown
language: Python
last_commit: Unknown
stars: ~0
audience: professional
tags: [alternative-data, fintech, groq, indian-markets, nlp, sentiment-analysis]
domains: [sentiment, tagging]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
evidence_checked: [V2-031b, exp11/coverage_check.md, exp11_brief.md §11.4]
---

# Financial Sentiment Intelligence — Calibrated NLP for Nifty 50

> **Why Lijo added this**: To extract advanced NLP processing architectures for Indian equity markets, specifically techniques like comparative LLM scoring and sector-weight propagation which SachNetra's `_sentiment-chain.mjs` currently lacks.

---

## TL;DR (3 bullets)

- A real-time NLP pipeline that pulls 47 RSS feeds and 10 subreddits, scoring them via Groq (LLaMA 3.3).
- **Strongest best practice (sentiment domain)**: "Sector Propagation". If an article is tagged as `sector_wide` (e.g., an RBI rate cut), the sentiment is automatically distributed to all companies in that sector *weighted by their Nifty 50 index weight*.
- **Second best practice (sentiment domain)**: Calibrated anchor events in the LLM prompt so a 0.8 score means the same thing over time.
- **Biggest caveat**: Uses SQLite and Streamlit — standalone local dashboard, not our edge/Railway pipeline. **Does not fix G1 tagging** (different domain).

---

## ELI12 — what is this repo?

Usually, when AI reads financial news, it gets confused. If it reads "RBI cuts rates," it doesn't know which companies that affects. This repo fixes that. It teaches the AI to realize "Rate cut = good for banks." Then, it looks at the Nifty 50 index and says, "Since HDFC Bank is the biggest bank, they get the biggest positive score from this news, and smaller banks get smaller scores." It also ensures the AI doesn't overreact by forcing it to compare every new article against a master "anchor" list of past events.

---

## Architecture snapshot

```
financial-sentiment-intelligence/
├── /src/ingestion    — Fetches 47 RSS feeds + 10 subreddits (parallelized)
├── /src/pipeline     — Orchestrates the Groq LLM call and calibration logic
│   ├── scoring.py    — Handles the sector propagation by index weight
│   └── signals.py    — Detects sentiment reversals and spikes
└── /config           — JSON configs mapping companies to their index weights
```

**Stack**: Python, Groq (LLaMA), SQLite, Streamlit

**Entry points**: `main.py` orchestrates the pipeline.

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Sector Propagation by Index Weight | `/src/pipeline/scoring.py` | Macro news (like a tax hike) impacts large-cap companies more heavily in index terms. Distributing sentiment proportionally prevents equal-weighting bias. |
| 2 | Calibrated Anchors | `/src/pipeline/calibration.py` | Injecting reference "anchor" texts into the LLM prompt prevents sentiment drift, ensuring a 0.8 score today means the exact same thing as a 0.8 score yesterday. |
| 3 | Single-Pass Multi-Extraction | `README.md` (Stage 2) | Forcing the LLM to return Summary, Importance, Sector, Entities, and Scores in one single JSON payload drastically reduces API calls and token costs. |

### Deep dives (optional)

- **Calibrated Anchors**: LLMs are notoriously bad at absolute scoring (is this news a 0.7 or a 0.9?). This repo passes a `calibration.json` file inside the prompt, effectively saying: "Remember, the 2020 Covid crash was a -1.0, and the 2024 massive earnings beat by Tata was a +0.9. Score this new article relative to those." 

---

## Evidence cross-check

| Claim about SachNetra | Evidence source | Measured value | Gate | Pass? |
|---|---|---|---|---|
| G1 precision | `coverage_check.md` + exp11 §11.4 | Pre-031b ~63%; post-031b May 28 slice clean (no IPL junk) | ≥90% | partial → Y on forward slice |
| G1 coverage | exp11 §11.4 | May 28: 194/2,732 = **7.10%** | ≥20% | **N** |
| Sentiment calibration | `research_state_summary.md` Exp 3 | ~88% positive bias | discriminating | N |

---

## Domain map

| Domain | Relevant? |
|---|---|
| **Tagging (G1)** | **N** — repo uses its own entity extraction; not a tagger hardening reference |
| **Sentiment (G6)** | **Y** — sector propagation + calibration anchors |
| **Research** | partial — no backtest discipline |

---

## Design principles — reinforced or contradicted

| Principle | Repo stance | SachNetra stance | Verdict |
|---|---|---|---|
| Deterministic ticker resolution | Unknown NER quality in repo | Dict + word-boundary regex (V2-031) | **Reinforces dict-first** — do not swap tagger for Groq |
| LLM for synthesis/scoring | Groq for sentiment JSON | `_sentiment-chain.mjs` | Reinforces |

**One-line design read**: Valuable for **sentiment upgrades** (propagation, anchors). Not a tagging fix — keep V2-031b/031c dict path as tier-1.

---

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Domain | Repo tier | Repo location | Why this tier |
|---|---|---|---|---|
| Sentiment Normalization | sentiment | Excellent | `/src/pipeline/calibration.py` | Comparative anchor scoring solves LLM drift. |
| Sector Propagation | sentiment | Excellent | `/src/pipeline/scoring.py` | Index-weight distribution models macro impact on constituents. |
| Ingestion Architecture | data-engineering | Good | `/src/ingestion/rss_fetcher.py` | Standard Python fetch; we already have relay/cron. |
| Entity tagging | tagging | Good | README Stage 2 | Generic extraction — not compared to our alias map without evidence. |

### SachNetra today vs target

| Feature | Domain | SachNetra today | Repo reference | Target for us | Gap | Evidence |
|---|---|---|---|---|---|---|
| Headline→ticker (G1) | tagging | **Good** (precision fixed post-031b; recall **Poor**) | Good | Better | +1 | 7.1% coverage — exp11 §11.4 |
| Macro sentiment propagation | sentiment | **Good** | Excellent | Excellent | +2 | macro tagged, not propagated to constituents |
| Sentiment calibration | sentiment | **Good** (G6 bias open) | Excellent | Excellent | +2 | Exp 3: 88% positive days |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Domain | Target tier | Today tier | Blocked by | Source | Owner | Verdict |
|---|---|---|---|---|---|---|---|---|
| P0 | Sector propagation by index weight | sentiment | Excellent | Good | G6 optional | `/src/pipeline/scoring.py` | James | Pursue |
| P1 | LLM calibration anchors | sentiment | Excellent | Good | — | `/src/pipeline/calibration.py` | James | Pursue |
| — | Replace dict tagger with Groq NER | tagging | — | — | V2-031 D2 | README | — | **Kill** |

---

## Do not build (Poor)

> Features rated **Poor** for SachNetra. Explicit kill list — prevents shiny-repo creep.

| Feature | Domain | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|---|
| LLM-primary ticker tagging | tagging | Good in repo | V2-031 locks dict-first; pre-031b precision was 63% | Kill |
| Local SQLite Storage | data-engineering | Good in repo | We use Railway PostgreSQL | Kill |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Domain | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|---|
| NLP extraction | sentiment | Single-pass JSON (Groq) | Single-pass in `_sentiment-chain.mjs` | none | Park |
| Contextual sentiment | sentiment | Index-weight propagation | Direct mentions only | major | Pursue |
| Ticker resolution | tagging | LLM entities | Dict regex via `nse-equity-master.json` | different approach | **Kill swap** — harden dict (V2-031c), not replace |

**What we already do well** (don't reinvent):
- Deterministic RSS + cron pipeline (`ais-relay`, `seed-india-signals.mjs`)
- Dict-based ticker resolution architecture (correct tier-1; needs recall work via V2-031c)

**What we're missing**:
- **Sentiment**: sector propagation + calibration anchors (this repo's actual lesson)
- **Tagging**: coverage recall (7.1%) — fix via alias/body-fetch (V2-031c), not this repo

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Add LLM calibration anchors to the prompt in `_sentiment-chain.mjs` | James | S | Pursue | Hardcode 5-10 historical anchor events to stabilize our sentiment baseline. |
| 2 | Build a `_sector-propagator.mjs` step to distribute macro news scores down to constituents based on Nifty weights | Lijo | M | Pursue | Requires loading `shared/nifty-midcap150.json` or similar weights config. |

---

## Risks & limitations

- **License**: Unknown.
- **Maintenance**: Looks like a new/active project.
- **Data assumptions**: Relies on a static `companies.json` index weight file, which NSE updates semi-annually.
- **Overfit risk**: N/A
- **Stack mismatch**: Python vs our Node/TS backend, but the logical architecture of sector propagation is easily portable.

---

## Net verdict

1. **Tier-1 (sentiment)**: Port sector propagation + calibration anchors into `_sentiment-chain.mjs` — genuine P0/P1 upgrades.
2. **Tier-2 (tagging)**: G1 recall still fails (7.1% coverage) — **V2-031c**, not Groq NER from this repo.
3. **Do not confuse**: This repo improves **sentiment intelligence**, not **ticker tagging**. Dict tagger stays primary; transformer/LLM tagging is gated fallback only (V2-031 Decision 2).

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A

**Features / engineering to build**:
- Sector propagation logic for macro/sector-wide news.

**Data to capture**:
- We need to pull the official NSE index weights into our `shared/` directory to enable sector propagation.

**Features / engineering to build**:
- **Sentiment**: sector propagation + calibration anchors
- **Tagging**: N/A from this repo — continue V2-031c for recall

**Pursue / Park / Kill** (pick exactly one):

- **Pursue** — Sentiment-domain upgrades (sector propagation + calibration anchors). Tagging is out of scope for this repo.

---

## Corrections log

| Date | What was wrong | Corrected to | Evidence |
|---|---|---|---|
| 2026-05-30 | "We tag entities perfectly" / Better tier on tagging | Good today (precision fixed); recall Poor at 7.1% | exp11 §11.4, V2-031b task |
| 2026-05-30 | "Ticker resolution more robust than their NER" | Dict-first is correct architecture; not "perfect" — gates failed pre-031b | coverage_check.md |

---

## Open questions (for next session)

- None.

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
