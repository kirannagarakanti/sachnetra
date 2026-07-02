---
tags: [probe, recon-brief, bhavcopy, point-in-time-universe, survivorship, governance-signal, external-agent]
date: 2026-06-26
status: RECON BRIEF for the external scrape agent (per [[feedback-external-agent-recon]] — Claude writes the brief,
  the agent does the scrape recon in scratch/, Claude synthesizes; Claude does NOT run the scrape).
gates: the survivorship-free universe required by 2026-06-26_governance-blowup-PREREGISTRATION.md §2.
dispatch: AFTER Probe 1 (done — labels confirmed in-data). Tone: humane / conversational on purpose.
---

# Probe 2 — Can we build a "point-in-time" list of Indian listed companies, for free? (a recon ask)

Hey — we could use your help chasing down one specific, slightly tedious data question. Take your time and be honest
about what you find (including "this doesn't exist for free" — that's a useful answer, not a failure).

## The short version of why we're asking
We're building an early-warning signal for Indian companies that are quietly heading toward a blow-up — default,
insolvency, forced delisting. To test it honestly, we hit a classic trap: most free price data only includes
companies that *still trade today*. The ones that already died and got delisted have vanished from the record — and
those are exactly the companies we care about most. If we test only on the survivors, we'll fool ourselves into a
beautiful, useless result.

So we need a **point-in-time list of every company that was listed on the NSE/BSE on some past date — including the
ones that have since delisted.** The cheapest place that *might* exist is the exchanges' own daily "bhavcopy" files
(the end-of-day price/volume dump for every traded stock). We want to know if those archives go back far enough, and
crucially, whether they still contain the names that later disappeared.

## What would genuinely help (a sample + a dated URL for each, saved to scratch/)
Don't worry about being exhaustive — a few solid spot-checks beat a giant table.

1. **How far back does the NSE daily bhavcopy go?** Try pulling it for a few dates — say 2018-04-02, 2020-03-23,
   2023-07-03. What's the URL pattern, and does it need the same cookie warm-up the exchange normally demands? (We
   already have a working warm-up helper, `warmUpNSE()`, if that's useful.)

2. **The make-or-break one — do old bhavcopies still list companies that later delisted?** Pick 2–3 names everyone
   knows died (DHFL, Cox & Kings, Reliance Capital) and check a date when they were *still trading*. If they show up
   in that day's bhavcopy, we're in business. If the archive has been quietly scrubbed of dead names, that's the
   whole ballgame — tell us plainly.

3. **Same two questions for BSE.** BSE matters more here, honestly — it lists far more of the small, obscure names
   where blow-ups actually happen.

4. **The official "delisted companies" lists.** NSE and BSE both publish them. Do those lists include the *date* of
   delisting and the *reason* — and can you tell a forced/penal delisting apart from a friendly one (a buyback or a
   merger into a healthy parent)? We need to keep the real failures and throw out the benign exits.

5. **The insolvency record (IBBI / NCLT).** Their order lists are public. Can you actually scrape company name +
   admission date + what happened next (admitted / withdrawn / liquidated)? We need this to date the blow-ups
   precisely and to drop cases that got withdrawn early.

6. **Sector + rough size, as of the past date.** For matching each blown-up company to a healthy lookalike, can we
   recover its sector and an approximate market cap from the bhavcopy itself (close price × shares) or some free
   companion list?

## What happens with what you find
Drop a short note in `scratch/` — per source: the URL pattern, the earliest date that actually works, whether dead
names survive in the archive, any anti-bot hoops, and one saved sample file. We'll fold it into the study design. If
the free PiT universe turns out to exist, the whole honest backtest becomes buildable on a zero budget. If it
doesn't, we'd rather know now and adjust than discover it three weeks in. Thank you — genuinely.
