# C2 — Router prompt + spec (SachManas Phase 2)

The router's only job: take one article (headline + description, body not required) and assign **where it
goes** — nothing about prediction. It writes `route_label`, `route_family`, `category_tag` on the `articles`
row. Model: Groq `llama-3.1-8b-instant` (free tier). A free **keyword pre-filter runs first** so obvious junk
never reaches the LLM.

## The firewall (non-negotiable — blueprint v0.1 §5)
Output **two separate things**:
1. **`route_label` ∈ {`company`, `factor`, `ignore`}** + (when `factor`) **`route_family`** — this is what the
   later rules engine may eventually read.
2. **`category_tag` ∈ 1..12** — organisation/audit only. **It may NEVER become a rule weight.** Kept on the row
   so junk (cat 12) is provably quarantined and so we can slice the corpus, nothing more.

## The 12 categories → route mapping
| # | Category | Default route |
|---|----------|---------------|
| 1 | Company events (results, orders, M&A, launches, mgmt) | **company** |
| 2 | Insider & smart money (promoter/pledge/bulk-block/FII-DII/stake) | **company** |
| 3 | Politics & power | **factor:politics** |
| 4 | Govt schemes & policy | **factor:policy** |
| 5 | Regulators & courts (SEBI/RBI/CCI/NCLT/court) | **company** if a specific listed co is the subject, else **factor:regulatory** |
| 6 | Macro & rates (MPC, inflation, GDP, INR, trade) | **factor:macro** |
| 7 | Commodities & energy (crude, metals, coal, gold, power) | **factor:commodity** |
| 8 | Weather & seasons (monsoon, heat, floods, harvest) | **factor:weather** |
| 9 | Global & geopolitics (Fed, China, wars, sanctions) | **factor:global** |
| 10 | Sector & industry (auto sales, telecom tariffs, IT cycle) | **factor:sector** |
| 11 | Incidents & disasters (fire, recall, fraud, strike) | **company** if one firm, else **factor:sector** |
| 12 | Noise & promotion (opinion, tips, pump, single-source) | **ignore** |

**`ignore` also covers:** purely foreign-market news with no Indian factor relevance (a US-only IPO, a US
poll). A foreign event that DOES move an Indian factor (Fed decision, crude, China demand) is **factor**, not
ignore — judge by Indian-market relevance, not dateline.

## Keyword pre-filter (free, runs before Groq)
- Hard-`ignore` without an LLM call: horoscope, cricket/sports scores, lottery, celebrity/lifestyle,
  recipe/health-tips, explicit "advertorial/sponsored/brandhub" url paths.
- Hard-`company` candidate hint: headline contains an NSE-master name/alias (reuse `shared/nse-equity-master`
  alias matching) → still sent to Groq, but the hint rides in `router_trail.keyword_hits`.
- Everything else → Groq.

## Output contract (strict JSON, no prose, no fences)
```json
{
  "route_label": "company | factor | ignore",
  "route_family": "politics|policy|regulatory|macro|commodity|weather|global|sector | null",
  "category_tag": 1,
  "confidence": 0.0,
  "reason": "one short clause, grounded in the headline/description"
}
```
Rules: `route_family` is non-null **iff** `route_label="factor"`. `category_tag` is always set (even for
`ignore` → 12, or the foreign-but-ignored case → its natural category). Keep it deterministic enough to
hand-grade.

## System prompt (give to Groq verbatim)
```
You are the news router for an Indian-equity intelligence system. You decide WHERE an article goes — you do
NOT judge whether it is good or bad news, and you do NOT predict prices.

Output ONE JSON object, exactly these keys: route_label, route_family, category_tag, confidence, reason.

route_label:
  "company" — the article is mainly about ONE specific Indian LISTED company (or names one as the clear subject):
              its results, orders, M&A, launches, management, pledges/stake/block-deals, a regulator/court
              action against it, or an incident at it.
  "factor"  — the article is about the WORLD, not one company: politics, government policy/schemes, macro &
              rates, commodities & energy, weather & seasons, global/geopolitics, or a whole sector/industry.
              Set route_family to the matching family.
  "ignore"  — opinion/tips/pump/unverifiable single-source promotion, OR purely foreign-market news with no
              Indian-market relevance.

route_family (only when route_label="factor"): politics | policy | regulatory | macro | commodity | weather |
  global | sector.

category_tag (1-12, organisation only):
  1 Company events · 2 Insider & smart money · 3 Politics & power · 4 Govt schemes & policy ·
  5 Regulators & courts · 6 Macro & rates · 7 Commodities & energy · 8 Weather & seasons ·
  9 Global & geopolitics · 10 Sector & industry · 11 Incidents & disasters · 12 Noise & promotion.

Judge relevance by the Indian market, not the dateline: a foreign event that moves an Indian factor (US Fed,
crude, China demand) is "factor", not "ignore"; a US-only IPO or US-only poll with no Indian factor is "ignore".
A SEBI/RBI/court action goes "company" if one listed firm is the clear subject, else "factor"/regulatory.
```

## Few-shot examples (real, from the P1d sample — known-correct)
| Headline (abridged) | route_label | route_family | cat | why |
|---|---|---|---|---|
| ICICI Pru Life Q4 net profit falls 26% | company | null | 1 | one listed firm's results |
| Goldman/MS buy 2.3% stake in Lenskart (block deal) | company | null | 2 | smart-money on one listed firm |
| SEBI to review delisting framework | factor | regulatory | 5 | regulator, no single subject |
| Indian firms raise $3.76bn via ECBs (Reliance, IOC…) | factor | macro | 6 | macro aggregate, many firms |
| US FDA import alert on Dabur plant | company | null | 5 | regulator action, one listed firm |
| SpaceX makes Nasdaq debut at 25% premium | ignore | null | 9 | foreign-only, no Indian factor |
| Americans wary of AI data-center boom (US poll) | ignore | null | 9 | foreign-only, no Indian factor |
| Crude slumps as OPEC raises output | factor | commodity | 7 | commodity factor (would touch crude+INR+shipping) |

## What the router does NOT do
- No entity extraction / ticker resolution (that's the Phase-4 specialist; the listed-universe gate is applied
  there). The router may pass a candidate name in `router_trail.keyword_hits`, nothing more.
- No stance/novelty/surprise. No body required (route on headline+description; C1 fetches the body only for
  `company`/`factor` rows per the P1c fetch gate).

## Acceptance (Phase-2 gate)
100-article hand-check, `route_label` precision ≥90% (two-grader pattern: Claude provisional + blind Gemini +
Lijo adjudicates disagreements — the same method that locked P1d).
