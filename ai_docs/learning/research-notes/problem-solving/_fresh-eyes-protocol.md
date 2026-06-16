---
tags: [protocol, problem-solving, fresh-eyes, multi-agent, review, builder-blindness, method, standing-doc]
status: LIVING PROTOCOL — apply per the trigger list; refine after each use (log what worked in the
  problem-solving note it produced)
authored_date: 2026-06-12
origin: >
  Lijo, 2026-06-12: "when we are building we might not see our own mistakes — no matter how much I tried to
  solve the ticker problem, giving it to another agent that does NOT have any context about our application
  solved most of it by back-and-forth conversation. I want to do something like this [as a standing practice]."
  Proven once: 2026-06-10 ticker gate+goldset design (Lijo ⇄ MiniMax/maxhermes ⇄ Claude Code).
audience: Lijo + James + every future Claude/Gemini session
related: [[2026-06-10_news-ticker-tagging-gate-and-goldset]] (the proof case),
  2026-06-05_external-review-and-improvement-reflection.md (a cold-review that caught its own author),
  2026-06-12_news-brain-what-it-does-spec.md (the Auditor agent = this principle productized)
---

# The Fresh-Eyes Protocol — institutionalized "we can't see our own mistakes"

> **The principle (why this works):** the longer you build inside a system, the more its assumptions turn
> invisible — you stop *seeing* them because you *are* them. This is builder's blindness (the curse of
> knowledge). A reviewer **without your context cannot inherit your assumptions**, so it questions exactly
> the things you stopped questioning. The ticker problem wasn't solved by more effort inside the frame —
> it was solved the moment the frame itself was exposed to someone who'd never seen it. ("Most headlines
> aren't about a company at all" — the load-bearing realisation — is precisely the kind of fact insiders
> walk past daily.)

---

## 1. The three-role loop (canonical shape, from the 2026-06-10 proof case)

| Role | Who | Superpower | Failure mode (covered by the others) |
|---|---|---|---|
| **Fresh eyes** | An agent with **deliberately NO context** on SachNetra (MiniMax/maxhermes, Gemini, GPT — or minimum: a fresh Claude session given only the stripped brief) | No inherited bias; brings outside methods we'd never derive from inside the repo | Assumes infrastructure/budget/data we don't have; invents plausible-but-wrong context |
| **Context anchor** | Claude Code (full repo + strategy context) | Reality-checks every proposal against what actually exists; catches "that assumes a feed we don't collect" | **Shares the builder's blindness** — it built half of this, so it can't be the fresh eyes for its own work |
| **The decider** | Lijo | Carries context between the two; makes the call | Confirmation bias — mitigated by forcing both agents' *disagreements* to surface before deciding |

**The loop:** fresh eyes proposes → context anchor grounds → disagreements surface explicitly → Lijo decides.
The external agent's output is **input to a reality check, never a decision.** (Both halves matter: the
06-10 log shows external advice that assumed wrong infrastructure *and* internal framing that was wrong
until challenged.)

## 2. When to trigger it (the checklist — use this, not vibes)

1. **Before pre-registering any experiment** — blind-review the brief's *method* (not the hypothesis).
2. **Before building any component bigger than ~a week** — every phase gate of the Mind's blueprint gets one.
3. **After two failed attempts** at the same problem — the second failure usually means the frame is wrong,
   not the execution.
4. **When a result surprises — especially when it's *good*.** (The playbook already kills
   too-good-to-be-true results; this is the design-side twin.)
5. **When the same bug/fix keeps coming back** — regression loops are frame errors wearing a bug costume.
6. **NOT for everything.** Fresh-eyes on routine work is thrash. If it's not on this list, just build.

## 3. How to package the problem (the art — this is where most attempts fail)

**GIVE the stranger:**
- The problem statement in **plain language** (no internal codenames — "we tag news headlines with stock
  symbols," not "the G1 V2-031c gate"). *Translating out of jargon is itself diagnostic: every term you
  struggle to translate is a hidden assumption.*
- The **hard constraints**: budget, data shape and scale, latency, team size, what's already immovable.
- **Real input/output examples** (the actual weird headlines, not idealized ones).
- **What was tried and what literally happened** — facts, not your interpretation of why it failed.

**WITHHOLD deliberately:**
- Your current design and your hypothesis about the cause. *(Leak these and you get your own bias back,
  laundered through a second model — the #1 way this protocol silently fails.)*
- The repo, the wiki, the strategy docs. The whole point is what someone concludes *without* them.

**During the back-and-forth:** answer the agent's questions with facts, not steering. Let it be wrong in
interesting directions — its wrong guesses reveal which constraints you forgot to state, and *those* are
your hidden assumptions, enumerated for free.

**The litmus test:** if you can't write the brief so a stranger could act on it, you've already found the
first hidden assumption — yours.

## 4. The reality-check pass (non-negotiable second half)

Every fresh-eyes proposal then goes through the context anchor with the full repo: *what does this assume
that we don't have? what does it duplicate that we already built? what does it contradict that we've
already measured?* Keep what survives. Log the kept/killed split in a problem-solving note (the 06-10 log
is the template) — **the method is the artifact**, not just the answer.

## 5. Cross-model rule

Fresh eyes should be a **different model family** whenever possible — same-family reviews share training
blind spots. Current roster: **Gemini** (free tier, in hand), **MiniMax/maxhermes** (the proven one),
**GPT** (if available). Minimum acceptable: a *fresh* Claude session that receives only the stripped brief
— weaker (same family) but still breaks *session* context bias.

## 6. Where this is built INTO the Mind itself (not just our process)

The what-it-does spec already encodes this principle as product architecture — keep these deliberate:
- **The Auditor agent is context-poor BY DESIGN** — it does *not* share the specialists' memory, so it
  cannot inherit their narrative bias. It's the institutional fresh eyes running every 10 minutes.
- **Multi-agent debate on high-impact events** (bull analyst vs bear analyst vs risk arbiter) —
  adversarial fresh eyes, used only on the ~2% that matter.
- **The reflection loop** ("did my last read play out?") — *time* as the cheapest fresh reviewer there is.

## 7. Failure modes of the protocol itself (respect these)

| Trap | What it looks like | Guard |
|---|---|---|
| **Laundered bias** | The brief leaks your hypothesis ("we think it's the alias list…") | §3 WITHHOLD list; have someone else read the brief for leaks |
| **Oracle worship** | Treating the external agent's answer as the decision | §4 — its output is input to the reality check, always |
| **Context starvation** | Stripping so much the agent solves a *different* problem | GIVE list — constraints and real examples stay in |
| **Thrash** | Fresh-eyes review on every small thing | §2 trigger list only |

## 8. Copy-paste brief skeleton

```
PROBLEM (plain language, no project jargon):
  We are building a system that <what it does for a stranger>. The specific problem: <X>.
HARD CONSTRAINTS:
  budget <>, data we have <shape, scale, freshness>, latency <>, team <>, immovables <>.
REAL EXAMPLES:
  input → current output → desired output   (3–10 real cases, include the ugly ones)
WHAT WE TRIED → WHAT HAPPENED (facts only):
  1) <attempt> → <measured result>
  2) <attempt> → <measured result>
QUESTION TO YOU:
  How would you approach this from scratch? Ask me anything about the constraints —
  but propose your own frame before I show you ours.
```

*(That last sentence is load-bearing: get THEIR frame committed before yours can contaminate it.)*
