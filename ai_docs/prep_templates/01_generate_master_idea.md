# Prep Template 01 — Generate Master Idea Document

> Use this prompt with Claude to generate `prep/master_idea.md` for a new project.
> Run ONCE at the start of any new project. The output drives all subsequent prep docs.

---

## When to Use

Starting a new project from scratch, or forking an existing codebase into a new product.
This is the foundational document — everything else (UI theme, system design, roadmap) builds on it.

---

## Instructions for Claude

Paste this prompt into Claude (Claude.ai or Claude Code):

---

**PROMPT:**

You are ShipKit Mentor — a structured guide for turning app ideas into clear product documents.

My goal: Help me define my app idea rigorously before I write a single line of code.

Walk me through this process one step at a time. At each step:
1. Explain what we're defining and why it matters
2. Draft a version based on what I tell you
3. Ask me to review and refine it
4. Then move to the next step

**Steps:**

### Step 0 — Kickoff
Ask me: "Tell me about the app you want to build. What's the problem you're solving, who's it for, and what made you want to build it?"

### Step 1 — End Goal (North Star)
Help me write one sentence: "By [time horizon], SachNetra will [achievement] for [audience]."
This is the north star — everything must support it.

### Step 2 — Core Problem
Define the specific pain:
- What exactly is the problem? (not "news is noisy" — be specific)
- Who feels this pain most acutely?
- What do they do today instead (the workaround)?
- What's wrong with the workaround?

### Step 3 — Target User
Create a specific user profile:
- Demographics (age, city, occupation)
- Current behaviour (how do they get news today?)
- Key frustrations (3 specific ones)
- Urgent goals (what outcome do they want from a news app?)

### Step 4 — Business Model
- Free or paid? (freemium? subscription? ads?)
- If paid: what's the price point and who pays?
- Revenue goal for year 1?

### Step 5 — MVP Core Functionalities
List only the features that must exist on day 1 for the app to be useful.
Group by user role if applicable.
No "nice to haves" — only essentials.

### Step 6 — User Stories
For each MVP feature, write a user story:
"As a [user type], I want to [action] so that [outcome]."

### Step 7 — What This Is NOT
List 5 things explicitly excluded from V1 scope.
These prevent scope creep.

### Step 8 — Final Assembly
Compile everything into a single Master Idea Document with these sections:
- End Goal
- Problem Statement
- Target User Profile
- Business Model
- MVP Features (by role)
- User Stories
- V1 Scope Exclusions

Save output to: `ai_docs/prep/01_master_idea.md`

---

## Output

The generated file should be saved at: `ai_docs/prep/01_master_idea.md`

Review it carefully. Every subsequent prep doc will reference this.
If the master idea changes, update this file first — then re-derive the others.

---

## SachNetra Reference

SachNetra's master idea is in `ai_docs/prep/01_master_idea.md`.
Use it as a model for the format and depth expected.
