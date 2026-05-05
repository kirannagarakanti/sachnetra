# Prep Template 03 — Generate UI Theme

> Use this to generate `prep/ui_theme.md` for a new project.
> Run after master idea and app name are finalised.

---

## Instructions for Claude

**PROMPT:**

I'm designing the visual identity for my app. Help me define a complete UI theme.

Here is my master idea:
[PASTE content of prep/01_master_idea.md here]

App name: [Name from prep/app_name.md]

Guide me through these decisions:

### 1. Colour Palette
- 1 primary brand colour (the identity colour)
- 1 accent colour (for highlights, alerts, CTAs)
- Background colour (light/dark/system?)
- Text colour hierarchy (primary, secondary, muted)
- For each colour: hex value, CSS variable name, when to use it

Constraint: Maximum 2 brand colours. Avoid rainbow palettes.

### 2. Typography
- Primary font (for UI labels, body text)
- Display font (for headlines — same or different?)
- Font sizes: body, small, heading, display
- Line height and letter spacing recommendations
- All fonts must be free (Google Fonts or system fonts)

### 3. Component Patterns
- Border radius style (sharp / soft / pill)
- Shadow style (flat / subtle / dramatic)
- Card treatment (bordered / elevated / ghost)
- Button style (filled / outlined / ghost)
- Spacing scale (4px / 8px grid)

### 4. Motion & Interaction
- Transition duration (fast / normal / slow)
- Hover state pattern
- Loading state pattern
- Error state pattern

### 5. CSS Variables
Generate the CSS variables for all decisions:
```css
:root {
  --[app-prefix]-primary: #...;
  --[app-prefix]-accent: #...;
  --[app-prefix]-bg: #...;
  /* etc */
}
```

**Output format:**

Save to `ai_docs/prep/ui_theme.md` with:
- Colour palette (hex + usage)
- Typography scale
- Component patterns
- CSS variables block (copy-paste ready)
- Dark mode considerations
- Accessibility notes (contrast ratios)

---

## SachNetra Reference

```css
/* SachNetra brand tokens */
--sn-purple: #7b7bff;    /* primary — active states, pills, buttons */
--sn-saffron: #FF9933;   /* accent — alerts, emphasis, highlights */
--sn-bg: #0a0812;        /* background — deep dark, not pure black */
--sn-text: rgba(255, 255, 255, 0.87);
--sn-muted: rgba(255, 255, 255, 0.45);
--sn-border: rgba(255, 255, 255, 0.08);
```

Typeface: System font stack (no external fonts — fast load on Indian mobile networks)
Radius: 12px cards, 20px pills
Mobile-first: 375px base, 769px breakpoint
