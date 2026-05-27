# V2-031 Recon Checklist — G1+G2 News Ticker Tagging (NER over India News)

*Handoff for the Gemini browser/research agent. Run probes + collect data in `scratch/`,
save raw outputs and a written findings doc. Claude transcribes the confirmed findings
into the V2-031 task file's Research Appendix — never runs these probes itself
(`feedback_external_agent_recon`).*

---

## Tooling note — USE EVERYTHING

Gemini has **Skills + MCP connectors + browser agent + Google Search**. **Use every
combination that helps.** This recon is not a single-endpoint API scrape (unlike V2-018
or V2-030) — it's a research + dataset-assembly task. Pull from wherever the highest-
quality source lives:

- **Official NSE site** for the equity master CSV — primary source
- **Hugging Face Hub** for NER model benchmarks — search "NER", "Indian", "financial"
- **GitHub** for prior art on Indian-company alias dictionaries, NSE symbol resolvers, or financial-news NER pipelines — search `nse india company alias`, `india financial ner`, `nse symbol resolver`
- **Google Search** for industry-name disambiguation lists and aliased brand→corporate mappings (e.g. "Jockey India parent company" → Page Industries)
- **Academic papers / arXiv** if you find an Indian-financial-NER paper with a published model — record the citation

When in doubt: **fetch live, save the file to `scratch/`, cite the URL.** Don't describe
sources from memory.

---

## READ THIS FIRST — what V2-031 is, and what we're trying to unlock

V2-031 bundles two gaps from `wiki/experiments/_data_gaps_backlog.md`:
- **G1** — `india_news_signals.nse_tickers` tagging coverage is currently **~1.7%** (301
  of 17,461 rows have a non-empty array), and every tagged row is a Nifty-50 large-cap.
  Goal: widen to **≥30%** coverage, including mid/small-caps.
- **G2** — ticker format mismatch across tables: news stores `SBIN.NS` (Yahoo-suffixed),
  announcements store bare `SBIN`, research_prices uses `.NS`. **Standardise to bare NSE
  symbol (`SBIN`, `MARUTI`) at write time**, strip `.NS`/`.BO`. G2 piggybacks on G1 since
  we're rewriting the tagger anyway.

**Why this matters right now:** `wiki/syntheses/latency_vs_value_tradeoff.md` (the
strategic finding from Exp 10) recommends pivoting the experimental universe from
large-caps to mid/small-caps. That pivot is **blocked on G1** — without ticker tagging on
mid/small-caps, we cannot measure their filing→news latency or filing→price reaction.
G1 is therefore the single highest-value engineering investment on the V2 roadmap.

**What's already there (DO NOT redo — read first):**

| File | What it does | Why it matters |
|---|---|---|
| `scripts/_india-market-keywords.mjs` | Current tagger. `extractCompanies(title)` iterates **50 entries** in `nifty50_registry`, substring-matches aliases against **title only** | This is what we're replacing. Note: title-only is half the coverage problem; body is never scanned. |
| `shared/market-taxonomy.json` | Holds the `nifty50_registry` (50 names) + `market_keywords`, `sectors`, `event_types`, `themes` | The new equity master goes here (or in a new file). 50 names → ~2,000. |
| `scripts/seed-india-signals.mjs` | Ingest pipeline that calls `extractCompanies` and writes `nse_tickers` | Confirm whether it has access to article body or only headline. |
| `scripts/migrate-india-signals.mjs` | DDL for `india_news_signals`. **Stored columns: `headline TEXT`, `nse_tickers TEXT[]` — there is NO body column today** | Critical: if we want body-level NER, we may need to (a) capture body on ingest going forward, OR (b) restrict NER to headline + summary. **Resolve this in Q4.** |

**The decisive design questions (resolve first):**
> 1. **Body availability** — does the digest payload `seed-india-signals.mjs` reads from
>    Redis carry article body text? If yes, body can flow into the tagger without a schema
>    change. If not, the task forks: ship headline-only NER first, capture body in a
>    follow-up. **This decides task scope.**
> 2. **NER model choice** — spaCy small vs HuggingFace transformer vs an Indian-financial
>    domain model. We already pay for the HF inference API (FinBERT for sentiment), so a
>    HF NER endpoint is free incremental cost. Confirm with benchmarks, not vibes.
> 3. **Equity master source + refresh** — is NSE's `EQUITY_L.csv` the right file? How
>    often does it change? Is there a programmatic API or only a download URL?

---

## Part A — NSE equity master (the dictionary)

### A1. Source the master file
- [ ] Find the **official, current NSE equity master CSV** (all listed equity symbols + full
      company names + ISIN + listing date). Likely candidates to probe:
      - `https://www.nseindia.com/market-data/securities-available-for-trading`
      - `https://archives.nseindia.com/content/equities/EQUITY_L.csv`
      - The NSE EOD bhavcopy CSV (different file, ~equity universe by-day)
      Record the working URL, HTTP status, file size, and row count.
- [ ] Save the raw file → `scratch/nse_equity_master.csv`.
- [ ] Record the **exact column headers** (paste header row) and a 5-row sample.
- [ ] Confirm whether this needs the NSE cookie-warm-up handshake (same as V2-018/024/030)
      or if `archives.nseindia.com` serves the CSV without it.
- [ ] **Refresh cadence** — does the file change daily, weekly, or only on listing/delisting
      events? How would we keep it current in prod?

### A2. Build a candidate alias structure
For each row in the master, the tagger needs **search-friendly aliases**. From the company
name `"Page Industries Limited"` we should be able to match articles that say `"Page
Industries"`, `"Page"`, or `"Jockey"` (the brand). Sketch the canonical alias rules:
- [ ] **Suffix stripping** — drop `"Limited"`, `"Ltd"`, `"Ltd."`, `"India"`, `"(India)"`,
      `"Industries"`, `"Corporation"`, `"Corp"`, `"Company"`, `"Co."`, etc. Record the
      stripped suffix list. Find the canonical set used by other NSE-aware libraries
      (search GitHub).
- [ ] **Brand-vs-corporate divergence** — pull a representative list of names where the
      brand differs from the corporate name. Examples to research: Jockey → Page
      Industries, Liva → Aditya Birla Fashion, Maggi → Nestle, Domino's → Jubilant
      FoodWorks, Bisleri (private, not relevant — confirm), Britannia (same), Surf Excel →
      HUL. Aim for **at least 30 brand-aliases on the NSE-500 universe**.
- [ ] **Acronyms / short forms** — `M&M`, `L&T`, `HUL`, `RIL`, `TCS`, `ITC`, `LIC`,
      `BHEL`, `BPCL`, `IOC`, etc. Confirm each is unambiguous in financial-news context.
- [ ] Save the sketch → `scratch/alias_proposal.json` (one object per ticker with
      `ticker`, `name`, `aliases[]`, `notes`).

### A3. Ambiguity & disambiguation
- [ ] Identify the **top 20 ambiguity hazards** — names that collide with common English
      words, other companies, or non-financial contexts. Examples to look at:
      - `Lupin` (the company **and** the flower / a famous fictional thief)
      - `Apollo` (Hospitals **vs** Tyres **vs** the moon landing)
      - `Castrol` (only the company — but is it always financial in context?)
      - `Page` (Industries **vs** "page" the noun)
      - `Bank of Baroda` (the company **vs** city of Baroda)
      - `Asian Paints` (single company, but "asian paints" lowercase noun phrase?)
      - `Adani`, `Tata`, `Reliance`, `Mahindra` (group names → many subsidiaries)
- [ ] For each: propose a **disambiguation rule** — required context word (must include
      "stock"/"shares"/"NSE"/"BSE"/sector-keyword), excluded context, or "require-ticker-in-
      text". Don't over-engineer; a small denylist is fine.
- [ ] Search GitHub for prior alias-disambiguation lists used in Indian-fintech projects
      (search: `nse company aliases`, `india ticker resolver`, `indian financial nlp`).
      Save URLs to anything useful → cite in your findings doc.

---

## Part B — NER model evaluation

We need to extract `ORG` (organization) entities from headline + summary (and body, if
available — see Q4) and resolve them to NSE tickers via the equity master.

### B1. Candidate models (compare all three)
- [ ] **spaCy `en_core_web_sm`** — lightweight, runs on CPU. Free.
- [ ] **spaCy `en_core_web_trf`** — transformer-based, more accurate. Larger model.
- [ ] **Hugging Face `dslim/bert-base-NER`** — the standard HF NER baseline. We already
      use HF (for FinBERT sentiment), so the inference endpoint is free incremental cost.
- [ ] **Search HF Hub** for Indian-financial-domain NER models. Try queries:
      `india ner financial`, `indian companies ner`, `hindi-english financial ner`.
      Record any model with >100 downloads + a real eval — `model_id`, paper/blog URL,
      reported F1 on ORG.

### B2. Evaluation against real headlines
- [ ] Pull a sample of **50 untagged headlines** from `india_news_signals` (where
      `array_length(nse_tickers,1) IS NULL`). Lijo can SQL-dump these and put them in
      `scratch/headlines_untagged_sample.csv` — coordinate with him if needed; otherwise
      construct a synthetic sample from public Mint/Moneycontrol/ET archives.
- [ ] Run each candidate model on the 50 headlines. For each model, record per headline:
      `headline`, `extracted_orgs[]`, `expected_orgs[]` (manual ground truth), `tp/fp/fn`.
      Save → `scratch/ner_eval.csv`.
- [ ] Compute **precision + recall + F1** per model. Recommend one. Justify with the
      numbers — not "this one feels better".

### B3. Cost / latency profile of the recommended model
- [ ] **Inference cost** — per-1000-headlines cost on HF endpoint (or compute cost on
      Railway worker for spaCy). The pipeline runs every 10 minutes against the digest
      payload (~5–50 new headlines per run) + a one-time backfill of 17,461 rows.
- [ ] **Latency** — how long per headline? Per batch? Does it block the digest response?
      (Per `CLAUDE.md` Key Constraints, the intelligence pipeline is fire-and-forget — it
      must never delay digest response to users. Confirm the chosen approach respects that.)

---

## Part C — Body-text availability (the gating question)

**This is the single most important question in the recon.** It determines whether V2-031
ships as one task or splits into two.

- [ ] Read `scripts/seed-india-signals.mjs` and identify what fields come through from the
      digest payload (Redis key `news:digest:v1:india:en`). Specifically: is there an
      article body, summary, description, or only a headline?
- [ ] If body is available in Redis but not stored: this is an easy upgrade — extend the
      tagger to receive `headline + summary + body`, no DDL change needed. Confirm.
- [ ] If body is NOT available in Redis (only headline): two options to evaluate:
      - **Option C1 — headline-only NER**: ships now, lower coverage ceiling (~30–40%).
      - **Option C2 — fetch article body during ingest**: adds an HTTP call per article
        (rate-limit-able), DDL change to add `article_body TEXT` to `india_news_signals`,
        scrape via the existing `rss-proxy.js` or a new fetcher. Higher complexity, higher
        ceiling.
      Recommend C1 first (forward-tag), C2 as a V2-031b follow-up — but confirm the
      feasibility of C2 by sample-fetching one article body from each of the top 5 source
      domains (Mint, Moneycontrol, ET, Business Standard, Reuters India). Note any
      paywalls or anti-bot blocks.

---

## Part D — Backfill strategy

17,461 rows currently in `india_news_signals` need re-tagging once the new tagger ships.

- [ ] **Idempotency** — design so the backfill can be re-run safely. Recommend a
      `processing_state TEXT DEFAULT NULL` column or a separate `nse_tickers_v2 TEXT[]`
      column we cut over to once verified. Pick one — justify.
- [ ] **Batching** — chunk size and concurrency that respect the HF rate limit (if using
      transformer NER) and Railway PostgreSQL connection limits. Record the proposed
      values.
- [ ] **Audit trail** — propose a `scratch/g1_backfill_audit.csv` schema with columns:
      `id, old_tickers, new_tickers, model_version, processed_at`. So if the tagger has
      a bug, we can revert and rerun.
- [ ] **Wall-clock estimate** — at the recommended model's throughput, how long does the
      backfill take? Hours? A day? Days? This sizes the verification window.

---

## Part E — Forward rollout & verification

The agreed plan is **forward-tag first, backfill after verification** (locked in the
2026-05-26 conversation, see `memory/project_g1_execution_plan.md`).

- [ ] Sketch the **rollout sequence**:
  1. Ship new tagger to ingest (every 10-min cron run uses it for new rows).
  2. Watch for 24–48h.
  3. Measure coverage on new rows only: `SELECT 100.0 * COUNT(*) FILTER (WHERE
     array_length(nse_tickers,1) > 0) / COUNT(*) FROM india_news_signals WHERE
     created_at > NOW() - INTERVAL '24 hours'`.
  4. If ≥30% — run the backfill. If <30% — iterate on the alias list / NER thresholds.
- [ ] **Coverage gate** — confirm ≥30% is the right threshold given the size of the
      mid/small-cap universe. Could it be higher? Lower?
- [ ] **Per-source segmentation SQL** — write the SQL that shows coverage broken down by
      `source_name` (Mint, Moneycontrol, ET, Business Standard, Reuters, etc.) so we can
      see *where* the tagger still fails. Paste in your findings doc.

---

## Part F — G2 (ticker format standardisation, riding along)

- [ ] Confirm the current format in each table by running SELECT … LIMIT 5 against:
      - `india_news_signals.nse_tickers` (expect `['SBIN.NS', 'MARUTI.NS']`)
      - `india_bourse_announcements.symbol` (expect `'SBIN'`)
      - `research_prices.symbol` (expect `'SBIN.NS'`)
- [ ] Recommend the canonical form. Default proposal: **bare NSE symbol** (no suffix), so
      news + announcements join cleanly. `research_prices` keeps `.NS` because Yahoo
      requires it — document the divergence loudly.
- [ ] Locate every write-path that touches these columns so James can fix them in one
      sweep. Use grep / GitHub code search:
      - `nse_tickers` writes — likely only `seed-india-signals.mjs` and any backfill
      - `symbol` writes — `seed-india-announcements.mjs`, `seed-research.mjs`, etc.
      Save the file list to `scratch/g2_write_paths.md`.
- [ ] Decide: **strip on write** (writer responsibility), or **store both and add a view**
      (no migration risk). Recommend one.

---

## Issues we might hit — flag during recon

1. **NSE master file behind a cookie wall** — `archives.nseindia.com` is sometimes
   directly fetchable, sometimes needs the same warm-up as the API endpoints. Confirm.
2. **Body-text scrape blocked** — if Mint/Moneycontrol/ET return paywall content or
   anti-bot pages on direct fetch, the body-fetch path (Option C2) gets harder. Record
   each domain's behavior.
3. **NER on Indian names** — generic English NER models often miss Indian-name patterns
   (CamelCase with `&`, `'s`, or Hindi-origin words). Reflect that in the F1 numbers —
   don't trust a generic benchmark.
4. **Ambiguity from group names** — "Reliance announced…" could be RIL, Reliance Power,
   Reliance Capital, Reliance Industries Infrastructure, Reliance Home Finance, etc. The
   tagger must either tag the group-parent (RIL) or extract enough context to
   disambiguate. Recommend an approach.
5. **Stale equity master** — if NSE delists a company mid-month, the tagger should
   gracefully handle it (don't crash, log + skip). Note the refresh strategy.
6. **HF endpoint quota** — confirm we have headroom on the existing HF API key (used by
   FinBERT) to add NER calls. If not, propose a cheaper path (self-hosted spaCy on
   Railway, batched once per ingest run).

---

## Deliverables back to Claude (to fill the V2-031 task's Research Appendix)

Required files in `scratch/`:
- `scratch/V2-031_g1_recon.md` — written findings doc, one section per Part above
- `scratch/nse_equity_master.csv` — raw equity master from NSE
- `scratch/alias_proposal.json` — sketched alias structure for ~500–2000 names
- `scratch/headlines_untagged_sample.csv` — 50-headline NER eval sample
- `scratch/ner_eval.csv` — per-model precision/recall/F1
- `scratch/g2_write_paths.md` — files that write ticker fields, for the G2 sweep

In `V2-031_g1_recon.md`, state explicitly:
- Recommended NER model + justification (numbers, not vibes)
- Whether article body is in the digest payload (gating answer)
- Recommended canonical ticker format
- Backfill wall-clock estimate
- Coverage gate value (≥30% or other) with justification
- Any disambiguation rules you'd hard-code from day one

Cite every source URL you used. Where you can't find a definitive answer, **say so
explicitly** — don't paper over it.

---

## Honesty rules (same as exp10_gemini_news_backfill_brief)

- **Never fabricate a URL** — if you can't find the equity master at the URL you
  expected, say `NO_FILE_FOUND` and propose alternatives.
- **Never invent NER benchmark numbers** — cite the source paper / HF model card. If the
  card doesn't report ORG F1 specifically, say so.
- **Be loud about uncertainty** — `[unverified]`, `[tentative]`, `[need-Lijo-decision]`
  prefixes are encouraged.
- **No code commits** — this is research, not implementation. James implements from the
  V2-031 task file Claude writes after this recon lands.

*Once these land, Claude + Lijo write `ai_docs/tasks/V2-031_g1_g2_news_ticker_tagging.md`
following `dev_templates/adapt_sprint_task.md`. James implements: extends the equity
master, swaps the tagger for NER, runs the backfill, ships G2's bare-symbol
standardisation in the same PR. Lijo runs migration/seed/backfill in prod
(`feedback_v2_prod_execution`).*
