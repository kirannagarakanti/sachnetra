---
date: 2026-06-04
source_url: https://arxiv.org/abs/2303.17564
source_type: academic_paper
publication: arXiv (Computer Science > Machine Learning)
author: Shijie Wu, Ozan Irsoy, Steven Lu, Vadim Dabravolski, Mark Dredze, Sebastian Gehrmann, Prabhanjan Kambadur, David Rosenberg, Gideon Mann
publish_date: 2023-03-30
tags: [quant, sentiment, statistics, ml]
status: raw
---

# BloombergGPT: A Large Language Model for Finance

> **Why Lijo read this**: Investigating how domain-specific language models are built, tokenized, and pre-trained using mixed corpora (financial + general) and their performance on specialized financial NLP tasks (sentiment, NER, conversational QA).

---

## TL;DR (3 bullets)

- **Proprietary & Mixed Corpus**: BloombergGPT is a 50.6B parameter decoder-only language model trained on a 709 billion token mixed dataset containing 51.27% proprietary financial data (FinPile) and 48.73% general-purpose public datasets.
- **Outperforms General Models**: The mixed pre-training approach enables BloombergGPT to achieve state-of-the-art results on key financial tasks (outperforming similarly-sized models like OPT-66B and GPT-NeoX, and sometimes larger ones) without sacrificing general NLP capabilities.
- **Custom Tokenizer & Architecture**: Utilizes a custom 131,072-token Unigram tokenizer (optimized for numerical data and multi-word expressions) and a BLOOM-style decoder architecture with 70 layers, 40 attention heads, and ALiBi positional embeddings.

---

## ELI12 — what is this actually saying?

General-purpose artificial intelligence models (like ChatGPT) are good at writing essays or coding but struggle with the highly specialized language, jargon, and numbers of the financial industry. To solve this, Bloomberg built a custom AI model called "BloombergGPT" with 50.6 billion parameters (its "brain capacity"). Instead of training it on standard internet text alone, they fed it a balanced diet of half general-purpose public texts (like Wikipedia, Github code, and web articles) and half proprietary financial documents (such as filings, press releases, company news, and wire services collected over 40 years). This custom diet makes the AI exceptionally good at reading financial articles, summarizing news, extracting company names, and understanding financial context (like recognizing that "cutting jobs" might be good news for a company's stock price, whereas a general AI would classify it as negative news), while still keeping its normal English reading and writing abilities.

---

## Glossary (new terms only)

> Only terms NOT already in [glossary.md](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/ai_docs/sachnetra%20v2/wiki/glossary.md).

- **FinPile** — Bloomberg's massive, proprietary training dataset containing 363 billion tokens of curated financial news, transcripts, SEC filings, press releases, and web-scraped financial documents.
- **Unigram Tokenizer** — A vocabulary-building algorithm that treats tokenization as a probability model and iteratively removes tokens that contribute least to the likelihood of the corpus, allowing for smarter sub-word splits than greedy merge-based algorithms like BPE.
- **ALiBi (Attention with Linear Biases)** — A technique for positional encoding in transformers that adds a static linear penalty to attention scores based on distance, allowing models to run on sequences at inference time that are longer than those seen during training (without needing positional embeddings).
- **ZeRO (Zero Redundancy Optimizer)** — A memory optimization framework that shards training states (weights, gradients, optimizer values) across available GPUs to eliminate duplicate storage during large-scale parallel training.
- **ConvFinQA** — A public benchmark designed to test conversational question-answering and numerical reasoning over financial texts and tables extracted from S&P 500 reports.
- **FLUE (Financial Language Understanding Evaluation)** — A suite of benchmark datasets specifically assembled to evaluate NLP models in the financial domain.

---

## State of the market RIGHT NOW (per this source)

- **If true, then** domain-specific pre-training from scratch using a balanced (50/50) mix of general and specialized text yields better results on in-domain tasks than attempting to prompt-engineer or post-train general-purpose models of a similar parameter count.
- **Falsifiable by** general-purpose open models of equal size (like Llama 3 or Mistral) matching or beating BloombergGPT on FPB, FiQA, and ConvFinQA benchmarks via simple instruction tuning or parameter-efficient fine-tuning (LoRA), without requiring pre-training from scratch.
- **Time horizon**: Weeks / Cycle. Building and deploying these models takes months of GPU training, but the resulting sentiment and NLP outputs are processed continuously in real time.

---

## So what for SachNetra?

**NSE/BSE Feasibility Check**:
- **F&O Segment**: N/A (this is a foundation language model, not a trading asset).
- **Data Availability**: High availability of raw text data. SachNetra can crawl BSE/NSE corporate announcements, moneycontrol news, press releases, and Indian business filings for sentiment extraction.
- **STT/Tax Drag**: N/A (indirect impact only; sentiment signals drive option/future trades which *are* subject to the 2026 STT drag, but the model has no direct transaction costs).

**Experiments to add/kill**:
- Add: **Exp16 — Does a finance-domain sentiment model fix the G6 positivity bias?** Compare our current FinBERT/LLM chain (`_sentiment-chain.mjs`) against a finance-tuned alternative (FinGPT/FinLlama, or a few-shot Claude/GPT prompt) on stored Indian headlines. Success = the new scorer *discriminates* (separates pre-event sentiment of up-movers vs down-movers) where FinBERT shows ~88% positive bias (Exp 3). This is the one on-focus, gate-clearing takeaway from this paper. *(ID corrected 2026-06-04: original draft said "Exp08", which is already taken — the FII outflow/leverage test in `Exp8.md`.)*
- Kill: N/A — but explicitly **not** "train our own model" (Parked below).

**Features to build**:
- N/A — *already built.* SachNetra already runs a sentiment engine (`scripts/_sentiment-chain.mjs`, FinBERT + LLM fallback) over the news pipeline. The open work is *calibration quality* (G6), not building the engine. (Corrected 2026-06-04: an earlier draft proposed building this from scratch.)

**Data to capture**:
- N/A — *already captured.* Indian news (Moneycontrol/ET/Livemint via RSS) and NSE/BSE corporate announcements (V2-018 Bourse collector) are already ingested. The lever is using that stored data to evaluate sentiment calibration, not new collection.

**Pursue / Park / Kill** (pick exactly one):

> ⚠️ **Verdict gate — before writing "Pursue", it must clear ALL THREE:**
> 1. **Data tier** — testable on data we actually have *today* (EOD `research_prices`). NOT gated on Level-2/Level-3/tick data, an order router, or an execution engine. If it is → **Park** with the gate named.
> 2. **Kill list** — not UI polish, not a `finance`/`full`/`tech` variant feature, not B2B/SaaS/consumer (see `positioning_v2.md`). If it is → **Kill**.
> 3. **One-strategy focus** — moves the current bet (mid-cap event arbitrage / the live experiment) forward, not a net-new tooling/infra project. If it's "build a library/simulator/pipeline" before a 2nd consumer exists → **Park** or scope it down.
>
> Default to **Park**, not Pursue. "Interesting" is not Pursue. If you write Pursue, name the V2-### task or experiment it changes.

- **Park** (the model-training idea) — SachNetra has neither the compute (512 A100s) nor the proprietary data (FinPile) to pre-train a 50B domain model, and per "be your own first customer" we never will. *The actionable residue is NOT parked* — it's **Exp16 above** (use a finance-tuned model via open weights or API to attack the G6 sentiment-calibration bias), which clears the gate and is testable on data we already store.
  - *Correction 2026-06-04*: the original draft gated this on "V2-019 (Sentiment and News Signal collection pipeline)." That is wrong — **V2-019 is the RBI Weekly Statistical Supplement**, and the sentiment collection pipeline already exists and is live (`_sentiment-chain.mjs`, V2-011/V2-012 ✅). Nothing here is gated on collection.

---

## Open questions (for next session)

- **(G6, the live one)** On a labelled set of Indian headlines tied to next-day price moves, does a finance-tuned scorer actually *discriminate* up-movers from down-movers better than our FinBERT chain — or is the ~88% positive bias a property of the *news flow* (mostly genuinely positive PR) rather than the model? (If the latter, no model swap fixes it.)
- For the G6 test specifically, is a few-shot Claude/GPT-4o prompt cheaper and better-calibrated than self-hosting FinGPT/FinLlama — given we already pay for API LLMs in the pipeline?
- *(Off-focus, parked)* Does single-character numeric tokenization reduce math hallucination? — only relevant if we ever train a model, which we won't.

---

## Wiki impact

> Not promoted. (Corrected 2026-06-04: an earlier draft of this section claimed `promoted_to_wiki` and listed pages that were never created — none of `bloomberggpt`/`unigram_tokenizer`/`finpile` exist in `wiki/concepts/`. `unigram_tokenizer` and `finpile` are reference trivia for a model we'll never train, so they're not promotion-worthy regardless.)

- **Created**: N/A
- **Updated**: N/A
- **Status**: stays `raw` (or `distilled`). Promote only `[[bloomberggpt]]` as an entity later if the G6/Exp16 work makes the model-comparison framing worth canonizing.

---

## Source excerpt

### Abstract
The use of NLP in the realm of financial technology is broad and complex, with applications ranging from sentiment analysis and named entity recognition to question answering. Large Language Models (LLMs) have been shown to be effective on a variety of tasks; however, no LLM specialized for the financial domain has been reported in literature. In this work, we present BloombergGPT, a 50 billion parameter language model that is trained on a wide range of financial data. We construct a 363 billion token dataset based on Bloomberg’s extensive data sources, perhaps the largest domain-specific dataset yet, augmented with 345 billion tokens from general purpose datasets. We validate BloombergGPT on standard LLM benchmarks, open financial benchmarks, and a suite of internal benchmarks that most accurately reflect our intended usage. Our mixed dataset training leads to a model that outperforms existing models on financial tasks by significant margins without sacrificing performance on general LLM benchmarks. Additionally, we explain our modeling choices, training process, and evaluation methodology. We release Training Chronicles (Appendix C) detailing our experience in training BloombergGPT.

### Model Hyperparameters (Table 4)
- **Parameters**: 50.6 Billion
- **Decoder Layers**: 70
- **Attention Heads**: 40 (dimension 192)
- **Hidden Dimension ($d_{\text{model}}$)**: 7680
- **Vocabulary Size**: 131,072 tokens
- **Context Length**: 2,048 tokens

### Training Corpus Breakdown (Table 1)
- **Financial Datasets**: 363 Billion tokens (51.27%)
  - Web: 298 Billion tokens (42.01%)
  - News: 38 Billion tokens (5.31%)
  - Filings (SEC/EDGAR filings): 14 Billion tokens (2.04%)
  - Press Releases: 9 Billion tokens (1.21%)
  - Bloomberg Wire: 5 Billion tokens (0.70%)
- **Public Datasets**: 345 Billion tokens (48.73%)
  - The Pile: 184 Billion tokens (25.90%)
  - C4: 138 Billion tokens (19.48%)
  - Wikipedia: 24 Billion tokens (3.35%)
- **Total Training Tokens**: ~709 Billion

### Evaluation (Table 8 - Selected Financial Task Win Rates / Performance)
- **FPB (Sentiment, weighted F1)**: BloombergGPT (0.828) vs BLOOM-176B (0.742) vs GPT-NeoX (0.781)
- **FiQA SA (Sentiment, weighted F1)**: BloombergGPT (0.841) vs BLOOM-176B (0.590) vs GPT-NeoX (0.697)
- **Headline (Weighted F1)**: BloombergGPT (0.835) vs BLOOM-176B (0.718) vs GPT-NeoX (0.761)
- **NER (F1)**: BLOOM-176B (0.643) vs BloombergGPT (0.613) vs GPT-NeoX (0.589)
- **ConvFinQA (Accuracy)**: BloombergGPT (0.490) vs BLOOM-176B (0.334) vs GPT-NeoX (0.298)
