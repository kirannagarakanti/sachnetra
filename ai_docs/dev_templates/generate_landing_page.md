# Landing Page Generator — SachNetra

> V2-001: Build the public marketing page at sachnetra.com/
> The app moves to sachnetra.com/app — the root becomes a conversion page.

---

## Context

SachNetra currently loads the full app at `sachnetra.com/`. For V2, the root should be a landing page that:
- Explains what SachNetra is to someone who's never seen it
- Speaks to the Hyderabad / India professional audience
- Converts visitors to users (tap → open app)
- Works perfectly on mobile (most Indian users are mobile-first)

The existing blog-site lives at `sachnetra.com/blog` (static, built from `blog-site/`).
The landing page will replace the current app at root.

---

## Step 1: Define the Page Before Writing a Line of Code

Answer these first. Do not skip.

**Target user:**
Who is the person landing on sachnetra.com from a WhatsApp link or Instagram story?
- Age range?
- City (Hyderabad-specific positioning or all India)?
- How do they currently get news? (Times of India app? TV? Twitter?)
- What's their pain: too much noise? regional news is missing? AI summaries?

**One sentence pitch:**
Complete this: "SachNetra is the only news app that ___________"
(This becomes the hero headline)

**3 core benefits:**
What are the 3 things users will see first that make them say "I need this"?
(These become the Features section)

**Social proof available?**
- Number of users?
- City coverage count?
- Feed count (64 sources)?
- Launch date?

**CTA action:**
What do you want visitors to do?
- Open the app directly?
- Join a waitlist?
- Download mobile app?

---

## Step 2: Page Structure

Build these sections in order. Each is a separate task step.

```
[1] HERO
    Headline (1 bold sentence — the pitch)
    Sub-headline (2 sentences — who it's for, what it does)
    CTA button (Open App / Start Reading)
    Hero image or mock (sachnetra app screenshot on phone)

[2] PROBLEM
    "You're tired of..." (2–3 bullets)
    "You want..." (2–3 bullets)
    Emotionally resonant — this is where the user says "yes, that's me"

[3] FEATURES
    3 cards with icons:
    → "India's biggest stories, understood" (AI summaries)
    → "Your state, your news" (state filtering)
    → "What happened + what it means" (two-summary format)

[4] HOW IT WORKS
    3 steps — simple, visual:
    1. Open SachNetra
    2. Pick your state
    3. Read what matters

[5] SOCIAL PROOF / NUMBERS
    64 news sources · 36 states covered · Updated every 15 minutes
    (Or user testimonials if available)

[6] CTA (repeat)
    Full-width dark section
    "Start reading smarter news — free."
    Button → app

[7] FOOTER
    sachnetra.com · About · Privacy · Credits (WorldMonitor, MIT)
    "Built in Hyderabad 🇮🇳"
```

---

## Step 3: Technical Implementation

### File location
The landing page should be a standalone HTML file served by Vercel.
It should NOT be a Vite/Preact component (the app bundle is too heavy for a landing page).

```
Option A: Static HTML at public/index.html (replace current app root)
          App moves to sachnetra.com/app (new Vite entry point)

Option B: Separate Vercel route in vercel.json:
          "/" → landing.html
          "/app" → index.html (current app)

Recommended: Option B — cleanest separation, no app bundle loaded on landing page.
```

### Design system (match the app)
```css
/* Use same brand tokens as the app */
:root {
  --sn-purple: #7b7bff;
  --sn-saffron: #FF9933;
  --sn-bg: #0a0812;
  --sn-text: rgba(255, 255, 255, 0.87);
  --sn-muted: rgba(255, 255, 255, 0.45);
  --sn-border: rgba(255, 255, 255, 0.08);
}

body {
  background: var(--sn-bg);
  color: var(--sn-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### Mobile-first
Start at 375px. Desktop is enhancement.
```css
/* Base: mobile */
.hero-title { font-size: 28px; line-height: 1.2; }

/* Desktop */
@media (min-width: 769px) {
  .hero-title { font-size: 48px; }
}
```

### Performance requirements
```
No frameworks on the landing page (no Vite, no Preact)
No external fonts (use system font stack)
Images: WebP, compressed, < 200KB each
First Contentful Paint: < 1.5s on 4G mobile
```

---

## Step 4: Generate the Page

Present the full HTML file for review before saving.

Include:
- [ ] All 7 sections above
- [ ] Mobile-first CSS (inline `<style>` tag — single file)
- [ ] No external dependencies
- [ ] `public/sachnetra-logo.svg` used for logo
- [ ] App store links if native app available, otherwise "Open Web App" CTA
- [ ] OG meta tags for WhatsApp/Twitter share previews
- [ ] Performance: lazy-load any images below the fold

---

## Step 5: Wire into Vercel

Update `vercel.json` to route correctly:
```json
{
  "rewrites": [
    { "source": "/app", "destination": "/index.html" },
    { "source": "/app/(.*)", "destination": "/index.html" },
    { "source": "/", "destination": "/landing.html" }
  ]
}
```

Update `middleware.ts` to handle OG metadata for landing page routes.

---

## Step 6: Review Checklist

- [ ] Hero headline is specific — not generic ("Real-time news platform" ❌ → "Know what's happening in Maharashtra before your morning chai" ✅)
- [ ] CTA is above the fold on mobile (375px)
- [ ] Page loads in < 2s on 4G (check with Lighthouse)
- [ ] OG image set (1200×630px) for link previews
- [ ] sachnetra.com/app still opens the app correctly
- [ ] No WorldMonitor branding visible
- [ ] Privacy policy link present (required for app)

---

## Copy Guidelines

**Do:**
- Write in second person ("You get India's news...")
- Use concrete numbers (64 sources, 36 states)
- Reference Hyderabad / specific Indian context
- Keep sentences short (< 15 words ideal for mobile)

**Don't:**
- Generic tech startup language ("leverage AI-powered insights")
- Passive voice ("News is delivered to you")
- Jargon ("real-time data aggregation")
- More than 3 bullets in any section on mobile
