# Prep Template 04 — Logo Generation (ChatGPT / DALL-E)

> Use this to generate logo concepts for a new project.
> Run after ui_theme is finalised. Use ChatGPT with DALL-E image generation.

---

## When to Use

When you need a logo for a new project. This template generates both:
1. An AI-generated image reference (for inspiration / client presentation)
2. A brief for a human designer (or for SVG manual creation)

SachNetra's logo was created as an SVG by Claude — use that as the model for custom SVGs.

---

## Part A: AI Image Generation (ChatGPT DALL-E Prompt)

Paste this into ChatGPT:

**PROMPT:**

Create a minimalist logo for an app called "[App Name]".

Brand values: [e.g., truth, clarity, intelligence, India]
Colour palette: [Primary colour] on [background colour]
Style: Minimal, modern, works at 32×32px (favicon size) and 512×512px
Format: Single icon/mark, no text (the wordmark is separate)

Concept: [Describe the metaphor you want — e.g., "a diya lamp combined with an eye" for SachNetra]

Generate 4 variations:
1. [Concept A — most literal]
2. [Concept B — more abstract]
3. [Concept C — geometric]
4. [Concept D — unexpected/creative]

Each should work as:
- A white icon on dark background
- A dark icon on white background
- Scalable from 16px to 512px

---

## Part B: SVG Creation (Claude Prompt)

Once you've chosen a concept from the images, ask Claude to create the actual SVG:

**PROMPT:**

Create an SVG logo for "[App Name]" based on this concept: [describe the chosen concept]

Requirements:
- viewBox="0 0 64 64" (square, scalable)
- Pure SVG — no external images, no fonts
- Colour: [Primary colour hex] for the mark, transparent background
- Works at 16px (favicon) and 512px (app icon)
- Semantic SVG: proper paths, no unnecessary complexity
- Include a <title> element for accessibility

The logo represents: [what it should evoke — e.g., truth + vision for SachNetra]

Generate the complete SVG code.

Then also generate:
- A favicon version (32×32 simplified)
- A loading screen version with a subtle animation (CSS animation on the SVG)

---

## Part C: Wordmark

For the app name as styled text:

**PROMPT:**

I need a wordmark for "[App Name]".

Font: [Font name — must be available on Google Fonts or system]
Style: [Weight, letter-spacing, any special treatment]
Colour: [Hex]

Generate an SVG wordmark using embedded font path data (not font-family, as that requires loading).
OR: Generate the CSS for a styled text wordmark:

```css
.sn-wordmark {
  font-family: [font];
  font-weight: [weight];
  letter-spacing: [spacing];
  color: [colour];
}
```

---

## Output Files

After generation, save to:
```
public/[appname]-logo.svg          ← main SVG mark
public/favicon.ico                  ← converted from SVG
public/favicon-32x32.png           ← PNG at 32px (for older browsers)
public/apple-touch-icon.png        ← 180×180 for iOS
```

Update `index.html`:
```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/[appname]-logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

---

## SachNetra Reference

Logo: Diya lamp combined with an eye mark — "Eye of Truth"
File: `public/sachnetra-logo.svg`
Created as pure SVG by Claude (no DALL-E needed for final — concept from DALL-E, execution by Claude)

```svg
<!-- Simplified concept: -->
<svg viewBox="0 0 64 64">
  <!-- Diya base (flame holder) -->
  <!-- Eye iris in the flame -->
  <!-- Purple gradient: #7b7bff → #5f5fff -->
</svg>
```
