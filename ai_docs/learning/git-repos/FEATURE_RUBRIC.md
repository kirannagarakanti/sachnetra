---
tags: [learning, git-repos, features, rubric, sachnetra]
audience: Gemini agent + any future Claude/Antigravity session
created: 2026-05-30
---

# Feature Quality Rubric — Poor / Good / Better / Excellent

**Purpose.** When documenting a reference repo or comparing it to SachNetra, every **feature or capability** gets rated on a four-tier scale. This is not vibes — each rating needs a one-line justification tied to evidence (repo path, SachNetra path, experiment result, or research state).

Use this rubric for:
1. **Repo features** — what the reference project offers
2. **SachNetra today** — what we already ship or collect
3. **SachNetra target** — what we should build or upgrade

---

## The four tiers (definitions)

| Tier | Label | Meaning | Default action |
|---|---|---|---|
| 1 | **Poor** | Wrong for us: anti-pattern, hype, killed by evidence, stack mismatch, or high cost / low proof | **Kill** or ignore |
| 2 | **Good** | Table stakes: solid, common, worth having eventually; baseline industry practice | **Park** unless unblocked and cheap |
| 3 | **Better** | Meaningful step above baseline: clear ROI for SachNetra's V2 mission (data asset + validated edge) | **Pursue** when prerequisites met |
| 4 | **Excellent** | Best-in-class for our constraints: hard to do well, directly strengthens collectors, signals, or validation | **Pursue** — prioritize in roadmap |

**Rule:** A feature cannot be **Excellent** if our research state or experiments have **killed** the underlying hypothesis (e.g. "FII flow predicts next-day direction" = Poor, not Excellent).

**Rule:** **Good** is not an insult — it means "fine, not differentiated." Most repos ship mostly Good features with a few Better/Excellent patterns buried inside.

---

## How to decide (decision tree)

Ask in order:

1. **Evidence** — Does SachNetra research or the repo show rigorous proof (walk-forward, costs, leakage guards)?  
   - No + prediction hype → **Poor**  
   - Yes but generic → **Good**  
   - Yes + clearly above peers → **Better** or **Excellent**

2. **Mission fit** — Does it permanently improve the **database asset** or **signal validation**?  
   - Neither → **Poor** or **Good** at best  
   - One → **Good** or **Better**  
   - Both → **Better** or **Excellent**

3. **India / stack fit** — Works on Node/TS, Railway PG, Redis, Vercel Edge, Indian sources?  
   - No without major rewrite → cap at **Good** (Park)  
   - Yes → tier can rise

4. **Cost vs proof** — Engineering weeks for unvalidated alpha? → cap at **Good** (Park) until experiment files

---

## Feature categories (rate at least one item per category when relevant)

| Category | Examples to look for |
|---|---|
| **Data collection** | New sources, latency, idempotent seeds, backfill, schema design |
| **Data quality** | PIT joins, survivorship, corporate actions, dedup, audit trails |
| **Signal / features** | Entity tagging, sentiment, flows, vol, cross-asset, regime flags |
| **Research / backtest** | Walk-forward, leakage tests, transaction costs, experiment registry |
| **ML / AI** | Training pipeline, model versioning, FinBERT/NLP, feature store |
| **Options / derivatives** | Chain storage, OI, Greeks, vol surface (V2-024+) |
| **Product / UX** | Panels, alerts, explainability (lower priority per V2 positioning) |
| **Ops / reliability** | Cron health, monitoring, cache tiers, rate limits, replay |

Skip categories that genuinely don't apply — mark **N/A**.

---

## Rating SachNetra today vs target

For each notable feature, fill **two** columns:

| Feature | SachNetra today | Repo reference | Target for us | Gap (tiers) |
|---|---|---|---|---|
| Example: NSE filing latency | **Excellent** — ~13m vs wire (Exp 4) | Good — batch download only | Maintain **Excellent** | 0 |
| Example: Walk-forward backtest harness | **Good** — `scripts/research/` exists | **Excellent** — full framework | **Better** → **Excellent** | +2 |
| Example: LSTM next-day Nifty predictor | N/A (not built) | **Poor** — no costs shown | **Poor** — killed by Exp 1/7/9 | — |

**Gap** = target tier minus today tier (using ordinal: Poor=1, Good=2, Better=3, Excellent=4). Positive gap = upgrade opportunity.

---

## "Best to have" shortlist (required output)

After rating, produce a **Best to have in SachNetra** table — max 10 rows, sorted by target tier (Excellent first) then gap:

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner | Verdict |
|---|---|---|---|---|---|---|
| P0 | <name> | Excellent | Good | `repo/path` | James / Lijo | Pursue |
| P1 | | Better | Poor | | | Park |

**Priority bands:**
- **P0** — Target **Excellent**, gap ≥ 2, Pursue
- **P1** — Target **Better** or **Excellent**, gap ≥ 1, Pursue or Park
- **P2** — Target **Good**, nice-to-have
- **—** — Target **Poor** — list under "Do not build" with Kill reason

---

## Do not build (Poor — explicit kill list)

Every repo doc MUST list features rated **Poor** for SachNetra with one-line kill reason. Prevents feature creep from shiny repos.

Example:
- **Auto-trading bot from Twitter sentiment** — Poor — no Indian market validation, Kill
- **Next-day direction from FII** — Poor — Exp 1/7/9 killed hypothesis

---

## Calibration examples (SachNetra-specific)

| Feature | Typical rating | Why |
|---|---|---|
| Permanent signal storage on every digest run | **Excellent** today | Core V2 mission; `seed-india-signals.mjs` |
| Redis cache + stampede protection | **Good** → **Better** | Works; could add health dashboards |
| News ticker tagging (G1/G2) | **Better** in progress | V2-031; unlocks mid-cap pivot |
| FII as directional signal | **Poor** | Killed by validated research |
| Options chain EOD storage | **Better** target | V2-024 filed; not live yet |
| Generic "AI stock picker" UI | **Poor** | Mission kill list; no proof |
| Walk-forward with cost model | **Better** target | Needed to promote any signal to Excellent |
| Point-in-time filing → price join | **Excellent** target | Directly supports Exp 10 / latency edge |

---

## Agent self-check

- [ ] Every rated feature has a justification (not just the label)
- [ ] SachNetra **today** cites a path or "not implemented"
- [ ] **Poor** items appear in "Do not build"
- [ ] **Best to have** table has ≤10 rows, sorted P0 → P2
- [ ] No **Excellent** on killed hypotheses
- [ ] Product/UX features capped at **Good** unless tied to validation workflow
