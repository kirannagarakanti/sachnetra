# DASH-001 — Dashboard "Data Health" View

**Repo:** `sachnetra-dashboard` (separate workspace — Next.js 14 / Tailwind / Recharts / node-postgres → Railway)
**Status:** [ ] not started
**Author:** Lijo + Claude · 2026-05-29
**Implementer:** Claude now (James away 2 days); James reviews on return
**Why this first:** Every surviving strategy (mid-cap event arbitrage, momentum) is blocked on two
data problems — too few companies have prices (G4), and the news→company tagging is sparse + full of
junk (G1). Today those problems are invisible, buried in tables. This screen puts them on one page so
we can *watch them get better* as we fix them. It is the gauge before the surgery.

---

## Context Manifest

**Load:**
- `sachnetra-dashboard/lib/db.js` — `query(text, params)` helper (pg Pool, `DATABASE_PUBLIC_URL`)
- `sachnetra-dashboard/app/api/stats/route.js` — canonical API-route pattern (force-dynamic, Promise.all, NextResponse.json)
- `sachnetra-dashboard/app/components/OverviewCards.jsx` — canonical `.card` component pattern
- `sachnetra-dashboard/app/page.jsx` — how sections are fetched + rendered + auto-refreshed
- This file.

**Don't load:** the SachNetra pipeline repo internals — this task only touches the dashboard repo.

---

## What it shows (plain English)

One new board near the top of the dashboard, **"Data Health"**, with these panels. Each answers a
question Lijo can read at a glance:

| Panel | Question it answers | Good / Bad signal |
|---|---|---|
| **Price universe** | How many companies do I have prices for? | ~50 today = only the biggest. Target ≥150 (mid-caps). |
| **Latest price date** | Is the price data current? | Should be the last trading day. |
| **News tagging coverage (7d)** | What % of news got tagged to a company? | Gate ≥20%. Currently ~4% = FAIL (red). |
| **Tagging noise (7d)** | How much of the tagging is obvious junk? | Heuristic: % of tagged rows hitting a known false-positive list (IPL, MAMATA, …). Lower = better. |
| **Filings feed** | How many bourse filings, and how fresh? | Row count + latest `announced_at`. |
| **FII / DII flows** | Are the institutional flows current? | Latest `flow_date` per investor type. |

This makes **G4** (price universe stuck at ~50) and **G1** (low coverage + junk tags) impossible to
ignore, and turns them into numbers that visibly improve as we fix the pipeline.

---

## Files to create / edit (3 files)

### File 1 (NEW): `app/api/data-health/route.js`

Each table queried in its own try/catch so one bad column never 500s the whole board — a missing/renamed
column shows that panel as "unavailable" while the rest render. (Column names below are confirmed against
the SachNetra migration as of 2026-05-29; the per-query guards are belt-and-suspenders.)

```js
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Known false-positive tags (cricket, politicians, common words mis-tagged as tickers).
// This is a hand-maintained heuristic, not ground truth — extend as new junk is spotted.
const KNOWN_NOISE = [
  "IPL", "MAMATA", "TAKE", "NH", "RETAIL", "FOCUS", "NAVA",
  "SPECIALITY", "URBANCO", "AAKASH", "SONAMLTD", "VIPULLTD",
];

async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.error("data-health panel error:", err.message);
    return { ...fallback, error: err.message };
  }
}

export async function GET() {
  const [priceUniverse, tagging, noise, filings, flows] = await Promise.all([
    // 1. Price universe + freshness
    safe(async () => {
      const r = await query(`
        SELECT COUNT(DISTINCT symbol)::int AS symbols, MAX(trade_date)::text AS latest
        FROM research_prices
      `);
      return { symbols: r.rows[0].symbols, latest: r.rows[0].latest };
    }, { symbols: null, latest: null }),

    // 2. News tagging coverage (last 7 days) — mirrors Exp 11 Check 1
    safe(async () => {
      const r = await query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0)::int AS tagged
        FROM india_news_signals
        WHERE published_at >= NOW() - INTERVAL '7 days'
      `);
      const { total, tagged } = r.rows[0];
      const pct = total > 0 ? (100 * tagged) / total : 0;
      return { total, tagged, pct: Math.round(pct * 100) / 100 };
    }, { total: null, tagged: null, pct: null }),

    // 3. Tagging noise heuristic (last 7 days) — % of tagged rows hitting a known junk tag
    safe(async () => {
      const r = await query(
        `
        WITH tagged AS (
          SELECT nse_tickers
          FROM india_news_signals
          WHERE published_at >= NOW() - INTERVAL '7 days'
            AND COALESCE(array_length(nse_tickers, 1), 0) > 0
        )
        SELECT
          COUNT(*)::int AS tagged_rows,
          COUNT(*) FILTER (WHERE nse_tickers && $1::text[])::int AS noisy_rows
        FROM tagged
        `,
        [KNOWN_NOISE],
      );
      const { tagged_rows, noisy_rows } = r.rows[0];
      const pct = tagged_rows > 0 ? (100 * noisy_rows) / tagged_rows : 0;
      return { tagged_rows, noisy_rows, pct: Math.round(pct * 100) / 100 };
    }, { tagged_rows: null, noisy_rows: null, pct: null }),

    // 4. Bourse filings count + freshness
    safe(async () => {
      const r = await query(`
        SELECT COUNT(*)::int AS total, MAX(announced_at)::text AS latest
        FROM india_bourse_announcements
      `);
      return { total: r.rows[0].total, latest: r.rows[0].latest };
    }, { total: null, latest: null }),

    // 5. FII / DII flow freshness (cash segment)
    safe(async () => {
      const r = await query(`
        SELECT investor_type, MAX(flow_date)::text AS latest
        FROM india_institutional_flows
        WHERE segment = 'cash'
        GROUP BY investor_type
      `);
      const map = {};
      r.rows.forEach((row) => { map[row.investor_type] = row.latest; });
      return { latestByType: map };
    }, { latestByType: {} }),
  ]);

  return NextResponse.json({ priceUniverse, tagging, noise, filings, flows });
}
```

### File 2 (NEW): `app/components/DataHealth.jsx`

Reuses the existing `.card` class and the gauge look of `OverviewCards`. Color rule: green = healthy,
amber = watch, red = failing gate.

```jsx
"use client";

function Panel({ label, value, sub, accent, icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-3xl font-bold mb-1 tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default function DataHealth({ data, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-24 mb-3" />
            <div className="h-8 bg-zinc-700 rounded w-16 mb-2" />
            <div className="h-3 bg-zinc-800 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }
  if (!data) return null;

  const GREEN = "#4ade80", AMBER = "#facc15", RED = "#f87171", BLUE = "#38bdf8", GREY = "#71717a";
  const na = (v) => (v === null || v === undefined ? "—" : v);

  const { priceUniverse: pu, tagging: tg, noise: nz, filings: fl, flows: fw } = data;

  // Price universe: green ≥150, amber ≥60, red below (≈Nifty-50-only today).
  const puAccent = pu?.symbols == null ? GREY : pu.symbols >= 150 ? GREEN : pu.symbols >= 60 ? AMBER : RED;
  // Coverage gate is ≥20%.
  const tgAccent = tg?.pct == null ? GREY : tg.pct >= 20 ? GREEN : tg.pct >= 10 ? AMBER : RED;
  // Noise: green <5%, amber <15%, red above.
  const nzAccent = nz?.pct == null ? GREY : nz.pct < 5 ? GREEN : nz.pct < 15 ? AMBER : RED;

  const flowSub = fw?.latestByType
    ? `FII ${na(fw.latestByType.FII)} · DII ${na(fw.latestByType.DII)}`
    : "—";

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-mono text-zinc-300 uppercase tracking-widest">Data Health</h2>
        <p className="text-xs text-zinc-600 mt-0.5">what data we have · how clean · how fresh</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Panel
          label="Price Universe"
          value={pu?.symbols == null ? "—" : pu.symbols}
          sub={pu?.symbols == null ? "unavailable" : `companies priced · target ≥150 (mid-caps)`}
          accent={puAccent}
          icon="🏷️"
        />
        <Panel
          label="Latest Price"
          value={pu?.latest ? pu.latest : "—"}
          sub="most recent trading day in DB"
          accent={pu?.latest ? BLUE : GREY}
          icon="📈"
        />
        <Panel
          label="Tagging Coverage 7d"
          value={tg?.pct == null ? "—" : `${tg.pct}%`}
          sub={tg?.pct == null ? "unavailable" : `${tg.tagged}/${tg.total} news tagged · gate ≥20%`}
          accent={tgAccent}
          icon="🔖"
        />
        <Panel
          label="Tagging Noise 7d"
          value={nz?.pct == null ? "—" : `${nz.pct}%`}
          sub={nz?.pct == null ? "unavailable" : `${nz.noisy_rows}/${nz.tagged_rows} hit a known junk tag`}
          accent={nzAccent}
          icon="🧹"
        />
        <Panel
          label="Filings Feed"
          value={fl?.total == null ? "—" : fl.total.toLocaleString("en-IN")}
          sub={fl?.latest ? `latest ${fl.latest.slice(0, 10)}` : "unavailable"}
          accent={fl?.total ? BLUE : GREY}
          icon="📑"
        />
        <Panel
          label="FII / DII Flows"
          value={fw?.latestByType?.FII ? fw.latestByType.FII : "—"}
          sub={flowSub}
          accent={fw?.latestByType?.FII ? BLUE : GREY}
          icon="💸"
        />
      </div>
    </div>
  );
}
```

### File 3 (EDIT): `app/page.jsx`

Three small additions — import, state+fetch, render. No existing behaviour changes.

**3a.** Add import (after the `NewsTable` import, line ~7):
```jsx
import DataHealth from "./components/DataHealth";
```

**3b.** Add state (after the `tickers` state, line ~13):
```jsx
const [health, setHealth] = useState(null);
```

**3c.** Add `health: true` to both `setLoading({...})` objects (lines ~14 and ~24), and to the
final `setLoading({...})` (line ~38). i.e. each loading object gains `, health: true` / `, health: false`.

**3d.** Add the fetch to the `Promise.allSettled` array in `fetchAll` (line ~26):
```jsx
const [s, v, sent, t, h] = await Promise.allSettled([
  fetch("/api/stats").then((r) => r.json()),
  fetch(`/api/volume?days=${vRange}`).then((r) => r.json()),
  fetch(`/api/sentiment?days=${sRange}`).then((r) => r.json()),
  fetch("/api/tickers").then((r) => r.json()),
  fetch("/api/data-health").then((r) => r.json()),
]);
```
and after the other `if (... === "fulfilled")` lines:
```jsx
if (h.status === "fulfilled") setHealth(normalizeObject(h.value));
```

**3e.** Render the board at the top of `<main>`, directly above `<OverviewCards ... />`:
```jsx
<DataHealth data={health} loading={loading.health} />
```

---

## Setup — environment + install (one-time, Lijo runs)

The dashboard needs the Railway database password to read data. It lives in a **local, gitignored**
file — never in committed code, never in this task file.

**1. Create the local env file** (copies the template):
```bash
cd sachnetra-dashboard
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
```

**2. Open `.env.local`** and paste your Railway **Public URL** as the value:
```
DATABASE_PUBLIC_URL=postgresql://USER:PASSWORD@HOST.railway.app:PORT/railway
```
> Where to get it: Railway → your project → Postgres service → **Connect** tab → **Public URL**
> (use the *Public* URL, not the internal one, or it won't connect from your laptop).

**3. Safety checks:**
- `.env.local` is already in `.gitignore` — confirm `git status` does **not** list it before any commit.
- Do **not** paste the real URL into Gemini, MinMax, Cursor chats, or this `.md` file.
- Same `DATABASE_PUBLIC_URL` value also goes in Vercel → Project → Settings → Environment Variables
  (James already set this for the live deploy; only needed if you redeploy).

**4. Install dependencies** (first time, or if `node_modules` is missing):
```bash
npm install
```

---

## Acceptance check (Lijo runs)

```bash
cd sachnetra-dashboard
npm run dev        # then open http://localhost:3000
```

Pass = the "Data Health" board renders at the top with six panels. Expected on today's data:
- **Price Universe** ≈ 50 (red/amber) — this is the G4 gap, made visible.
- **Tagging Coverage 7d** ≈ 4% (red, below the 20% gate) — this is the G1 gap.
- **Tagging Noise 7d** > 0% — junk tags present.
- Filings + Flows panels show real counts and recent dates.

If any single panel says "unavailable", that table's column name differs from the assumption — note which,
and it's a one-line SQL fix; the rest of the board still renders.

---

## Out of scope (deliberately)

- Fixing the data (that's the *next* tasks: G4 price-universe expansion, G1 tagging rebuild). This task
  only **measures and displays**.
- Strategy / paper-trade views — later, on top of this same board.
- Auth, multi-page routing — the board is a section on the existing single page.

---

## Follow-on tasks this unblocks (do not start yet)

1. **G4 — expand `research_prices`** beyond Nifty-50 to Nifty Midcap 150 (the Price Universe panel is its gauge).
2. **G1 — rebuild news→ticker tagging** for precision then coverage (the Coverage + Noise panels are its gauges).
3. Re-run **Exp 14** (mid-cap governance-shock event study) once G4 + G1 land.
</content>
</invoke>
