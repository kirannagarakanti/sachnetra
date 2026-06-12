---
date: 2026-06-12
problem: P1c — can the Mind fetch full article body from the load-bearing Indian outlets (the gnews-proxy /
  thin-feed sources P1b flagged), and by what mechanism?
status: RUN 2026-06-12. Three methods compared: Gemini API `url_context` (scripts/research/p1c-url-context-probe.mjs),
  Antigravity browsing agent (Gemini 3.5 Flash, run by Lijo), and our own raw-HTTP + JSON-LD parse
  (scripts/research/p1c-jsonld-probe.mjs). All read-only.
verdict: PLAN-CHANGING. The fetch spine should be OUR OWN deterministic fetcher (HTTP GET → JSON-LD
  `articleBody`), not Gemini `url_context`. The own-fetcher path pulls full body from 4 of 5 load-bearing
  sources for ₹0 and zero LLM quota — including Moneycontrol, which actively bot-walls Google's url_context
  fetcher. url_context demotes to a paid fallback for JSON-LD-less sources (Hindu BusinessLine).
---

# P1c results — the fetch path

P1b made fetching load-bearing (core business feeds = thin gnews-proxy snippets). P1c asked "can Gemini
fetch Indian outlets?" The honest answer reframes the question: **don't make Gemini do the fetching.**

## What each method found

| Source | Gemini API `url_context` | Antigravity agent (G3.5 Flash) | Own fetch + JSON-LD | Net reachable? |
|---|---|---|---|---|
| Economic Times | ✅ full body (median 574w, one 1334w) | ❌ (agent gave up) | ✅ 167w | **yes — 2 paths** |
| Moneycontrol | ❌ `URL_RETRIEVAL_STATUS_ERROR` (bot-wall) | ✅ 419/219w (JSON-LD) | ✅ 419w | **yes — own fetch only** |
| LiveMint | — (quota) | ❌ | ✅ 227w | **yes — own fetch** |
| Business Standard | — (quota) | ❌ | ✅ 383w | **yes — own fetch** |
| Hindu BusinessLine | — (quota) | ❌ | ❌ no ld+json | **fallback needed** |

(ET word counts vary by article length; the $3.76bn ECB story is genuinely short at 167w.)

## The two hard facts

1. **The free-tier `url_context` wall is 20 requests/day** — `GenerateRequestsPerDayPerProjectPerModel-FreeTier`,
   quotaValue 20, on `gemini-2.5-flash` (confirmed from the 429 QuotaFailure detail). `flash-lite` and
   `gemini-2.0-flash` carry separate quotas but are similarly small. This is nowhere near the Mind's
   hundreds-to-thousands of articles/day. **If url_context were the fetch spine, the program is dead on the
   free tier and expensive on the paid tier (every fetch = an LLM call).**
2. **JSON-LD `articleBody` is a free, deterministic, no-LLM extraction path** that works on 4/5 sources —
   crucially on Moneycontrol, the top absent source (memory: project_exp21_latency), which *blocks Google's
   url_context fetcher* but serves full `articleBody` to a normal HTTP GET.

## Why the methods disagreed (and which to trust)
- Antigravity reported LiveMint/BS as "no", but the raw JSON-LD parse gets them (227w/383w). The browsing
  agent eyeballed the rendered DOM / hit a consent gate; a **deterministic JSON-LD parse is more robust than
  an LLM reading the page.** Lesson: a browsing-agent "no" is not evidence a source is unreachable.
- MC: own-fetch ✅ vs url_context ❌ — confirms MC blocks Google's fetcher specifically, not plain HTTP.
- HBL: no `application/ld+json` block at all → genuinely needs a Readability/DOM-text fallback (or paid
  url_context, untested this run).

## Consequences (blueprint deltas — fold into the build blueprint)
1. **C1 fetch order is now specified, own-fetcher PRIMARY:**
   `HTTP GET (Chrome UA) → parse JSON-LD articleBody → [fallback] Readability/DOM-text → [last resort, paid]
   Gemini url_context`. Deterministic, free for ≥4/5 load-bearing sources, decouples fetch cost from LLM cost.
2. **url_context demotes from spine to narrow paid fallback** (blueprint v0.1 §6 had it as the fetcher; P1c
   inverts the priority). The 20/day free wall stops being a program risk.
3. **Per-source fetch_method tracker** (extends v0.1 §6 success-tracker): record which method won per source
   so the fetcher tries the cheapest-known-good path first. Seed: ET/MC/LiveMint/BS = `jsonld`; HBL = `readability?`.
4. **HBL + any JSON-LD-less source = open item:** test Readability extraction (and, once, paid url_context)
   before counting them in v1 coverage.
5. **FE + Business Today** remain feed-inaccessible (their "direct" RSS serves an HTML bot-wall) — they stay
   gnews-proxy + own-fetch-on-the-resolved-publisher-URL, same JSON-LD path applies once the real URL is known.

## Artifacts (read-only, re-runnable)
- `scripts/research/p1c-url-context-probe.mjs` — Gemini API url_context probe (quota-bounded at 20/day).
- `scripts/research/p1c-jsonld-probe.mjs` — own-fetch JSON-LD articleBody probe (free; the recommended path).
- `scripts/research/p1c0-direct-rss-check.mjs` — the earlier direct-publisher RSS check.

## Next
- P1c is **answered** for the fetch-feasibility gate: the Mind can read its load-bearing sources cheaply.
- Remaining Phase-1 probes: **P1d** (specialist-quality on the now-confirmed full text) · P1e (blinded-decoy
  headline test) · P1a-v2 (unfamous pairs + controls). HBL Readability fallback is a small C1 build item, not
  a Phase-1 blocker.
