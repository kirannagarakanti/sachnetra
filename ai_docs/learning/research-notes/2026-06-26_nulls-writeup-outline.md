---
tags: [draft, nulls, publication, credibility, keystone, structural-intelligence]
date: 2026-06-26
status: DRAFT SKELETON — react to this, don't treat it as final. The keystone artifact from the pivot
  (see 2026-06-26_HANDOFF-pivot-and-forward-plan.md). Goal: a beginner-readable, honest public write-up of
  "what two people tried in Indian markets and what the data actually said." Credibility → mentor → network.
purpose: >
  This is the OUTLINE for the public nulls post. It fixes the spine, the honest framing, and where each of
  the ~18 nulls lives. Exact numbers/charts get pulled from the experiment notes when we write the full draft
  (placeholders marked [PULL: ...] so we never fabricate a figure).
---

# DRAFT — "What We Tried in Indian Markets, and What the Data Actually Said"
### (working title — alternatives at the bottom)

## The one-sentence promise of the piece
*Two people with a laptop tried to trade Indian news for a year, ran ~18 honest experiments, found nothing
tradeable — and the single most useful thing we learned is **why**, which turns out to be a real fact about
how the Indian market works that almost nobody publishes.*

Why this is publishable (and most "I lost money" posts aren't): we're not confessing, we're **reporting a
finding**. The finding is counterintuitive, it's backed by our own data, and negative results in Indian quant
are genuinely rare because nobody has both the honesty *and* the dataset to produce them.

---

## Audience & register
- **Reader = a smart beginner**: someone curious about markets/quant who is NOT a PhD. ELI12 where it counts.
- **Tone = honest, calm, a little funny, zero ego.** We are not selling anything in this piece. The credibility
  comes from the honesty, not from a pitch. (Resist the urge to end with "and that's why you should buy our
  data" — that kills the trust that makes it work.)
- **Length target = a long Substack post / short paper** (~2,000–3,000 words). Skimmable: bolded findings,
  one clear chart per section.

---

## The spine (narrative arc)

### 0. Hook (≈150 words)
Open on the punchline, not the build-up. Something like: *"We spent a year building a machine to read every
piece of Indian financial news the moment it broke. It worked. We could read the news faster than almost any
human. And it made us exactly zero rupees — for a reason that took us 18 experiments and a very humbling night
to understand."* Promise the reader the counterintuitive finding up front.

### 1. What we set out to do (the romantic thesis) (≈250 words)
- The intuition anyone has: *news moves stocks; if you read the news first, you trade first.*
- Our specific bet: small/ignored companies are watched by fewer people → the news reaches the price **slowly**
  there → a patient outsider with good tooling can step into that lag. (This is the **US "neglected small-cap"**
  model — name it, because the whole story is about why it's wrong in India.)
- Honest framing of who we were: two people, a laptop, no budget, end-of-day retail execution. Say it plainly.

### 2. What we actually built (the part we're proud of, kept short) (≈250 words)
- A continuously-updated database of Indian **news + regulatory filings + market/alt-data**, multi-year, clean.
- ELI12 of *why this is hard*: the data is public but scattered across ugly exchange portals, filings as PDFs,
  no clean history — assembling and structuring it continuously is the actual work. **"Anybody can get it; not
  everybody will build it."** (This line is the soul of the whole pivot — use it.)
- One paragraph, not ten. The build is the setup, not the point. The point is what it *told* us.

### 3. The experiments — organized, not a list of 18 (≈700 words, the core)
Group the nulls into **3–4 honest buckets** so the reader sees a *search*, not flailing. (Be candid that several
were variants of one idea — the cold read's sharpest critique was "18 experiments = one experiment run 18 times."
Own that openly; it's more credible than hiding it.)

- **Bucket A — "Trade the reaction" (speed/drift).** The core thesis in several forms.
  - [PULL: Exp1 — first news→return drift test, result]
  - [PULL: Exp7 / Exp9 — variants, results]
  - Finding: a *real but tiny* drift (~0.4%) drowned by a ~2.5% round-trip cost. **The wall is arithmetic, not skill.**
- **Bucket B — "Trade the earnings surprise" (PEAD / post-earnings drift).**
  - [PULL: Exp16 / Exp17 / Exp18 / Exp19 — PEAD/EAR mid-cap results; note Exp16 underpowered, pre-2024 event gap]
  - Finding: no usable post-earnings drift after costs; the honest caveat that the event history was short.
- **Bucket C — "Get there before the news" (the filing→press head-start, Exp21).**
  - [PULL: Exp21 — matcher v2, head-start by market-cap: large 356 > mid 284 > small 192 < micro 259 min]
  - **This is the money chart.** We expected the head-start to GROW for smaller companies. It SHRANK. The market
    was *fastest* exactly where we bet it was slowest.
- **(Optional) Bucket D — the one signal that was additive but not enough.**
  - [PULL: Exp4 — our own feed leads the newswire; the single additive signal, still not a tradeable edge alone]
  - Useful for honesty: we *did* find a real lead-time, and it *still* wasn't a business. That's the squeeze.

### 4. The central finding (the reason it's a post, not a diary) (≈350 words)
State it cleanly and make it the takeaway a stranger could quote:
> **In India, the small, "ignored" companies are not ignored. They are the most hyper-scrutinized corner of the
> market** — promoter/operator networks, retail "multibagger" obsession, and specialized local algos all crowd
> exactly there. So the news reaches the price *fastest*, not slowest, in the place the US playbook says it
> should be slowest. We imported a foreign model of "neglect" and the Indian market politely corrected us.

Then the deeper, transferable lesson (this is what earns the mentor):
- **The latency-vs-value squeeze**: the events with a long head-start are the ones the market doesn't care about;
  the events that move price travel fast. Lead-time and impact are *inversely* related. [PULL: Exp10 phrasing]
- So "read the news faster" is structurally a dead edge for a slow, public-data, retail-cost participant — not
  because we were bad, but because that's the one race where our disadvantages are most expensive.

### 5. What we got wrong about ourselves (the honesty that builds trust) (≈250 words)
Borrow the cold-read's tells, told on ourselves (this self-awareness is the credibility engine):
- We ran ~18 experiments and called it rigor; some of it was **hope wearing a lab coat.** A real update would
  have come at experiment 5.
- We were *shocked* by the small-cap result instead of updating our **model of the market**. Updating the
  magnitude isn't the same as updating the model.
- We started to call the database "the real asset" the moment the trading failed — salvage instinct. (We still
  think it's true — but we should say openly *when* and *why* we started saying it.)

### 6. So what is the data actually for? (the forward turn, NO sales pitch) (≈250 words)
- Be precise about what the asset can and can't see: **strong** for corporate events, regulatory/policy shifts,
  governance & promoter behaviour, sector narratives, the *narrative* layer of the real economy; **weak** for
  clean physical-commodity / real-estate price series (needs a free domain dataset to pair with).
- The reframe (Dalio in one sentence, no name-drop needed): when you can't trade the noise, the same data
  becomes a way to **study the slow forces and position patiently** — months and years, not minutes.
- End on the honest open question, not a conclusion: *we don't fully know who needs long-horizon Indian
  structural intelligence yet — if you do, we'd like to talk.* (That single soft line is the entire networking
  ask. One sentence. No CRM energy.)

### 7. Close (≈100 words)
Short. The expensive lesson, stated as a gift to the reader: *the most valuable experiment we ran was the one
that killed our favourite idea.* Invite replies.

---

## What we must NOT do in this piece (guardrails from the pivot)
- **No pitch.** This is credibility, not sales. The B2B-pivot the cold read prescribed inherits our own unsolved
  structuring problem — we are NOT promising a clean data product we haven't shipped.
- **No fabricated numbers.** Every figure is `[PULL: ...]` until sourced from the actual experiment note.
- **No "we'll get it next time" energy.** The trade is dead; the post is stronger for saying so without flinching.
- **No over-claim on the finding.** "Small-caps are efficient where we bet they were blind" is supported by *our*
  data on *our* sample — say the sample, don't generalize to all of Indian markets forever.

## Open decisions for Lijo (the few things I can't pick for you)
1. **Venue** — Substack? a PDF "note"? LinkedIn? cross-post? (changes register slightly, not the spine)
2. **Names/identity** — publish as SachNetra, as you + James by name, or pseudonymously? (affects the networking
   payoff — real names get the mentor; anonymity protects optionality)
3. **How much of the database to reveal** — the post is more credible with one real chart from the data; are we
   comfortable showing it?
4. **The soft ask** — do we include the one "if you work on long-horizon India intelligence, talk to us" line, or
   keep it pure with zero ask this round?

## Next concrete step once you react
Pick the venue + identity (decisions 1–2), and I'll pull the real numbers from the experiment notes to turn each
`[PULL: ...]` into a sourced sentence + name the 3–4 charts we'd actually make. That's the full first draft.

## Working-title alternatives
- "We Built a Machine to Read India's News First. Here's Why It Didn't Matter."
- "18 Honest Failures: What the Indian Market Taught Two People With a Laptop"
- "The Market Was Fastest Where We Bet It Was Slowest"
- "Notes From a Dead Edge: A Year of Indian Market Nulls"
