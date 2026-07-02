---
tags: [learning, plain-english, eli12, probes, governance-signal, survivorship, bhavcopy, data-feasibility]
date: 2026-06-26
status: explainer — the plain-English companion to the technical probe docs. Saved so the "why" survives in
  words anyone can read, not just counts and regexes.
related: 2026-06-26_governance-blowup-signal-design.md, 2026-06-26_governance-blowup-PREREGISTRATION.md,
  scripts/research/probe-governance-label-inventory.mjs, scripts/research/probe-pledge-extraction.mjs,
  2026-06-26_probe2-bhavcopy-RESULTS.md, [[project-pivot-governance-door]]
---

# The two feasibility probes, in plain English

## TL;DR
Before building the governance "blow-up" early-warning signal, we ran two cheap, read-only checks. **Probe 1**
asked "do we already have the raw material?" — answer: **yes** (the gold default-disclosure label + bankruptcy
records + most warning-sign features are already in our database; pledge needed a better source, which turned out to
be an upgrade). **Probe 2** asked "can we test this honestly, for free?" — answer: **yes** (the exchanges' daily
"bhavcopy" files are permanent photographs of the market that never erase companies that later died, so we can avoid
the survivorship trap for ₹0). Both gates are green. Nothing now blocks the first real test (the manual hand-trace).

## Why we ran probes at all
The signal is meant to flag a company heading for a blow-up (default / bankruptcy / forced delisting) *before* the
rating agencies or the price react. Before building, two basic questions had to be answered honestly:
1. Do we already hold the raw material — the filings with the warning signs, and the records of who actually blew up?
2. Can we test the idea *honestly* and *for free* — without fooling ourselves?
A "probe" = a small read-only look. We look; we never change anything.

## Probe 1 — "What's actually in our filings database?"
**What it is.** Our collection engine has quietly been saving every regulatory filing Indian companies post to the
NSE into a table (`india_bourse_announcements`). We'd never read it through the blow-up lens. The probe reads that
table and counts things — sorting each filing into buckets by word-matching its label/subject (anything with
"default" → default bucket, "auditor" → auditor bucket, "insolvency/NCLT" → bankruptcy bucket, etc.), then tallying
how many filings, how many distinct companies, and over what dates.

**What it found — the good news:**
- 333,614 filings across 2,396 companies, May 2024 → now.
- The **"gold" blow-up label is already there.** Since 2019, a company that defaults on a loan must announce it within
  24 hours. We're already collecting these: **435 default disclosures from 119 companies.** Cleanest possible
  definition of a blow-up — and we hadn't realised we already had it.
- **Bankruptcy filings (NCLT/insolvency): 330 companies.**
- Three of five warning-sign features well-covered: auditor resignations (1,756 companies), CFO/finance-chief exits
  (1,373), director resignations (1,352).
- This matters because the test needs ≥~20 real blow-up events to mean anything — and we found far more.

**What it found — the snag:** Promoter **pledge** filings showed up only 90 times — implausibly few for one of the
strongest warning signs.

### Probe 1b — chasing the missing pledge data
A narrower follow-up probe found the pledge filings *are* there (~9,000), but filed under a generic label
("Disclosure under SEBI Takeover Regulations") with the real detail locked inside the attached PDF — so plain
word-matching can't pull them out. **Why that's good:** it pushed us to the better source — the **promoter-pledge
percentage** companies report every quarter (a clean number like "62% of promoter shares pledged"). That's a
*stronger* signal than messy event-text and exactly what a credit desk watches. We upgraded the design to use it.

## Probe 2 — "Can we test this honestly, for free?" (the bhavcopy question)
**The trap we were dodging — survivorship bias.** Imagine studying plane crashes using only planes still flying
today: you'd conclude planes never crash, because the crashed ones aren't in your data. Free stock-price services
(like Yahoo) have this exact flaw — they keep only companies that *still trade today*. The ones that blew up and got
delisted have vanished — and those are precisely the companies we're studying. Build on that and the model looks
brilliant in the lab and dies in production.

**What "bhavcopy" is.** Every trading day the NSE and BSE publish a *bhavcopy* — a file listing every stock that
traded that day, with price and volume. A **daily photograph of the whole market.** The key question: do the
exchanges ever go back and edit old photos to erase companies that later died?

**What we found.**
- **No — they never edit old bhavcopies.** Each day's file is a frozen, permanent time-capsule.
- **The proof:** the NSE bhavcopy from 10 June 2021 still contains **DHFL** (a famous housing-finance collapse) at
  ₹18.55 — sitting in the file today, even though the company is long gone.
- These archives go back ~20 years, they're **free**, and the anti-bot cookie trick the NSE needs is **already
  solved in our own code** (`warmUpNSE`).
- We also confirmed free sources for *who* blew up (the IBBI bankruptcy registry) and how to tell a forced delisting
  from a friendly buyout.

**What it means.** We can rebuild a "photograph of the market as it was" — dead companies included — for ₹0. That
removes the survivorship trap and lets the backtest be honest. This was the one thing that could have killed the
whole plan. It didn't.

**One discipline note.** Even though we *can* build this bhavcopy pipeline, we are **not building it yet.** The first
real test (the manual hand-trace of ~30 known blow-ups) needs none of it. Building the machinery before proving the
idea works is the exact trap the cold-reads warned about.

## Verdict — PURSUE (to the next gate)
Both feasibility gates are green: we hold the raw material (Probe 1) and we can test it honestly and free (Probe 2).
The next step is the cheap, manual **hand-trace kill test** against the locked pre-registration — the real moment of
truth. Build the bhavcopy pipeline only *if* the hand-trace shows the signal separates blow-ups from survivors.
