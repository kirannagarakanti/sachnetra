---
tags: [problem-solving, index, navigation]
status: LIVING — append a row per new problem-solving log
last_updated: 2026-06-10
audience: Lijo + future Claude / Gemini sessions
---

# Problem-Solving Logs — Index

Distinct from the mid-cap event-arbitrage research thread (`../_index.md`). These notes document **how a
specific engineering/strategy problem was reasoned through** — often via the multi-agent loop
(Lijo ⇄ external deep-reasoning agent ⇄ Claude Code) — so the *method and the decisions* survive, not just
the outcome.

> **⭐ Standing protocol:** [`_fresh-eyes-protocol.md`](./_fresh-eyes-protocol.md) — the institutionalized
> version of the loop that solved the ticker problem ("we can't see our own mistakes"; Lijo, 2026-06-12).
> Three roles (context-free agent proposes → Claude reality-checks → Lijo decides), a trigger checklist
> (pre-registration briefs, >1-week builds, 2 failed attempts, surprising results), the brief-stripping
> rules, and the cross-model rule. Apply it; log each use as a new note in this folder.

| Date | Note | Problem | Status |
|------|------|---------|--------|
| 2026-06-10 | [`2026-06-10_news-ticker-tagging-gate-and-goldset.md`](./2026-06-10_news-ticker-tagging-gate-and-goldset.md) | News→ticker tagging recall/precision; landed on a **gate + tagger** two-stage design, heuristic-first, judged by a hand-labelled **gold set** | DESIGN COMPLETE — gold-set labelling pending |
