---
title: "We Tried to Predict Indian Bankruptcies From Governance Red Flags. Here's the Honest Result."
subtitle: "A pre-registered test, a 10-model red-team, and why we parked it — written so a beginner can follow."
date: 2026-06-27
status: PUBLICATION DRAFT (canonical Markdown source). Publish narrative to Substack/blog; optional PDF + HTML
  data-appendix. Beginner-readable but rigorous. Everything here is real and reproducible from the repo.
authors: [Lijo, James]   # decide identity/venue before publishing
tags: [publication, nulls, governance, insolvency, pre-registration, honest-negative-result, india, quant]
---

# We Tried to Predict Indian Bankruptcies From Governance Red Flags. Here's the Honest Result.

*Two people, a database, and a pre-registered test. It didn't work — and the story of **why** is more useful than
a win would have been.*

---

## TL;DR

We asked a simple question: **before an Indian listed company goes bankrupt, do its public regulatory filings show a
rising pattern of governance "red flags" — auditor resignations, CFO exits, board departures, delayed results,
promoter share-pledging — that a patient outsider could detect a year ahead?**

We built it carefully. We pre-registered the test (wrote down the pass/fail rules *before* looking at the answer).
We took our bankruptcies from the **legal record**, not from prices, to avoid the classic survivorship trap. We
hand-verified every case. We measured a "friction score" in a window that **ended six months before** each bankruptcy
so we wouldn't just be reading the final collapse. We matched each failed company to a healthy lookalike.

**Result: inconclusive, leaning negative.** The blow-ups did carry more red flags than their healthy peers — but
only *just*, not enough to clear our pre-registered bar, and not in a statistically meaningful way on our small
sample. Then we sent the result to **ten different AI models for a cold, adversarial red-team**, and most of what
they said was right. When we ran their sharpest tests against our own data, we found:

- **Good news:** the signal is **not** a filing-volume artifact (the failing companies actually filed *fewer*
  announcements than the healthy ones).
- **Fatal news:** we **cannot prove the signal is *predictive* rather than *coincident*** — because our clean data
  is only two years deep, the test that would settle it is impossible to run.
- **And:** when we hand-read the borderline cases, the "red flags" turned out to be mostly **routine corporate
  noise** — appointments, routine auditor changes, exchange queries — not distress.

So we **parked it.** Honestly. This is a negative result, and we're publishing it because almost nobody does, and
because the *method* — and the discipline of letting the evidence win — is the part worth sharing.

---

## 1. Why we were even looking

We're two people in India who built something unusual: a clean, continuously-updated, multi-year database of Indian
news + regulatory filings + market data. We originally tried to *trade* on it — react to news faster than the market.
That failed, comprehensively, and we accepted it. (That's its own story.)

But killing the trade didn't kill the data. It revealed what the data might actually be *for*: not reacting to today's
news faster, but **reading the slow signals in the regulatory record that humans don't have the patience to track.**

The most concrete version of that idea: **a governance early-warning signal.** When a company is heading for trouble,
the early symptoms often appear first in dull, public filings nobody reads. If we could systematically score those,
we'd have something a credit desk or a long-term investor might genuinely want — a "do-not-touch" list, built a year
ahead.

That's the hypothesis we set out to test.

## 2. The discipline (this is the part most people skip)

Negative results are only believable if you can't have been fooling yourself. So before touching any outcome, we
locked these choices down:

**We pre-registered the test.** We wrote, in advance: *"A pair where the bankrupt company scores strictly higher than
its healthy match is a 'win.' Pass = wins in ≥65% of pairs. Kill = <55%. In between = inconclusive."* Then we weren't
allowed to move the goalposts.

**We took bankruptcies from the legal record, not from prices.** This matters more than it sounds. Free price data
only keeps companies that *still trade today* — the ones that died and delisted have vanished from it. Studying
failure with such data is like studying plane crashes using only planes still flying. So we pulled our "blow-ups"
from India's insolvency registry (the IBBI), filtered to listed companies using a neat structural trick — *a listed
Indian company's ID number (CIN) starts with the letter 'L'* — and dropped the cases that were withdrawn within 90
days (those are usually a vendor using the bankruptcy court as a debt-collection lever, not a real failure).

**We hand-verified every case.** This caught real impostors: companies that were *admitted* to insolvency but then
**won their appeal** and resumed normal trading; cases where only an *application* was filed and never admitted; and
"already-dead shells" whose real collapse happened years before our data even begins (a company with 0.7% promoter
holding left; a penny stock with no data since 2019). We dropped all of those.

**We left a 6-month gap.** We scored each company's red flags over a 12-month window that *ended six months before*
the bankruptcy date — so we'd be testing *early warning*, not just reading the obituary.

**We matched controls.** Every failed company was paired with one surviving company in the same sector and size, scored
over the exact same window.

## 3. What we measured

The "friction score" was a simple count of how many *distinct types* of governance red flag a company filed in the
window (0 to 6): auditor resignation, CFO/key-manager exit, independent-director exit, delayed/missing results,
related-party-transaction spike, and high or rising promoter share-pledge.

Four of those we extracted automatically from filing headlines. The pledge data we collected **by hand** from
quarterly shareholding disclosures.

## 4. The result

On 13 carefully hand-verified pairs:

> **8 wins, 4 ties, 1 loss.**
> Strict separation (bankrupt > healthy): **61.5%** — just under our 65% pass bar → **inconclusive.**

Two findings inside that number were genuinely interesting:

**Promoter pledging — the "obvious" red flag — mostly failed.** Only 3 of 13 bankrupt companies had high promoter
pledge. The other 10 went bankrupt with *almost none.* Pledging catches one specific failure mode — a promoter who
over-borrowed against their own stock (one company had pledged ~78% of its shares a full year before collapse) — but
it completely misses companies that fail from ordinary operational distress. The "obvious" signal was the weakest one.

**The unglamorous flags did the work.** Auditor changes, manager exits, and delayed results carried whatever signal
there was — the composite beat pledge-alone by 4×.

## 5. Then we tried to break it (with ten cold red-teams)

Here's the part we're proudest of, and it's not a result — it's a *process.* We wrote up the design and the numbers
as a stripped, anonymous brief and sent it to **ten different large language models**, with one instruction: *"Be
adversarial. Your job is to break this, not encourage it."*

They converged, hard, and they were mostly right:

1. **"Believe 61.5%, not the softer 92.3% non-strict number."** We had quietly noticed that in 12 of 13 pairs the
   bankrupt company scored *at least as high* as its match. The red-team called that what it was: leaning on a softer
   metric because the pre-registered one missed. *Conceded.*
2. **"It's statistically insignificant."** 8 wins out of 13 is a coin-flip (p ≈ 0.29). The sample is too small to
   conclude anything. *Conceded.*
3. **"It's fragile."** Drop two questionable cases and it falls into the kill zone. *Conceded.*
4. **The deep one: "These aren't governance *predictors* — they're distress *symptoms*."** An auditor doesn't resign
   because of abstract governance; they resign because they've already seen the company is sinking. A 6-month gap is
   too short when an Indian bankruptcy gestates 12–24 months. We may have built a *distress thermometer*, not an
   *early-warning system.* This was the sharpest critique, and it stuck.
5. **"'Better extraction will fix the ties' is wishful thinking."** *Conceded — and we proved them right ourselves
   (below).*

## 6. What our own data said back

Here's why repo access matters — the red-teams were reasoning from priors; we could actually *check.*

**Their #1 attack — "the bankrupt companies just file more, so they hit more flags by chance" — is wrong, in our
data.** We counted total filings per company in each window. The bankrupt companies filed **fewer** announcements than
their healthy controls (more filings in only 1 of 13 pairs; median ratio 0.73×). So the score is *not* a volume
artifact — the failing companies hit the *specific* red-flag types more often *despite filing less overall.* A small,
real point in the signal's favor.

**Their decisive test — we couldn't run it, and that's the verdict.** The way to prove a signal is *predictive*
rather than *coincident* is to score the same companies further back in time — 18 to 30 months before bankruptcy. If
the separation holds that far out, it's a real early warning. If it collapses, it's just reading ongoing distress.
**Our clean filing history is only two years deep**, so for our recent bankruptcies that older window falls *before
our data exists.* We literally cannot run the test that would settle it. **So we cannot honestly claim early warning.**

**And when we hand-read the borderline cases, the flags dissolved into noise.** We pulled the actual filings behind
the four tied pairs. They were routine: a healthy paper company's "red flags" were ordinary appointments and a
company-secretary change; an exchange clarification query; a routine auditor rotation. In one tie, the *healthy*
company scored *higher* on pure noise. There were no hidden distress signals for a smarter model to find — which is
exactly why "better extraction will save it" was wishful thinking.

## 7. The honest verdict

> In a tiny, statistically-insignificant sample, Indian companies that went bankrupt carried more governance red
> flags than matched survivors — **and, encouragingly, not because they filed more.** But we **cannot prove the
> signal is predictive rather than coincident**, because our data isn't deep enough to run the test; the result is
> **not statistically significant**; it's **fragile** to a couple of cases; and on close reading, much of the signal
> at our resolution is **routine corporate noise.**

So we parked it. Not killed — parked, as *expensive, honestly-won knowledge.* To revive it would take years of
deeper filing history (to run the predictive test), a much larger sample, controls matched on financial distress (not
just sector and size), and a bar — roughly 80% separation on 50+ out-of-sample names, beating what credit ratings
already tell you — that we are nowhere near.

## 8. What we'd tell the next person who tries this

- **Pre-register, or you'll fool yourself.** The single most valuable thing we did was write the pass/fail bar down
  before looking. It's the only reason we could trust our own disappointment.
- **A cold, adversarial review is worth ten encouraging ones.** Ten models trying to break our result taught us more
  in an evening than weeks of polishing would have. (And the one self-serving rationalization we'd started to believe
  — "better extraction will fix it" — they caught immediately. So did our own data.)
- **Read the actual rows.** Aggregate scores hid the truth; the individual filings revealed it was mostly noise.
- **Know what your data *can't* tell you.** Our wall wasn't a bad idea — it was that two years of history can't
  answer a "did it come *early*?" question. That's a data-depth problem, and it's honest to say so out loud.
- **Distinguish a thermometer from a crystal ball.** "This company is *currently* in distress" and "this company
  *will* fail" look similar in the data and are completely different products. We accidentally built (a weak version
  of) the first while hoping for the second.

A negative result, published honestly, is rare in Indian markets — not because the failures are rare, but because
almost nobody has both the data and the willingness to show their work. We have both. So here it is.

---

## Chapter 2 — We tried once more, as a *product*. It failed three ways.

*(Added 2026-07-02.) Parking the trade-signal version didn't kill the idea. We reframed it as the thing a buyer might
actually pay for — a **monitoring feed for lenders**: "watch these Indian companies' filings, flag the ones sliding
toward collapse, sell it to credit-risk teams who lose money when a borrower blows up." We designed a decisive test
for it, red-teamed the design with several models, calibrated the reviewers with deliberately-planted errors, and
boiled it down to a cheap two-day hand-trace before committing to any build. Then we ran day one. Here's what happened.*

**Failure #1 — the clock lied to us, and so did our own data.** Day one was just supposed to check dates: for each
recent blow-up, when did the bankruptcy court actually admit it? On checking, **~40% of our "recent" cases weren't
recent at all** — their insolvency began in 2021–2023; a routine mid-process filing in 2025–26 had made them *look*
fresh. The cause was subtle and important: our clean data starts in mid-2024, so for any company whose collapse began
earlier, the earliest filing we can see is a *mid-process update* — which our roster mistook for the start. **Our own
two-year data floor was manufacturing false start-dates.** After cleaning, fewer than 10 genuinely-recent, real
collapses survived — and their "collapse date" (the court admission) lagged the real financial trouble by anywhere
from ~3 months (a fast, famous fraud) to *years* (a distressed builder, a distressed pharma firm). You cannot measure
a *head-start* against a finish line that moves by years.

**Failure #2 — a panel of strangers reached the same wall.** We gave the problem to six AI models and asked: *given
~2 years of data and an unreliable collapse-clock, can this even be tested?* Five of six said **no** — one put it
bluntly: *"an anecdote, not a dataset."* *(Honesty correction, added after our own reviewer caught it: we handed the
models our cleaned finding, so they **ratified** premises we supplied rather than rediscovering them cold. The
premises are true — we'd verified them — so the statistical judgment holds, but this is corroboration, not the
independent "triangulation" an earlier draft claimed. We're leaving the correction visible on purpose.)* One put it bluntly: *"an anecdote, not a dataset."*
Another: *"unfalsifiable — not underpowered, unfalsifiable"* (the math needs 3–4 years of history and 30–40 clean
cases; we have neither). They independently rediscovered the two walls our own data had just hit: the court date is
the wrong clock, and under ten clean cases can't support a predictive claim. When cold theory and your own empirics
agree, stop arguing.

**Failure #3 — even if it worked, the edge is thin.** One reviewer made a point that outranks the statistics: the
loudest red flags — auditor resigns, CFO quits, results filed late — are **24-hour mandatory public disclosures** for
*listed* companies, in every credit desk's inbox the same day. *(Scope caveat we owe the reader, and got wrong in a
first draft: this bites the **listed** population. For the private/unlisted borrowers the product was actually pitched
at, these surface via slow MCA filings, not a same-day feed — and the two flags that might genuinely **lead**,
share-pledging and related-party transactions, are quarterly, not same-day.)* So it's a real edge problem for a
*listed* feed — not the blanket kill we first called it. A genuine edge would require predicting those disclosures
*before* they're filed, from subtler precursors — a harder, different product than the one we set out to build.

**So: null again — but now we know exactly why**, at three independent levels (data depth, wrong clock, no moat). One
honest door stays open, and we're walking through it: a **sealed forward prediction** — we score every company today,
cryptographically timestamp the list, and check in a year who actually failed. It's the one form of evidence a skeptic
can't wave away as hindsight, and it costs almost nothing. And one reviewer noted our two-year floor is a *choice*,
not a law — India's exchange archives go back two decades — so a deeper rebuild could revisit this someday. But that's
years of data-plumbing that runs straight back into problems we haven't solved, so it waits.

**The lesson that generalizes:** we didn't fail for lack of a clever model. We failed because we kept checking whether
the *thing we were measuring* was even the thing we thought it was — and each time we looked harder, it wasn't. That
discipline is cheaper than a two-week build and far cheaper than a product nobody can use. The willingness to run the
two-day test that kills your own idea is, itself, the edge.

**Postscript — we took our own medicine.** A reviewer with database access red-teamed *this write-up* and caught us
over-claiming — including asserting the null without ever having computed it. Fair. So we ran the test we'd skipped:
we re-anchored the clock to the first public default/downgrade on the *listed* universe (49 events, 18 with usable
history) and measured **specificity** against 96 healthy lookalikes. It earned the null we'd only assumed — the flags
fired for **62% of the healthy companies too**, a specificity gap of just **0.15**, well under the **0.30** we'd
pre-registered as the pass bar. Only the auditor-resignation flag separated at all; the rest were noise. The one piece
still genuinely open is whether the *promoter-behaviour* flags — share-pledging, related-party transactions — lead,
and those aren't in the filing text, so that answer waits for deeper data. A null, now **earned instead of assumed** —
which is the only kind worth publishing.

---

*Everything in this piece is reproducible. The pre-registration, the case roster, the scoring, the red-team
transcripts, and the checks are all version-controlled. Happy to share the method with anyone doing serious work on
Indian corporate distress — especially if you have the one thing we don't: a decade of clean filing history.*

<!-- PRE-PUBLISH DECISIONS:
  - identity/venue (real names → mentor reach; pseudonymous → optionality)
  - how much raw data to show (one chart strengthens it: the 8/4/1 pairs + the volume-leak split)
  - the soft "talk to us" ask: keep ONE line, no CRM energy
  - optional companion: self-contained HTML report with the 2-3 charts (Exp14 report.html pattern)
-->
