# Prep Template 05 — Generate App Pages & Functionality

> Use this to generate `prep/app_pages_and_functionality.md` for a new project.
> Run after master idea and UI theme are finalised.

---

## Instructions for Claude

**PROMPT:**

I'm mapping out all the pages and functionality for my app. Help me be exhaustive and structured.

Here is my master idea:
[PASTE content of prep/01_master_idea.md here]

UI Theme: [Primary colour, dark/light mode, mobile/desktop]

For each page in the app, define:

### Page structure
For every page/screen:
```
Page name: [Name]
Route: /path
Who sees it: [All users / Logged-in only / Admin only]
Purpose: [One sentence — what is this page for?]

Components on this page:
  - [Component 1]: [what it shows / does]
  - [Component 2]: [what it shows / does]

User actions:
  - [Action 1]: [what happens when they do it]
  - [Action 2]: [what happens when they do it]

Data needed:
  - [Data source 1]: [where it comes from, how often it updates]

Empty state: [What shows when there's no data?]
Loading state: [What shows while data loads?]
Error state: [What shows if data fails?]
```

### Pages to cover (at minimum):
1. Landing / Home page
2. Main app view (the core feature)
3. Detail / expanded view
4. Settings / preferences (if applicable)
5. Onboarding (if any)
6. Error pages (404, 500)

### Navigation structure
- Bottom nav (mobile) or sidebar (desktop)?
- Tab labels and icons
- Active state behaviour
- Deep link behaviour (what URL opens which view?)

### Interactions inventory
List all interactive elements across the whole app:
- Buttons (what they do)
- Gestures (swipe, tap, long-press)
- Form inputs (if any)
- Filters / selectors
- Share actions

**Output format:**
Save to `ai_docs/prep/app_pages_and_functionality.md`
One section per page, then a Navigation section, then Interactions inventory.

---

## SachNetra Reference

SachNetra pages:
- `/` → Home (story feed, state selector, Today's Brief)
- `/timeline` → Timeline river (chronological, category filter chips)
- `/map` → India map (state outlines, earthquake layer, boundary overlay)
- `/states` → State selector grid (36 states + UTs)
- `/story?id=<slug>` → Story detail overlay (What Happened + What This Means)

Navigation: Bottom nav (4 tabs: Home · Timeline · Map · States) on mobile
Desktop: Two-column layout (timeline river + 320px sidebar with Today's Brief)
