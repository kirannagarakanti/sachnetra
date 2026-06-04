# Deep Research — Solve a Problem / Add a Feature (SachNetra)

> **Goal:** Given a *problem* or *feature* (not a specific source), research across every relevant source — codebase, wiki, git repos, papers, blogs, latest news — and return a gate-checked **Pursue / Park / Kill** recommendation with "what works / what might not".

> **Source of truth = [`ai_docs/learning/RESEARCH_INSTRUCTIONS.md`](../learning/RESEARCH_INSTRUCTIONS.md).** Load and follow it in full. This template is just the slash-command wrapper. If you change *how research works*, edit `RESEARCH_INSTRUCTIONS.md`, not this file.

---

## Agent autonomy (Claude Code)

You have permission to **search the web, fetch URLs, create/update markdown files, and improvise** without asking Lijo before each tool call.

| Tool / action | Use for |
|---------------|---------|
| **WebSearch** | Discovery — papers, repos, SEBI/NSE news, practitioner posts. Refine queries as you learn. |
| **WebFetch** | Read sources (arXiv, Wikipedia, SCIRP, blogs, GitHub README). One 403 ≠ tool broken — find mirrors. |
| **Grep / Glob / Read** | Our codebase and docs — always before "we have no X". |
| **Bash `git clone`** | Inspect repos under `scratch/` (quote evidence inline; scratch links rot). |
| **Write / Edit `.md`** | **Create early:** `ai_docs/learning/research-notes/YYYY-MM-DD_<slug>.md` using the template in `RESEARCH_INSTRUCTIONS.md`. **Update the same file** when follow-up fetches change numbers or verdict. |
| **Improvise** | Pivot source types if weak; add candidates; re-run the gate when evidence shifts. |

**Still forbidden:** sacred files, prod migrations/seeds, fabricated citations, invented `V2-###` / `ExpNN` IDs.

---

## STEP 0: Load context (required, before searching)

1. Read [`ai_docs/learning/RESEARCH_INSTRUCTIONS.md`](../learning/RESEARCH_INSTRUCTIONS.md) — the full protocol.
2. Read [`ai_docs/learning/README.md`](../learning/README.md) — SachNetra standing context (mission, what works/is killed, sacred files, lanes). Do **not** ask Lijo to re-explain the project.
3. Skim [`research_state_summary.md`](../sachnetra%20v2/wiki/syntheses/research_state_summary.md) so you don't re-propose a killed idea.

---

## STEP 1: Frame the problem (Phase 0)

Write these down before any searching — if you can't, you're not ready:
- **Problem statement** — one sentence.
- **Current state, with evidence** — what we do today + the measured number. *Grep the codebase before claiming we don't have something.*
- **Constraints** — data tier (EOD/RSS/NSE — no Level-2/tick/execution), stack, sacred files, lane.
- **"Solved" = ** metric + threshold (confirm it's the *right* denominator).
- **Prior art** — searched wiki `experiments/` + learning journal? Already tried/killed?

---

## STEP 2: Search broadly, then deep (Phase 1)

Cheapest-signal first; use `Explore`/`general-purpose` subagents to fan out in parallel:
1. Our codebase (Grep/Glob/Read) → 2. Our wiki + journal + experiments → 3. GitHub repos → 4. Academic papers (SSRN/arXiv preprints) → 5. Practitioner blogs (Quantocracy ecosystem) → 6. Latest news / regulatory + data-source state.

Follow the per-source tactics + credibility traps in `RESEARCH_INSTRUCTIONS.md` §"Source-specific deep-research tactics". **Fetch sources — never cite from memory or fabricate.**

---

## STEP 3: Evaluate — what works / what might not (Phase 2)

Build the candidate matrix (Candidate · Source · Evidence quality · Works because · **Might NOT work because** · Data/stack fit · Lane). The "might not work" column is mandatory. Separate transferable patterns from non-transferable (US/institutional/Level-2) assumptions.

---

## STEP 4: Verdict — the gate (Phase 3)

Before any **Pursue**, clear ALL FOUR: (1) data tier, (2) kill list, (3) live consumer (active experiment, not refuted), (4) right denominator. Default to **Park**. Force exactly one of Pursue / Park / Kill; for Pursue name the V2-### task (or "to file") + lane.

---

## STEP 5: Output + reflect (Phase 4)

- One source → distill into the matching template (`articles/` or `git-repos/TEMPLATE_REPO.md`).
- Many sources → **create** a problem-research note at `ai_docs/learning/research-notes/YYYY-MM-DD_<slug>.md` (mkdir `research-notes/` if missing). Use the template at the bottom of `RESEARCH_INSTRUCTIONS.md`. Prefer writing the file **during** research, not only at the end.
- Promote to wiki only if a new concept/entity/playbook emerged.
- Reflect: surface uncertainties + any protocol friction to Lijo.

Run the **quality-bar checklist** at the end of `RESEARCH_INSTRUCTIONS.md` before returning.

**Follow-up sessions:** If Lijo says "continue research" or gives a narrower question, reopen the same note, append a dated section, and re-check the gate — do not start from scratch unless the problem changed.
