---
date: 2026-06-12
problem: >
  Agenda items 3 + 4 from the what-it-does spec (§9): (A) the BODY-TEXT decision — how does the Mind get
  full article text when today's pipeline is headline-only? — answered by read-only recon of the digest
  parser; and (B) the COST ENVELOPE — what does running frontier models every ~10 min actually cost per
  month, with explicit assumptions, levers, and a recommended hard cap. No code changes.
status: design decisions — recon-grounded (body text) + priced from current published model pricing
  (2026-06; Opus $5/$25, Sonnet $3/$15, Haiku $1/$5 per MTok; Batch API −50%; cache reads ~0.1×).
lane: Lijo (approve cap) + James (build) + Claude (drafted)
tags: [spec, design, news-brain, body-text, rss, cost-envelope, pricing, funnel, batch-api, prompt-caching]
sources_consulted: [
  "Repo recon (read-only, this session): server/worldmonitor/news/v1/list-feed-digest.ts — KNOWN_TAGS =
   ['title','link','pubDate','published','updated'] (line ~200): the digest parser DISCARDS RSS
   <description>/<content:encoded>; scripts/seed-india-signals.mjs works from headline + Groq ai_summary",
  "Model pricing: current Anthropic published pricing (claude-api skill, cached 2026): Opus 4.8 $5/$25,
   Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5 per MTok; Message Batches −50% all tokens (≤24h turnaround);
   prompt-cache reads ~0.1× input, writes 1.25×",
  "Internal: 2026-06-12_news-brain-what-it-does-spec.md (the funnel, §6 outputs); CLAUDE.md (3-file RSS
   allowlist; digest is fire-and-forget)"
]
---

# Body-text decision + cost envelope (agenda items 3 & 4 — answered)

## A. The body-text decision — better news than expected

**The recon finding (read-only, confirmed in code):** the SachNetra digest parser keeps **only**
`title`, `link`, `pubDate` — `KNOWN_TAGS` in `list-feed-digest.ts`. The RSS feeds' `<description>` blocks
(typically 1–3 paragraphs of real article text, sometimes full text via `content:encoded`) **arrive every
10 minutes and are thrown away at parse time.** "Body text doesn't exist in the pipeline" (the G1 finding)
is true of what's *stored* — not of what's *delivered*.

**Decision — three tiers, in build order:**

| Tier | What | Cost/effort | When |
|---|---|---|---|
| **1. The Mind reads the RSS feeds itself** | The separate app subscribes to the *same feed list* (`shared/rss-allowed-domains.json` universe) with its **own parser that keeps `description` + `content:encoded`**. Gets 1–3 paragraphs/article for most sources, full text for some. **Zero changes to SachNetra** — perfectly consistent with "complete separate application," and the news pipeline stays fire-and-forget. | Small (a parser) | **Start here** |
| **2. Selective full-page fetcher** | For the small flagged subset (high-impact, description insufficient), fetch the article URL and extract readable text. Some sites block; respect robots; cache. | Medium | Later, only for the routed top ~5% |
| **3. Headline-only** | Status quo. | — | Rejected — ripple chains live in paragraph 6, never the headline |

**One-line resolution of the spec's open question:** *v1 runs on feed-delivered text (titles + descriptions,
via the Mind's own RSS reader); the full-page fetcher is a v-next upgrade for flagged articles only.*

---

## B. The cost envelope — what the Mind costs per month

### The funnel priced (current published per-MTok pricing: Opus $5/$25 · Sonnet $3/$15 · Haiku $1/$5; Batch −50%; cache reads ~0.1×)

**Stated assumptions (calibrate against real counts — see B.3):** ~**2,500 articles/day** across the feed
universe after dedupe; **~20%** (≈500/day) pass the relevance funnel to a specialist; **~2%** (≈50/day) are
high-impact and get the frontier multi-agent treatment.

| Stage | Model | Volume | Tokens/article (in / out) | $/day | $/month |
|---|---|---|---|---|---|
| **Router** (classify into the 12 categories) | Haiku (after a free keyword pre-filter) | 2,500/day | 300 / 30 | ~$1.1 | **~$35** |
| **Specialist agents** (full text + memory + graph context → structured record §3-of-spec) | Sonnet | 500/day | 4,000 / 500 | ~$10 raw → ~$6–7 with caching | **~$200–300** |
| **High-impact deep pass** (multi-agent debate, ripple walk) | Opus | 50/day | 10,000 / 2,000 | ~$5 | **~$150** |
| **Nightly deep jobs** (novelty recompute, graph maintenance, reflection) | Sonnet/Haiku via **Batch API (−50%)** | nightly | bulk | — | **~$50–100** |
| **TOTAL** | | | | | **≈ $450–600 raw · ≈ $300–450 disciplined** |

**One-time graph backfill** (relation-extraction over the news archive): ~200k headlines × ~300 tokens ≈ 60M
tokens → **~$60–180 one-time** via Batch API (Haiku→Sonnet tier). Cheap; do it as a batch job.

### B.1 The three levers that keep it at the low end (design these in, don't bolt on)
1. **The funnel is the budget.** Every percentage point that the router filters out is money. The free
   keyword pre-filter + G1 tag layer in front of Haiku, Haiku in front of Sonnet, Sonnet in front of Opus.
   The frontier model only ever sees the ~2% that deserve it.
2. **Prompt caching.** The specialist's system prompt + graph-context preamble is shared across every article
   in a 10-min batch → structure prompts stable-prefix-first; cache reads cost ~0.1×. Worth ~30–40% off the
   specialist stage.
3. **Two clocks, two prices.** The 10-min loop uses the regular API (latency matters). Everything that can
   wait (novelty recompute, graph extraction, backfills, reflection) goes to the **Batch API at −50%**.
   Batches return within ~1h typically (≤24h max) — fine for nightly jobs, wrong for the live loop.

### B.2 Recommended cap (for Lijo to approve)
- **Hard monthly cap: $500.** Alarm at $400 (80%). Per-day circuit breaker at ~$25 (a runaway loop should
  trip in hours, not at month-end).
- Anchor for scale: a Bloomberg terminal is ~$2,500/month; one junior analyst is far more. The Mind at
  $300–500/month reading *everything, every 10 minutes, with reasons attached* is the cheapest analyst
  India has ever had — but only if the funnel discipline holds.

### B.3 Calibration step (cheap, before committing the cap)
The 2,500/day volume figure is an **assumption**. One read-only SQL count on `india_news_signals`
(rows/day over the last 30 days) pins the real number; the table above scales linearly with it. Run that
count, rescale, then lock the cap.

### B.4 The free-tier / credits stack (web-verified 2026-06-12) — prototype months ≈ ₹0

Lijo flagged three resources. All three checked against current published limits:

| Resource | Verified reality (2026-06) | Where it fits in the funnel |
|---|---|---|
| **Groq free tier** (already integrated — `GROQ_API_KEY` lives in the sentiment chain) | `llama-3.1-8b-instant`: **14,400 requests/day, 500K tokens/day** free; `llama-3.3-70b-versatile`: 1K RPD / 100K TPD. Cached tokens don't count against limits. | **The ROUTER, free.** 14.4K RPD ≫ our ~2,500 articles/day. An 8B model is fine for 12-category classification. Router cost → **$0** |
| **Google Gemini API free tier + ₹30,000 (~$350) credits** | Free tier (since Apr 2026): **Flash/Flash-Lite only** — Gemini 3 Flash free at **10 RPM / 250K TPM / 1,500 requests/day**; Pro models are paid-only now. Paid: 3.5 Flash $1.50/$9 per MTok; 3.1 Pro $2/$12. | **The SPECIALIST tier, ~free.** 1,500 RPD covers our ~500 specialist articles/day inside the free tier (10 RPM = 100 reqs per 10-min window — ample). Overflow + nightly jobs burn the ₹30K credits on 3.5 Flash. Specialist cost → **$0 until credits exhaust** |
| **AWS Bedrock "Claude free tier"** | **No permanent Bedrock free tier** — that part is a misconception. BUT: new AWS accounts get **$200 credits (6-month expiry)** + ~$20 Bedrock getting-started credits, and **Activate credits can pay for third-party (Anthropic) models on Bedrock** (one-time use-case submission required for Claude access). | **The HIGH-IMPACT DEEP PASS.** $200 credits ≈ 6+ weeks of the ~$5/day Opus-class stage, or months on Sonnet-class. Deep pass → **covered for the pilot window** |

**Revised phase economics:**
- **Prototype / pilot phase (first ~2–3 months): ≈ ₹0–4,000/month total.** Router on Groq free, specialists
  on Gemini Flash free + credits, deep pass on Bedrock credits. The $500 cap is irrelevant until credits
  exhaust — but the **daily circuit-breaker still applies from day one** (a runaway loop burns credits just
  as fast as cash).
- **Steady state (post-credits):** the B-table economics resume → ~$300–500/month, cap $500.

**Two honesty rules the multi-provider stack makes mandatory:**
1. **Tag every record with the model that produced it** (`model_id` + version in the §3-of-spec schema).
   Different models produce differently-calibrated stances/novelty scores; if the model changes mid-stream
   and it isn't logged, the signal time-series silently changes character and the backtest is contaminated.
2. **One model per column per experiment.** When the acceptance test / any experiment runs, the column under
   test must come from a single model version — switch models *between* pre-registered runs, never inside one.

**Noise filter on the pasted Gemini conversation (for the record):** the "Google market prediction model"
items it names are mostly **consumer features** (prediction-market odds in Google Finance via
Polymarket/Kalshi; "Deep Search" reports) — not APIs to build on; **Vertex AI Tabular/TiDE/TFT forecasting**
is a real enterprise tool but solves a different problem (numeric time-series forecasting), parkable as a
possible later Layer-2 tool. Also: Grok is **xAI's** model, not "SpaceXAI" — that text carries errors,
which is exactly why we verify before building on pasted summaries.

### B.5 Lijo's follow-ups, verified (2026-06-12): Gemini-as-fetcher + the startup-credits ladder

**(a) "Use Gemini to fetch articles" — verified, and it deletes a build item.** The Gemini API's **URL
context tool is GA**: pass up to **20 URLs per request**, the model fetches and reads them (HTML, PDF,
JSON; live-fetch when not indexed) and you're billed only the standard input tokens — **works on the free
tier within normal rate limits.** This means the **Tier-2 "selective full-page fetcher" from §A needs no
scraping infrastructure at all**: when a flagged article's RSS description is too thin, the specialist call
simply includes the article URL with `url_context` and Gemini fetches + reads it in the same call. Revised
§A tiering: *Tier 1 = own RSS reader (descriptions) → Tier 2 = Gemini url_context on flagged articles
(no scraper to build) → a self-built fetcher only if url_context proves blocked on key Indian outlets
(test this on the top ~10 sources early).*

**(b) "Ask for startup API funds" — verified, the ladder is real and SachNetra plausibly qualifies:**

| Program | Amount | Eligibility (verified) | Fit |
|---|---|---|---|
| **Google for Startups — Start tier** | **$2,000** Cloud credits | Explicitly open to **bootstrapped** ("None — bootstrapped/F&F" is a listed funding category); **incorporated <5 years**; working website (sachnetra.com ✅); ~3–10 day review | Apply — the only open question is incorporation status/date (Lijo to confirm) |
| **AWS Activate — Founders** | **$1,000** self-serve credits | **Self-funded** startups; pre-Series B; <10 years; usable on **Bedrock (Claude)** | Apply — same incorporation question |
| AWS Activate Gen-AI offering | up to $300K | Qualifying AI startups (higher bar, typically investor/provider-affiliated) | Park — revisit if the program ever raises |
| Anthropic startup program | varies | Typically requires accelerator/VC affiliation | Park |

**Combined accessible runway:** ₹30K Google credits (in hand) + $2K Start tier + $1K AWS Founders ≈
**$3,300+ ≈ 6–12 months of the Mind's steady-state bill, free.** Caveat to respect: credit programs
prohibit stacking tricks/multiple accounts — apply once, honestly, as the entity SachNetra actually is.

**STATUS (Lijo, 2026-06-12): SachNetra is NOT incorporated** (venture itself only ~30 days old as an
entity concept). So the Start-tier/Founders applications are **parked, not lost** — and critically,
**deferral costs nothing**: the <5-year eligibility window starts at the *incorporation date*, so whenever
incorporation happens (for a real business reason — e.g. the SEBI-registration fork in `positioning_v2 §5`,
or revenue), SachNetra enters as a day-zero startup with full fresh eligibility. **Do NOT incorporate just
for ~$3K of credits** — Indian Pvt-Ltd incorporation + annual compliance costs would eat most of it, and
the "be your own first customer" positioning needs no entity to trade own capital. The pilot runs on the
₹30K credits + Groq/Gemini free tiers regardless; the credits ladder is a coupon waiting in a drawer.

---

## C. Where this leaves the agenda
1. ~~Factor-node starter set~~ ✅ (v0 drafted, backlog live)
2. ~~Exposure bootstrap~~ ✅ (4-pass design in the factor doc)
3. ~~Body-text decision~~ ✅ — **Tier 1: the Mind reads RSS itself, keeping descriptions; fetcher later**
4. ~~Cost envelope~~ ✅ — **$300–500/month disciplined; cap $500, alarm $400, daily breaker $25; calibrate volume first**
5. **The Mind's acceptance test** ← the last design item: *on a held-out month, did status changes precede
   price moves more often than chance?* — to be specified (universe, horizon, null model, pass bar)
6. Then: **the build blueprint** (components, stack, premise-retiring order, test gates)
