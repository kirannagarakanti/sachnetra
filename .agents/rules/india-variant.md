# India Variant — Technical Constants

## Brand Colors

```css
--sn-purple:        #7b7bff   /* Primary brand — modern, tech, calm */
--sn-saffron:       #FF9933   /* Indian identity, warmth */
--sn-dark-bg:       #0a0812   /* Deep dark background — AMOLED safe */
--sn-deep-bg:       #0d0a1f
--sn-card-bg:       #100e24
--sn-border:        #1e1c3a
--sn-text-primary:  #e8e0ff
--sn-text-muted:    #4a4870
--sn-green:         #22c55e   /* "What this means" card border */
```

Logo gradient: purple (`#7b7bff`) → saffron (`#FF9933`)  
Wordmark: solid white (NOT gradient — gradient on wordmark hurts legibility)

## Map Default Center & Zoom

```typescript
export const INDIA_MAP_VIEW = {
  name: 'india',
  center: [78.9629, 20.5937],  // Geographic center of India
  zoom: 4,                      // Shows full India comfortably
  bearing: 0,
  pitch: 0,
};
```

Flat map only on mobile. Never 3D globe for india variant.  
Map is a secondary tab, not the hero feature.

## AI Output Format — Two-Summary JSON

Groq/OpenRouter must return this exact JSON structure:
```json
{
  "summary": "What happened — 2-3 sentences, factual, plain language, no alarm words",
  "meaning": "What this means — 1-2 sentences, practical impact for ordinary Indian person"
}
```

- `"What happened"` card: purple left border
- `"What this means"` card: green left border
- If `meaning` is empty string (T5 fallback): green card hidden
- Temperature: `0` (critical — prevents malformed JSON)
- Model: `llama-3.1-8b-instant` (Groq primary)

## Redis Cache Version

```javascript
const CACHE_VERSION = 'v4'; // Bump from v3 — new two-summary format
const cacheKey = `summary:v4:india:${headlineHash}:${geoHash}`;
```

**Important**: Must be `v4` not `v3`. Old single-summary cached values must not be served.

## Hostname Detection Pattern

In `src/App.ts`, add:
```typescript
if (hostname.includes('sachnetra')) return 'india';
if (import.meta.env.VITE_VARIANT === 'india') return 'india';
```

For local dev: set `VITE_VARIANT=india` in `.env.local`

## CORS Patterns (Both Files Required)

**`api/_cors.js`**:
```javascript
/^https?:\/\/(.*\.)?sachnetra\.com$/,
/^https?:\/\/sachnetra-.*\.vercel\.app$/,
```

**`server/cors.ts`**: same patterns.

Miss either file and requests fail.

## Kashmir Boundary — MANDATORY COMPLIANCE

⚠️ **India's IT Rules require SoI (Survey of India) official boundary.**

OpenFreeMap alone shows incorrect Kashmir boundary. Must use:

1. **Datameet GeoJSON overlay** — `https://github.com/datameet/maps` → `States.geojson`
2. Upload to R2: `maps.sachnetra.com/india-states-official.geojson`
3. This overlay MUST always load for the india variant — it corrects the Kashmir boundary

```typescript
export const INDIA_BOUNDARY_OVERLAY = 'https://maps.sachnetra.com/india-states-official.geojson';
// This overlay must always be loaded for the india variant
```

Do NOT use OSM/OpenFreeMap default boundaries alone for India.

---

## V2 Environment Variables

New variables introduced in V2-001. Add to `.env.local` and Railway dashboard:

| Variable | Purpose | Where |
|----------|---------|-------|
| `DATABASE_URL` | Railway PostgreSQL connection string (with `?sslmode=require`) | Railway + `.env.local` |
| `HF_API_TOKEN` | HuggingFace Inference API key (FinBERT sentiment scoring) | Railway + `.env.local` |
| `UPSTASH_REDIS_REST_URL` | Already exists — copy from Vercel env to Railway | Already configured |
| `UPSTASH_REDIS_REST_TOKEN` | Already exists — copy from Vercel env to Railway | Already configured |

`DATABASE_URL` format for Railway PostgreSQL:
```
postgresql://postgres:<password>@<host>.railway.app:5432/railway?sslmode=require
```

FinBERT endpoint (HuggingFace free tier):
```
POST https://api-inference.huggingface.co/models/ProsusAI/finbert
Authorization: Bearer <HF_API_TOKEN>
Body: { "inputs": "<headline text>" }
Response: [{ "label": "positive"|"negative"|"neutral", "score": 0.0–1.0 }]
```

Sentiment score conversion:
- `positive` → `+score`
- `negative` → `-score`
- `neutral` → `0.0`
