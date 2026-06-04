# /research — Deep Research (web + files + iterate)

Problem-driven research across codebase, wiki, git repos, papers, blogs, and **live web**. You may **search, fetch, improvise, and write files** without asking permission for each step.

**Full template:** `ai_docs/dev_templates/research.md`
**Protocol (source of truth):** `ai_docs/learning/RESEARCH_INSTRUCTIONS.md`

---

## How to invoke

```
/research [the problem or feature to investigate]

Examples:
  /research how to raise G1 news→ticker recall on mid/small-cap earnings
  /research best way to detect duplicate wire stories across RSS feeds
  /research is there a proven volatility-scaling tweak for cross-sectional momentum
  /research what data sources expose NSE block-deal data intraday
```

Optional follow-ups in the same session (iterate on the same note):
```
Continue /research — verify the PEAD numbers against the SCIRP HTML mirror
Continue /research — add a GitHub repo candidate and re-run the gate
```

---

## Autonomy (do this without pausing for approval)

| Capability | What to do |
|------------|------------|
| **WebSearch** | Find papers, repos, blogs, regulatory news. Run many queries; refine queries as you learn. |
| **WebFetch** | Fetch abstracts, open-access HTML/PDF, READMEs. If one domain 403s, search for a mirror (arXiv, SCIRP, journal HTML). Do not declare the tool "broken" from one failed URL. |
| **Codebase** | Grep/Glob/Read before claiming we lack something. |
| **Scratch** | `git clone` into `scratch/` for repo inspection (ephemeral — quote lines inline in the note). |
| **Create files** | Write the problem-research note to `ai_docs/learning/research-notes/YYYY-MM-DD_<slug>.md` as you go; update the same file when new evidence changes the verdict. |
| **Improvise** | If the first search path is weak, pivot source types (paper → blog → repo). If verdict is Park, say what experiment would un-Park it. |

**Do not** edit sacred files, run prod migrations, or fabricate citations/stats. See hard rules in `RESEARCH_INSTRUCTIONS.md`.

---

## What happens

1. Load protocol + `learning/README.md` + `research_state_summary.md`
2. Frame the problem (Phase 0) — evidence-backed current state
3. Search broadly (Phase 1) — **use WebSearch + WebFetch actively**
4. Evaluate candidates — mandatory "might NOT work" column (Phase 2)
5. Gate-checked verdict → Pursue / Park / Kill (Phase 3)
6. **Save** problem-research note (or article/repo template if one source) + reflect uncertainties to Lijo (Phase 4)

See `ai_docs/dev_templates/research.md` for step-by-step detail.
