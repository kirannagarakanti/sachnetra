---
tags: [probe, recon-brief, ibbi, cirp, insolvency, blow-up-labels, governance-signal, external-agent]
date: 2026-06-26
status: RECON BRIEF for the external scrape agent (per [[feedback-external-agent-recon]] — Claude writes the brief,
  the agent does the scrape recon in scratch/, Claude synthesizes; Claude does NOT run the scrape).
gates: the clean CASE roster for the hand-trace (2026-06-26_governance-blowup-PREREGISTRATION.md §1/§6) — replaces
  the too-noisy announcement-text labels.
dispatch: AFTER Probe 2. Tone: humane / conversational on purpose.
---

# Probe 3 — The IBBI bankruptcy registry: who *actually* blew up? (a recon ask)

Hey — one more data-hunt, and this is the one that gives us our real list. As before: take your time, and an honest
"this part is messy / only half-available" is a genuinely useful answer, not a failure.

## Why we're asking
We're testing a signal that tries to spot Indian companies heading for a blow-up *before* it happens. To test it, we
need a clean, trustworthy list of companies that **actually** went bankrupt — the real failures, with the real dates.

We already tried the lazy way: searching our own database of company filings for the words "insolvency" or "NCLT."
It didn't work — it's far too noisy. Healthy companies like ITC, Coforge and Vedanta showed up, simply because they
*mentioned* the bankruptcy court (they were a lender chasing a claim, or buying a distressed asset, or in some
unrelated lawsuit). Text-matching can't tell "**this** company went bankrupt" apart from "this company said the word
NCLT." So we need the authoritative source instead.

That source is **IBBI** — the Insolvency and Bankruptcy Board of India. It keeps the official register of every
company put into the Corporate Insolvency Resolution Process (CIRP). That register, not our filings, is the honest
list of who actually failed.

## What would genuinely help (a sample + a dated URL for each, saved to scratch/)
Don't worry about being exhaustive — a clean grab of the core fields beats a sprawling mess.

1. **The CIRP register itself.** IBBI publishes lists/quarterly data sheets of companies admitted to insolvency. Can
   you pull a structured table with, per company: **company name, CIN (the official company ID), the admission /
   commencement date, and the current status** (still in CIRP / resolution plan approved / under liquidation /
   **withdrawn**)? The likely homes are the IBBI "resources → reports" quarterly data sheets and the
   corporate-debtor pages — whichever gives the cleanest columns.

2. **The "withdrawn early" flag — this one matters.** A chunk of insolvency cases get admitted and then withdrawn
   within weeks (the company settles). Those aren't real blow-ups for us. So we specifically need to be able to see
   *which* admissions were later withdrawn (and ideally when), so we can drop the ones withdrawn within ~90 days.

3. **Which of these were LISTED companies?** We only care about companies that traded on the NSE/BSE (our universe is
   listed stocks). Most CIRP companies are private and irrelevant to us. Is there a clean way to keep only the listed
   ones — e.g., by matching the CIN or the company name to an exchange symbol / ISIN? Even a rough match we can
   hand-verify is fine.

4. **A sensible date window.** Our company-filing history runs from mid-2024 onward, and we need ~12 months of filings
   *before* each blow-up. So the most useful cases are companies admitted to CIRP roughly **mid-2025 → mid-2026.**
   If you can also grab a handful of the famous older ones (DHFL, IL&FS, Reliance Capital, Cox & Kings, Jet Airways),
   those are gold for an illustrative side-comparison — but the recent listed ones are the priority.

5. **The CIN ↔ exchange-symbol bridge.** This is the quietly tricky bit. IBBI speaks in CINs; the stock exchanges
   speak in symbols/ISINs. Is there a free way to join the two (an MCA master, an ISIN lookup, anything)? If it's
   painful, just tell us how painful — that shapes how much we automate vs. hand-map.

## What happens with what you find
Drop a short note + the data in `scratch/` — the register table, the withdrawn flags, and however far you got on the
listed-company filter. We'll cross-reference it against the companies we already hold filings for, and that becomes
the real case list for the hand-trace. Once we have ~15–30 genuine listed blow-ups with clean admission dates, the
actual experiment can finally start. Thank you — this is the piece that turns "we think we can test this" into "here
are the names." Genuinely appreciated.
