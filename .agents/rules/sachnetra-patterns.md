# SachNetra — Coding Patterns

## Variant Config Pattern

The SachNetra front end is **`src/config/variants/india.ts`** — already built, and the only deployed
variant. The old WorldMonitor variants (`tech.ts`/`full.ts`/`finance.ts`/`commodity.ts`/`happy.ts`) are
being removed — Workstream B in
`ai_docs/update-workflow/2026-06-11_claude-md-refresh-and-worldmonitor-cleanup.md` — so do **not** model new
work after them.

`india.ts` is **self-contained**: it defines its own `FEEDS` inline, wraps URLs with `rssProxyUrl`, and only
imports what a standalone variant needs (it does NOT re-export WorldMonitor's geopolitical layer — military
bases, irradiators, pipelines, etc. — the way `full.ts` did).

The india variant file structure:
```typescript
// src/config/variants/india.ts
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';
export * from './base';

import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';
const rss = rssProxyUrl;

export const FEEDS: Record<string, Feed[]> = { ... };
export const DEFAULT_PANELS: Record<string, PanelConfig> = { ... };
export const DEFAULT_MAP_LAYERS: MapLayers = { ... };
export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = { ... };
export const VARIANT_CONFIG: VariantConfig = {
  name: 'india',
  description: 'SachNetra — Indian news clarity tool',
  panels: DEFAULT_PANELS,
  mapLayers: DEFAULT_MAP_LAYERS,
  mobileMapLayers: MOBILE_DEFAULT_MAP_LAYERS,
};
```

## Feed Config Pattern

**Interface location**: `src/config/feeds.ts` — `Feed` type imported from `@/types`

Feed objects use `rssProxyUrl()` wrapper (aliased as `rss`):
```typescript
{ name: 'NDTV', url: rss('https://feeds.feedburner.com/ndtvnews-top-stories') }
```

**Note**: Feed entries use only fields from the `Feed` interface in `src/types/index.ts`: `name`, `url`, `region`, `propagandaRisk` (`'low'|'medium'|'high'`), `stateAffiliated` (country name string), `lang`. Category is the Record key (e.g., `politics: [...]`). Tier is stored in the `SOURCE_TIERS` map in `src/config/feeds.ts`, not on the Feed object.

## CSS Variable Naming Convention

Always use `--sn-*` prefix for SachNetra brand variables. Never hardcode hex values:

```css
--sn-purple: #7b7bff;
--sn-saffron: #FF9933;
--sn-dark-bg: #0a0812;
--sn-deep-bg: #0d0a1f;
--sn-card-bg: #100e24;
--sn-border: #1e1c3a;
--sn-text-primary: #e8e0ff;
--sn-text-secondary: #9090c0;
--sn-text-muted: #4a4870;
--sn-green: #22c55e;
```

## Verification Commands (Run After Every Change)

```bash
npm run typecheck   # Must show: 0 errors ✅
```

**Forbidden for Claude (a human — Lijo/James — runs these)**:
```bash
npm run build   ❌
npm run dev     ❌
```

## One-Task-At-A-Time Rule

Never combine two tasks into one session. Complete Phase 1 fully before Phase 2. Mark each `[x]` with timestamp. Do not move to the next task until all verification checks pass.

## TypeScript Code Quality

- Strict TypeScript — no `any` unless the existing codebase uses it in that context
- Early returns over nested if/else
- `async/await` not `.then()` chains
- Comments explain WHY not WHAT
- No commented-out code — delete completely
- Mobile-first CSS — 375px base width
- Touch targets minimum 44px height

---

## Railway Cron Pattern (V2)

V2 introduces Railway cron scripts that run independently of user activity.
The V2 intelligence entry point is `scripts/seed-india-signals.mjs`.

### runSeed() Shape — Follow Exactly

Every seed script in `scripts/` uses this shape. Model after `scripts/seed-insights.mjs` (line 326):

```javascript
#!/usr/bin/env node
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);   // MUST be first — loads .env.local

const CANONICAL_KEY = 'news:signals:v1:india';   // Redis status key written by runSeed
const CACHE_TTL = 1800;                            // 30 min

async function fetchSignals() {
  // All business logic lives here:
  // 1. Read news:digest:v1:india:en from Redis via getRedisCredentials()
  // 2. Filter is_market_moving via keyword match
  // 3. scoreSentiment() → chain (_sentiment-chain.mjs): HF FinBERT → Xenova FinBERT → Groq llama-3.1-8b-instant
  // 4. extractCompanies() + detectSectors() via keyword rules
  // 5. INSERT to PostgreSQL (ON CONFLICT DO NOTHING)
  // 6. Return summary object — runSeed writes this to CANONICAL_KEY in Redis
}

function validate(data) {
  return typeof data === 'object' && data !== null;
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);   // Railway cron must always exit 0
});
```

### runSeed() contract (from `scripts/_seed-utils.mjs`):
- Acquires a distributed lock (`seed-lock:india:signals`) — prevents overlapping cron runs
- Calls `fetchFn()` with retry (3 attempts, exponential backoff)
- Atomically publishes return value to Redis at `CANONICAL_KEY`
- Writes `seed-meta:india:signals` freshness metadata (health monitoring)
- Releases lock and exits
- On fetch failure: extends existing Redis key TTL (graceful degradation), exits 0

### Redis key conventions for India signals:
```
news:digest:v1:india:en    ← READ (already populated by server digest every 15 min)
news:signals:v1:india      ← WRITE (status/summary written by runSeed)
seed-meta:india:signals    ← WRITE (freshness metadata, auto-written by runSeed)
```

### Never modify `scripts/seed-insights.mjs` for V2 work.
`seed-insights.mjs` is sacred. Create `scripts/seed-india-signals.mjs` as a sibling.
