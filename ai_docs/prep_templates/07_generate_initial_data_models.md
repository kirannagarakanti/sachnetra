# Prep Template 07 — Generate Initial Data Models

> Use this to generate `prep/initial_data_schema.md` for a new project.
> Run after master idea and app pages are finalised.

---

## Instructions for Claude

**PROMPT:**

I need to define the data models for my app. Help me design them correctly before writing any code.

Here is my master idea:
[PASTE content of prep/01_master_idea.md here]

Here are my app pages:
[PASTE content of prep/app_pages_and_functionality.md here]

For each major data entity in the app, define:

### Entity definition format:
```
Entity: [EntityName]

Fields:
  id:           string (UUID)        — unique identifier
  [field]:      [type]               — [description, constraints]
  [field]:      [type]               — [description, constraints]

Relationships:
  - belongs to [Entity] (via [field])
  - has many [Entity] (via [EntityName].parentId)

Storage:
  - Where does this live? (Convex / Redis / Supabase / localStorage)
  - How long is it kept? (permanent / TTL / session)
  - Read frequency: [high / medium / low]
  - Write frequency: [high / medium / low]

Indexes needed:
  - [field] (for [query pattern])

Example:
  { id: "abc123", ... }
```

### Entities to define (based on app pages):
1. User / Session (if auth exists)
2. Main content entity (e.g., NewsCluster for SachNetra)
3. User preferences (persisted settings)
4. Any derived/cached data
5. Any relationship tables

### For each entity, also define:
- API shape (what the frontend receives from the API)
- Storage shape (what's persisted in the database)
- Difference between the two (transformations needed)

### State management (client-side):
- What lives in memory only (session)?
- What persists to localStorage?
- What's fetched fresh on each load?

**Output format:**
Save to `ai_docs/prep/initial_data_schema.md`

---

## SachNetra Reference

Key data entities:

```typescript
// ClusteredEvent — the main content unit
interface ClusteredEvent {
  id: string;                    // base64 slug from headline
  headline: string;              // primary headline
  category: string;              // politics | economy | tech | disaster | government
  sourceCount: number;           // how many sources covered this
  sources: SourceItem[];         // list of source items
  whatHappened: string;          // AI summary — factual
  whatItMeans: string;           // AI summary — practical impact
  locationName: string;          // city/state extracted
  isAlert: boolean;              // red treatment in timeline
  timestamp: number;             // Unix ms
}

// SourceItem — an individual news item within a cluster
interface SourceItem {
  headline: string;
  url: string;
  source: string;               // source name (NDTV, The Hindu, etc.)
  publishedAt: number;          // Unix ms
}

// App state persisted to localStorage
interface AppPreferences {
  selectedState: string | null; // "Maharashtra", "Delhi", etc.
  activeTab: string;            // "home" | "timeline" | "map" | "states"
  panelState: Record<string, unknown>; // WorldMonitor panel state
}
```

Storage:
- ClusteredEvent: Upstash Redis (TTL 15min, key: india:digest:v8)
- AppPreferences: localStorage
- AI summaries: Redis per-story cache (key: india:summary:v8:[slug])
