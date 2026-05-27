# Learning — Lijo's Research Journal

**Purpose.** A persistent journal for everything Lijo watches or reads (videos, papers, podcasts, articles). Each entry does two jobs at once:

1. **Explain it back to Lijo like he's 12** — so the time spent watching turns into something he actually remembers.
2. **Brief the agent** — so any future Claude/Antigravity session can pick up cold, without Lijo re-explaining what SachNetra is or what we're working on.

This folder is **not** a fork of the wiki. It's the **inbox upstream of it**. Raw learning lands here → gets distilled → graduates into `ai_docs/sachnetra v2/wiki/` via the protocol below.

---

## Standing context (read this first, every session)

If you are an agent reading this README at the start of a session, this is your one-screen brief. Don't ask Lijo to re-explain.

**Project**: SachNetra — India's news clarity tool. V1 (consumer aggregator) is live at sachnetra.com. V2 is a quant-research backbone that turns the news engine into a market intelligence database (Railway PostgreSQL + Upstash Redis + Vercel Edge).

**V2 positioning (2026-05-23)**: "Be your own first customer." Lijo is building this to trade his own capital, not to sell as B2B/SaaS. Kill list: V2-004/007/008/010 + UI polish. Pursue list: data-collection tasks (V2-011 through V2-031) and edge-validation experiments. See [`positioning_v2.md`](../sachnetra%20v2/wiki/syntheses/positioning_v2.md).

**Research state (one paragraph)**:
- **One signal works**: SachNetra's NSE filing pipeline beats Indian newswires by ~13 min on large-caps (Exp 4). Latency edge, not forecasting edge.
- **FII flow does NOT predict next-day direction or volatility** once you control for GARCH persistence (Exp 1, 7, 9 — confirmed by validated estimator).
- **The squeeze**: long-lead events have no price impact; high-impact events the wire gets fast too. Escape = mid/small-cap pivot, gated on news-ticker tagging coverage (G1 in the data-gaps backlog, currently in progress via V2-031).
- Full read: [`research_state_summary.md`](../sachnetra%20v2/wiki/syntheses/research_state_summary.md) (15-min plain-English version) and [`sachnetra_research_playbook.md`](../sachnetra%20v2/wiki/syntheses/sachnetra_research_playbook.md) (how we prove a signal works).

**Lijo's lane vs James's lane**:
- James = build the collectors (engineering).
- Lijo = validate the signals (research). This journal is Lijo's lane.

**Sacred files** — never touch: `src/config/variants/{full,tech,finance}.ts`, `scripts/seed-insights.mjs`. See CLAUDE.md.

**Source-of-truth links**:
- Project rules: `/CLAUDE.md`
- Standing research summary: [`../sachnetra v2/wiki/syntheses/research_state_summary.md`](../sachnetra%20v2/wiki/syntheses/research_state_summary.md)
- Validation playbook: [`../sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md`](../sachnetra%20v2/wiki/syntheses/sachnetra_research_playbook.md)
- Wiki ingestion protocol: [`../sachnetra v2/wiki/WIKI_SCHEMA.md`](../sachnetra%20v2/wiki/WIKI_SCHEMA.md)
- Roadmap: [`../sachnetra v2/V2_roadmap.md`](../sachnetra%20v2/V2_roadmap.md)

---

## Folder structure

```
ai_docs/learning/
├── README.md              ← this file (standing context)
├── videos/
│   ├── TEMPLATE.md        ← canonical entry template
│   └── YYYY-MM-DD_<slug>.md
├── playlists/
│   └── <playlist_slug>/
│       ├── _index.md      ← series overview, episodes consumed, running synthesis
│       └── epNN_<slug>.md ← same shape as videos/ entry
├── articles/              ← same shape as videos/ entry, source_type: article
│   └── YYYY-MM-DD_<slug>.md
└── transcripts/           ← raw transcript dumps (created on demand)
    └── YYYY-MM-DD_<slug>.txt
```

**Naming**: `YYYY-MM-DD_short-kebab-slug.md`. Date = the day Lijo watched it, not the upload date. Slug = something a human can grep for ("kelly-criterion", not "video-3").

---

## The workflow (four steps)

### 1. Capture (Lijo)

When Lijo wants to log a video, he pastes:
- The link
- The transcript (full)
- A one-line "why this video"

…and tells the agent: *"Distill this. Use the learning journal template."*

That's it. No need to re-explain the project — this README is the standing context.

### 2. Distill (agent)

Agent creates `videos/YYYY-MM-DD_<slug>.md` from `videos/TEMPLATE.md` and fills every field. Required fields (no skipping):

- **TL;DR** — 3 bullets, the whole video compressed.
- **ELI12** — 60 seconds of plain English, no jargon. Pretend Lijo is 12.
- **Glossary** — only NEW terms not already in [`wiki/glossary.md`](../sachnetra%20v2/wiki/glossary.md).
- **State of the market RIGHT NOW (per this source)** — what does this source claim about today's market? What's the explicit "if true, then ___" read?
- **So what for SachNetra?** — Experiments to add/kill, features to build, data to capture, and a **Pursue / Park / Kill** verdict.
- **Open questions** — what to ask next session.
- **Wiki impact** — filled at the promote step (§3). Lists pages created/updated.
- **Raw transcript** — paste inline OR link to `./transcripts/YYYY-MM-DD_<slug>.txt`.

If Lijo is feeding a playlist, the agent also updates `playlists/<slug>/_index.md` with a row in the episode table + a running synthesis line.

After distillation: set `status: distilled`.

### 3. Promote to wiki (agent, when entry warrants it)

Not every video graduates. Promote ONLY if the entry introduces:
- A **concept** not yet in `wiki/concepts/` (e.g. a new statistical method, market mechanism).
- An **entity** not yet in `wiki/entities/` (a person, institution, tool, dataset).
- A **mindset** or **playbook** rule worth canonizing.

Promotion follows the existing **WIKI_SCHEMA.md ingestion protocol** — do not invent a new one:

1. Create/update the page in `wiki/concepts/` or `wiki/entities/` or `wiki/mindsets/` or `wiki/playbooks/`.
2. Use the Karpathy-style dense template from WIKI_SCHEMA.md §3.
3. Link with `[[Obsidian Wiki Links]]`, never markdown links.
4. Add a row to `wiki/index.md`.
5. Append to `wiki/log.md` with the format already used there:

```markdown
## [YYYY-MM-DD] ingest | learning/videos/<file>.md

**Operation**: Promote from learning journal
**Source**: <video title> — <presenter> — <url>
**Pages created**: wiki/concepts/<page>.md, ...
**Pages updated**: wiki/entities/<page>.md, ...
```

6. Back in the journal entry, fill the **Wiki impact** section with `[[page_name]]` links and set `status: promoted_to_wiki`.

The wiki is the **canonical knowledge base**. The learning journal is the **raw audit trail** of how knowledge got there. Both stay — never delete a journal entry after promotion.

### 4. Reflect (agent, every time — non-skippable)

After §2 (and §3 if it ran), the agent MUST close the loop by surfacing two questions to Lijo. This is *not* optional — drift in the system is the silent killer; one minute of friction-surfacing per entry compounds. Even when both answers are "no," the ask happens.

**Q1 — Entry-level**: *"Is anything in this entry wrong, missing, or worded awkwardly? Should the verdict change?"*

If yes:
- Re-distill the affected section. Do not bump the entry date in frontmatter — it's a correction, not a new ingest.

**Q2 — System-level**: *"Was anything in the template / workflow / README / glossary friction during this distillation? Anything we should change so the next entry is easier?"*

If yes, the agent edits the relevant file:
- Template friction → edit `videos/TEMPLATE.md`, `articles/TEMPLATE.md`, or `playlists/TEMPLATE_INDEX.md`.
- Workflow friction → edit this README (§3 specifically).
- A term appeared 3+ times across recent entries and isn't in the wiki glossary → add it to [`wiki/glossary.md`](../sachnetra%20v2/wiki/glossary.md) under the right section, bump that file's `Last updated`.
- Tag taxonomy drift (e.g. `india-macro` vs `indian-macro` appearing in different entries) → reconcile under one tag, list the canonical tag in the README's "Conventions" section.

All system-level changes go in the README **Changelog** at the bottom of this file. One line, dated, what changed and why.

---

## Status lifecycle

Each entry's frontmatter `status:` field walks this ladder:

| status | meaning |
|---|---|
| `raw` | Transcript pasted, template not yet filled. (Should be rare — usually distilled in the same session.) |
| `distilled` | Template fully filled. Usable as agent context. Not yet promoted to wiki. |
| `promoted_to_wiki` | Wiki pages created/updated, log entry appended. Entry's **Wiki impact** section is filled in. |

If an entry was watched but adds nothing new (everything in it already lives in the wiki), it stays `distilled` forever. That's fine — it's still a useful "I watched this, here's why I didn't need to act on it" record.

---

## Pursue / Park / Kill — how to call it

Every entry's **So what for SachNetra?** section ends with one of these three verdicts. Use the same discipline as the experiment program (see [`sachnetra_research_playbook.md`](../sachnetra%20v2/wiki/syntheses/sachnetra_research_playbook.md)):

- **Pursue** — this idea changes something in the roadmap, schema, or experiment list. Specify what, and link the V2-### task or experiment.
- **Park** — interesting, not actionable yet. State the blocker (usually data age or coverage). Will become testable when [condition].
- **Kill** — tested against current evidence and found wanting. State why, link the experiment that killed it.

A verdict of "interesting!" is not a verdict. Force one of the three.

---

## What this folder is NOT

- **Not a wiki replacement.** The wiki is canonical. This is the inbox.
- **Not a dumping ground for everything Lijo reads.** Scope is quant / markets / trading — explicitly including Indian macro, market microstructure, FII/DII, options flow, regulatory mechanics. Engineering/ML content only when it directly feeds a SachNetra experiment or collector.
- **Not a substitute for the experiment program.** Watching a video about a strategy ≠ proving it works on SachNetra data. Promote ideas to experiments via [`sachnetra_research_playbook.md`](../sachnetra%20v2/wiki/syntheses/sachnetra_research_playbook.md).

---

## Changelog

> Log structural changes to this file, the templates, or the workflow here. Driven by the Step 4 "Reflect" check. One line per change, dated.

| Date | Change | Why |
|---|---|---|
| 2026-05-26 | Initial creation — README + videos/TEMPLATE.md + articles/TEMPLATE.md + playlists/TEMPLATE_INDEX.md | Set up learning journal as raw-intake layer feeding the existing wiki ingestion protocol. |
| 2026-05-26 | Converted internal `[[wikilinks]]` to relative markdown links | Wikilinks only resolve inside the Obsidian wiki vault; learning/ is outside it. |
| 2026-05-26 | Added §3 Step 4 "Reflect" + this Changelog | Make the system self-improving — every entry surfaces friction; system updates compound. |
| 2026-05-26 | Playlist episode format: no raw transcripts stored; lead with ⏱ Worth watching? (WATCH/SKIM/SKIP); ELI12 is the main body; leaner template | Lijo doesn't have time to watch full videos — each note must be a standalone decision tool, not a transcript archive. |
