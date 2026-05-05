# Prep Template 06 — Generate Wireframe

> Use this to generate `prep/wireframe.md` for a new project.
> Run after app_pages_and_functionality is finalised.

---

## Instructions for Claude

**PROMPT:**

I need wireframes for my app. Generate ASCII wireframes for each key screen.
These are low-fidelity — boxes and labels, no design polish. Focus on layout and information hierarchy.

Here is my app pages doc:
[PASTE content of prep/app_pages_and_functionality.md here]

For each key screen, generate:

1. **Mobile wireframe** (375px — 40 chars wide in ASCII)
2. **Desktop wireframe** (1280px — 80 chars wide in ASCII, if the app has a desktop layout)

### Wireframe format:
```
┌────────────────────────────────────────┐
│ [HEADER / STATUS BAR]                  │
├────────────────────────────────────────┤
│                                        │
│  [MAIN CONTENT AREA]                   │
│  ┌──────────────────────────────────┐  │
│  │ [CARD 1]                         │  │
│  │ Title text                       │  │
│  │ Subtitle · Time                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ [CARD 2]                         │  │
│  └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│ [NAV] Home  Timeline  Map  States      │
└────────────────────────────────────────┘
```

### Annotate each wireframe with:
- Component names (matching prep/app_pages_and_functionality.md)
- Data that populates each area
- Touch target sizes for key interactive elements
- Scroll behaviour (which sections scroll, which are fixed)

### Screens to wireframe:
1. Home / main feed
2. Detail view (expanded story / item)
3. Filter / selector overlay
4. Settings panel (if applicable)
5. Desktop layout (if applicable)
6. Empty state (no data)
7. Loading skeleton

**Output format:**
Save to `ai_docs/prep/wireframe.md`
One section per screen. Include annotations below each wireframe.

---

## SachNetra Wireframe Reference

```
Mobile home screen (375px):
┌────────────────────────────────────────┐
│ ☀️ Good morning · Maharashtra           │  ← Time-aware greeting + selected state
│ SachNetra                [⚙]           │  ← Logo + settings (hidden in prod)
├────────────────────────────────────────┤
│ TODAY'S BRIEF                          │  ← AI-generated summary block
│ [Summary paragraph 2–3 sentences]      │
├────────────────────────────────────────┤
│ [🔴 Conflict] [📈 Economy] [All ▸]     │  ← Category filter chips
├────────────────────────────────────────┤
│ ┌──────────────────────────────────┐   │
│ │ [🗺 icon]  Breaking: Budget...   │   │  ← Story card
│ │ Economy · 3 sources · 2h ago    │   │
│ └──────────────────────────────────┘   │
│ ┌──────────────────────────────────┐   │
│ │ [⚡ icon]  Parliament session... │   │
│ │ Govt · 1 source · 5h ago        │   │
│ └──────────────────────────────────┘   │
│                                        │
│ [SCROLL: more story cards...]          │
├────────────────────────────────────────┤
│   🏠 Home   📅 Timeline  🗺 Map  🌏 States│  ← Bottom nav (44px touch targets)
└────────────────────────────────────────┘
```

This is the model. Generate equivalent ASCII wireframes for all screens.
