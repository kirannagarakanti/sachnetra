---
date: 2026-06-12
problem: P1b — do the india-variant feeds deliver usable article text in description/content:encoded?
status: RUN 2026-06-12 (`scripts/research/p1b-description-audit.mjs`, read-only, 79 feeds fetched live).
verdict: MIXED, plan-changing — the CORE BUSINESS feeds are thin or Google-News proxies; full text lives in
  startup/tech/regional feeds. URL-FETCHING (P1c) IS LOAD-BEARING for v1, not a tail optimization.
---

# P1b results — feed body-text audit

**Roster: 79 india-variant feeds = 50 direct RSS + 29 Google-News proxies.** Usable = ≥40 words.

## The finding that changes the plan
**The market-moving business sources mostly do NOT deliver body text:**
- **LiveMint, Economic Times, Business Standard, Financial Express are GOOGLE-NEWS PROXIES** (median 23
  words = headline snippets — no body by construction).
- Direct business feeds are thin: Hindu Business Line **0%** usable · Fortune India **0%** · Business Today
  **40%** · The Hindu **10%** · NDTV/India Today/ABP/Quint **0%**.

**Where full text DOES flow (100% usable, 300–1,600-word medians):** startup/tech (YourStory, Inc42,
StartupTalky, Indian Web2, The Tech Panda…) and **regional/city outlets (Telangana Today 303w, Siasat 426w,
Orissa Post 328w)** — partial pre-validation of Sarvam's regional thesis: regional outlets publish full
articles in their feeds while national English business sites strip them.

**Broken at the source (matches the health monitor's silent list exactly — these are dead URLs, not
pipeline bugs):** ANI (HTTP 404), The Wire / Scroll / The Print (feeds return no items), Daily Excelsior
(403). → feed-repair task for James now has root causes.

## Consequences (blueprint deltas)
1. **Tier-1 (feed-text-only) cannot carry v1 for core financial news.** The Mind's reading of
   LiveMint/ET/BS/FE-class sources REQUIRES the fetch path → **P1c (Gemini url_context probe) is now the
   decisive feasibility test** — blocked only on a `GEMINI_API_KEY` in `.env.local`.
2. Specialist input for those sources until fetch works = headline + gnews snippet (what we have today) —
   plan the prompt accordingly.
3. The full-text feeds (startup/tech/regional) can pilot the FULL specialist record immediately — a natural
   P1d test bed.
4. Regional-feed recon gets a head start: three regional outlets already in-roster deliver full text;
   Sarvam's list extends this set.

45/50 direct feeds reachable · 27 deliver usable text on ≥50% of items · raw table in the script output
(re-run to regenerate; deterministic per fetch).
