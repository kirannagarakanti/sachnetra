# Prep Template 08 — Generate System Architecture

> Use this to generate `prep/system_architecture.md` for a new project.
> Run after data models are finalised.

---

## Instructions for Claude

**PROMPT:**

I need to design the technical architecture for my app. Help me make good decisions before writing any code.

Here is my master idea:
[PASTE content of prep/01_master_idea.md here]

Here are my data models:
[PASTE content of prep/initial_data_schema.md here]

Guide me through these architectural decisions:

### 1. Frontend Framework
- Recommend a framework for my use case (and explain why)
- Options: React / Preact / Next.js / vanilla JS / Vue / Svelte
- Consider: team size, performance requirements, SEO needs, deployment target

### 2. Backend / API Layer
- Serverless (Vercel Edge Functions) vs server (Railway/Fly.io)?
- Language: TypeScript / Python / Go?
- REST vs GraphQL vs RPC?
- Consider: cold start tolerance, data freshness requirements, cost at scale

### 3. Database / Storage
- What type of data store? (SQL / NoSQL / time-series / vector)
- For caching: Redis / Upstash / in-memory?
- For user data: Supabase / Convex / PlanetScale?
- For files: S3 / Cloudflare R2 / Vercel Blob?

### 4. Authentication (if needed)
- Required or not for V1?
- If yes: Clerk / Supabase Auth / NextAuth / custom JWT?

### 5. AI Integration
- Which LLM provider? (Groq / OpenRouter / OpenAI / Anthropic)
- Prompt strategy (single call / chain / streaming)?
- Caching strategy for AI responses?

### 6. Deployment
- Frontend: Vercel / Netlify / Cloudflare Pages?
- Backend: Railway / Fly.io / Cloud Run?
- Domain and CDN?

### 7. External Data Sources
- List all third-party APIs used
- Rate limits and costs for each
- Fallback strategy if a source goes down

### 8. V1 Scope Boundary
- Features explicitly NOT in V1 (prevent scope creep)
- Document as: "V1 will NOT include: [list]"

**Output format:**
Save to `ai_docs/prep/system_architecture.md` with:
- Architecture diagram (ASCII or Mermaid)
- Technology decisions with reasoning
- V1 scope boundary section
- CLAUDE.md Update section (what Claude should know about this architecture)

---

## SachNetra Reference

**Architecture:**
```
Browser (Preact SPA, Vite)
  ↓ fetch /api/news/v1/list-feed-digest?variant=india
Vercel Edge Functions (plain JS, no TypeScript)
  ↓ cache hit → Upstash Redis (TTL 15min)
  ↓ cache miss → 64 RSS feeds + Groq summarisation
Railway (AIS relay, Docker container)
  ↓ AIS vessel data → WebSocket → browser
Convex (planned for V2 — user data, brief subscriptions)
```

**Key decisions made for SachNetra:**
- Preact over React (2KB runtime, same API)
- Edge Functions over server (no cold starts, global CDN)
- Upstash Redis for caching (serverless-compatible)
- Groq for AI (fast inference, cost-effective)
- Vercel for deployment (zero-config, automatic HTTPS)
- No database in V1 (stateless — all data is ephemeral news)
