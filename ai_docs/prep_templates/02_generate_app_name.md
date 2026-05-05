# Prep Template 02 — Generate App Name

> Use this to generate `prep/app_name.md` for a new project.
> Run after the master idea is finalised.

---

## Instructions for Claude

**PROMPT:**

I have a new app and I need help choosing the right name. I'll share the master idea — please generate name options.

Here is my master idea:
[PASTE content of prep/01_master_idea.md here]

Now generate 10 name candidates. For each, provide:
- The name
- Pronunciation (for non-English or compound words)
- What it means / why it fits
- Domain availability note: is [name].com / [name].in / [name].app likely available? (estimate)
- Any risks: hard to spell, cultural sensitivity, trademark overlap

Filter by these criteria:
- Easy to say in Hindi/Telugu/English (for an Indian audience)
- Memorable after one hearing
- Works as a URL (no hyphens, < 12 chars ideal)
- Evokes the core value (not generic like "newsapp" or "readly")

After the 10 candidates, suggest your top 3 with reasoning.

Then help me make the final decision by asking:
1. Which of the 3 feels most "you"?
2. Does the name need to work in Hindi as well as English?
3. Is there any word or concept you want the name to evoke?

**Output format:**

```
## App Name Decision

**Final name:** [Name]
**Pronunciation:** [How to say it]
**Meaning:** [Why it fits]
**Domain:** [.com / .in / .app checked]
**Tagline options:**
  1. [Tagline 1]
  2. [Tagline 2]
  3. [Tagline 3]

**Rejected candidates:**
  [Name 1] — [reason rejected]
  [Name 2] — [reason rejected]
  ...
```

Save output to: `ai_docs/prep/app_name.md`

---

## SachNetra Reference

"SachNetra" = Sach (सच, truth) + Netra (नेत्र, eye) = "Eye of Truth" / "See Clearly"
Tagline: "See clearly / सच्चनेत्र"
Domain: sachnetra.com ✓
