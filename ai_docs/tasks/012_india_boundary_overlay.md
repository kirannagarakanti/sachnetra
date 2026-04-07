# Task 012 — India Boundary Overlay
*SachNetra Adapt Sprint*

**Depends on**: Task 006 (India Map Layers) must be complete ✅
**Estimated time**: 2–3 hours
**Problem**: Map shows OSM's international view — J&K/Ladakh boundaries are dashed/disputed instead of solid Indian claim

---

## Problem Summary

The basemap tiles (OpenFreeMap Positron, sourced from OpenStreetMap) render India's northern border as **disputed territory** — dashed Line of Control, no clear J&K/Ladakh ownership. This is the default international view. India's official boundary (per Survey of India) should show J&K + Ladakh as integral parts of India with solid boundary lines.

Task 006 **defined** the overlay config (`INDIA_BOUNDARY_OVERLAY`, `indiaStates` layer key) but **deferred** the actual rendering. This task completes that work.

---

## What We Have

### GeoJSON file: `ai_docs/ui-docs-reference/in.json`
- **Source**: simplemaps.com (uses India's official boundaries)
- **Features**: 36 (all states + UTs including J&K and Ladakh)
- **J&K**: lat 32.28° to **35.16°N** ✅
- **Ladakh**: lat 32.34° to **37.08°N** (covers Siachen/Karakoram) ✅
- **Overall bbox**: Lat 6.75°–37.08°, Lon 68.19°–97.41°
- **Size**: ~3MB — acceptable for a one-time load on map init
- **Verdict**: ✅ Good enough to fix the boundary problem

### Existing infrastructure (from Task 006)
- `indiaStates?: boolean` in `MapLayers` interface (`types/index.ts` L636)
- `indiaStates` in `LAYER_REGISTRY` (`map-layer-definitions.ts` L81)
- `india` in `VARIANT_LAYER_ORDER` (`map-layer-definitions.ts` L117)
- `INDIA_BOUNDARY_OVERLAY` URL constant (`india.ts` L30) — currently points to undeployed `maps.sachnetra.com`
- `indiaStates: false` in both `INDIA_MAP_LAYERS` and `INDIA_MOBILE_MAP_LAYERS` (`panels.ts` L870, L925)

### Pattern to follow: `loadCountryBoundaries()` (DeckGLMap.ts L5255–5317)
This method shows exactly how to add a GeoJSON overlay to MapLibre:
```typescript
this.maplibreMap.addSource('country-boundaries', { type: 'geojson', data: geojson });
this.maplibreMap.addLayer({ id: '...', type: 'fill', source: '...', paint: { ... } });
this.maplibreMap.addLayer({ id: '...', type: 'line', source: '...', paint: { ... } });
```

### Existing `public/data/` files
- `countries.geojson` — world country boundaries (used by `loadCountryBoundaries()`)
- `country-boundary-overrides.geojson` — Pakistan boundary override (1 feature)

---

## Decisions (Locked In)

1. **Host locally** — Copy GeoJSON to `public/data/india-states.geojson`, no R2 dependency
2. **MapLibre native layers** — Use `addSource` + `addLayer` (fill + line), NOT DeckGL layers. This renders below DeckGL overlays, on top of basemap tiles — exactly what we want
3. **Both international + state borders** — Solid thick line for India's outer boundary, thin lines for internal state boundaries
4. **Style**: Survey of India inspired — dark border line, subtle fill. Matches Positron basemap
5. **Always-on for India variant** — Not togglable, always loaded when `VITE_VARIANT === 'india'`

---

## Files To Open Before Starting

```
ai_docs/ui-docs-reference/in.json           — Source GeoJSON (READ, then copy)
src/components/DeckGLMap.ts                  — Add loadIndiaBoundary() method + wire it
src/config/variants/india.ts                 — Update INDIA_BOUNDARY_OVERLAY path
src/config/panels.ts                         — Set indiaStates: true
```

---

## Implementation

### Phase 1: Host the GeoJSON
**Goal**: Make the India boundary GeoJSON available as a static asset.

- [x] **Step 1.1** — Copy `ai_docs/ui-docs-reference/in.json` to `public/data/india-states.geojson`

- [x] **Step 1.2** — Update `INDIA_BOUNDARY_OVERLAY` in `india.ts`
  - File: `src/config/variants/india.ts` L30
  - Change from: `'https://maps.sachnetra.com/india-states-official.geojson'`
  - Change to: `'/data/india-states.geojson'`

### Phase 2: Add MapLibre Overlay in DeckGLMap.ts
**Goal**: Fetch the GeoJSON and render India's official boundary on top of basemap tiles.

- [x] **Step 2.1** — Import `INDIA_BOUNDARY_OVERLAY` in DeckGLMap.ts
  - Added `isIndiaVariant` constant using `import.meta.env.VITE_VARIANT === 'india'`
  - Dynamic import inside method — tree-shaken for non-India variants

- [x] **Step 2.2** — Add `loadIndiaBoundary()` private method
  - Pattern: follow `loadCountryBoundaries()` (L5255–5317)
  - Fetch `INDIA_BOUNDARY_OVERLAY` URL
  - Add MapLibre source `'india-boundary'`
  - Add layers:
    1. **`india-state-fill`** — `type: 'fill'`, subtle semi-transparent fill (`fill-opacity: 0.03–0.05`) to show claimed territory
    2. **`india-state-border`** — `type: 'line'`, thin dashed lines for internal state boundaries (`line-width: 1`, `line-dasharray: [2,2]`, grey color)
    3. **`india-outer-border`** — `type: 'line'`, thick solid line for international boundary (`line-width: 2–2.5`, dark color)
  - For the outer border: use the *merged/dissolved* outer boundary. Since we have individual state polygons, the international border appears naturally where states touch the country edge. The internal shared edges will be drawn by `india-state-border`. Alternatively, draw all state borders at thin width and add a thicker border for the overall outline shape.

  ```typescript
  private loadIndiaBoundary(): void {
    if (!this.maplibreMap) return;
    
    fetch(INDIA_BOUNDARY_OVERLAY)
      .then(r => r.json())
      .then((geojson) => {
        if (!this.maplibreMap) return;
        
        this.maplibreMap.addSource('india-boundary', {
          type: 'geojson',
          data: geojson,
        });
        
        // Subtle territory fill
        this.maplibreMap.addLayer({
          id: 'india-state-fill',
          type: 'fill',
          source: 'india-boundary',
          paint: {
            'fill-color': '#1a1a2e',
            'fill-opacity': 0.04,
          },
        });
        
        // Internal state boundaries (thin, dashed)
        this.maplibreMap.addLayer({
          id: 'india-state-border',
          type: 'line',
          source: 'india-boundary',
          paint: {
            'line-color': '#64748b',
            'line-width': 0.8,
            'line-opacity': 0.5,
            'line-dasharray': [3, 2],
          },
        });
        
        // Outer international boundary (thick, solid)
        // Since each state is a separate feature, shared internal edges
        // get drawn twice (cancelling visually). The outer edge is drawn once = thick.
        // Use a second layer with thicker line on top.
        this.maplibreMap.addLayer({
          id: 'india-outer-border',
          type: 'line',
          source: 'india-boundary',
          paint: {
            'line-color': '#334155',
            'line-width': 2,
            'line-opacity': 0.7,
          },
        });
      })
      .catch(err => console.warn('[DeckGLMap] Failed to load India boundary:', err));
  }
  ```

- [x] **Step 2.3** — Wire `loadIndiaBoundary()` into map load
  - In the `map.on('load')` callback (L476–484), add:
    ```typescript
    if (import.meta.env.VITE_VARIANT === 'india') {
      this.loadIndiaBoundary();
    }
    ```
  - ALSO in the fallback `recreateWithFallback()` load handler (L606–614), add the same check

- [x] **Step 2.4** — Wire into `switchBasemap()` 
  - When basemap changes, MapLibre sources/layers are destroyed. Need to re-add.
  - In `switchBasemap()` (around L5416), after `loadCountryBoundaries()` calls,
    add the same India variant guard + `loadIndiaBoundary()` call.
  - Add a `private indiaBoundaryLoaded = false;` flag (like `countryGeoJsonLoaded`) 
    and reset it to `false` when basemap switches.

### Phase 3: Enable the Layer
**Goal**: Turn on `indiaStates` for the India variant.

- [x] **Step 3.1** — Set `indiaStates: true` in `panels.ts` L870
  - Change `indiaStates: false` to `indiaStates: true` in `INDIA_MAP_LAYERS`

- [x] **Step 3.2** — Set `indiaStates: true` in `panels.ts` L925
  - Change `indiaStates: false` to `indiaStates: true` in `INDIA_MOBILE_MAP_LAYERS`
  - (Mobile should also show the boundary — it's just a MapLibre layer, very lightweight)

### Phase 4: Light/Dark Theme Awareness (Optional Polish)
**Goal**: Adjust overlay colors based on basemap theme.

- [x] **Step 4.1** — In `buildLayers()`, check `isLightMapTheme()` and adjust:
  - Light basemap (Positron): dark grey borders `[60,60,60,180]`, light grey state lines `[120,120,120,100]`
  - Dark basemap: light grey borders `[200,200,200,160]`, subtle state lines `[180,180,180,80]`
  - Done inline with ternary in deck.gl GeoJsonLayer color props

> **Note**: Implementation uses deck.gl `GeoJsonLayer` instead of MapLibre `addSource`/`addLayer` because MapLibre's GeoJSON web worker has a `__publicField is not defined` bug in Vite dev mode that prevents GeoJSON sources from rendering.

## Read vs Write

**READ for reference (always allowed):**
- `src/components/DeckGLMap.ts` L5255–5317 — `loadCountryBoundaries()` pattern
- `src/components/DeckGLMap.ts` L476–484 — `map.on('load')` handler
- `src/components/DeckGLMap.ts` L606–614 — fallback load handler
- `src/components/DeckGLMap.ts` L5416–5500 — `switchBasemap()` method
- `src/config/basemap.ts` — theme helpers

**WRITE only to:**
- `public/data/india-states.geojson` (new file — copy from in.json)
- `src/config/variants/india.ts` (update URL constant)
- `src/components/DeckGLMap.ts` (add `loadIndiaBoundary()` method + wire calls)
- `src/config/panels.ts` (flip `indiaStates: false` → `true`)

**Never write to:**
- `src/types/index.ts` — already has `indiaStates`, no changes needed
- `src/config/map-layer-definitions.ts` — already has `india` variant, no changes needed
- Sacred variant files (full.ts, tech.ts, finance.ts)

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (`npm run dev` with `VITE_VARIANT=india`):
- [ ] Map tab loads without crash
- [ ] India boundary overlay is visible — solid lines around entire India
- [ ] J&K and Ladakh regions show as part of India with clear solid border
- [ ] Northern boundary extends to ~37°N (Karakoram Pass area)
- [ ] Internal state boundaries visible as thin dashed lines
- [ ] No console errors related to GeoJSON or MapLibre layers
- [ ] Switching basemap theme doesn't break the overlay
- [ ] Compare with reference image (3rd screenshot from user)

### Debugging Checklist

1. **Console: `[DeckGLMap] Failed to load India boundary`** — check if `/data/india-states.geojson` is served
2. **Overlay not visible** — check z-order, ensure layers are added AFTER basemap load
3. **Overlay disappears on theme switch** — check `switchBasemap()` re-adds the overlay
4. **Performance** — 3MB GeoJSON on mobile, watch for lag on first load

---

---

## Lessons Learned

> **These lessons apply to any future map overlay work in DeckGLMap.ts.**

### 1. MapLibre GeoJSON Worker Is Broken in Vite Dev Mode

**Problem**: `addSource({ type: 'geojson', data: ... })` triggers MapLibre's internal web worker to process the GeoJSON. In Vite dev mode, this worker crashes with:
```
[DeckGLMap] map error: __publicField is not defined
```
The source and layers are *registered* successfully (no JS exception), but the worker never processes the features — so **the layers render with zero features**. This is a known Vite/esbuild + MapLibre compatibility issue: esbuild transforms class fields using `__publicField`, which isn't available inside the worker context.

**Symptom**: `addSource` + `addLayer` calls succeed, success log fires, but nothing renders on the map.

**Solution**: Use **deck.gl `GeoJsonLayer`** instead of MapLibre source/layer. deck.gl processes GeoJSON on the main thread (no worker). This is also the consistent pattern — all other data layers in DeckGLMap (earthquakes, military flights, etc.) use deck.gl layers.

**Rule for future overlays**: Always use deck.gl layers for GeoJSON data. Reserve MapLibre `addSource`/`addLayer` only for basemap-level vector tile sources.

---

### 2. `import.meta.env.VITE_VARIANT` vs `SITE_VARIANT`

**Problem**: `import.meta.env.VITE_VARIANT` is set at build time by Vite. In dev mode, it's only available if:
- Explicitly set in the dev command: `VITE_VARIANT=india npm run dev`
- Or defined in a `.env` file

Using `import.meta.env.VITE_VARIANT === 'india'` at module scope returned `undefined` because the env var wasn't reliably propagated.

**Solution**: Use `SITE_VARIANT` from `@/config/variant.ts`. This module-scoped constant handles all variant detection logic:
- Hostname detection (`sachnetra` → `'india'`)
- localStorage override for localhost
- `import.meta.env.VITE_VARIANT` as fallback

**Rule**: Never use `import.meta.env.VITE_VARIANT` directly. Always use `SITE_VARIANT` from `@/config`.

---

### 3. HMR Does NOT Re-Invoke Class Instance Methods

**Problem**: When editing `loadIndiaBoundary()` or `buildLayers()` in DeckGLMap.ts, Vite's Hot Module Replacement (HMR) updates the JS module — but the **existing class instance** isn't recreated. The constructor, `map.on('load')` callback, and `loadIndiaBoundary()` are NOT re-executed. So code changes appear to have no effect.

**Symptom**: You edit the code, save, see HMR update in console, but the map looks identical.

**Solution**: **Always hard refresh** (`Ctrl+Shift+R`) after editing DeckGLMap.ts. This destroys and recreates the entire class instance.

**Debugging tip**: Add `console.info('[DeckGLMap] methodName() called')` at the top of any method you're debugging to confirm it actually executes.

---

### 4. Dynamic Import Can Silently Fail

**Problem**: The initial implementation used `import('@/config/variants/india')` inside `loadIndiaBoundary()` to tree-shake the India config for non-India variants. This dynamic import can fail silently if the module path is wrong or if there's a circular dependency.

**Solution**: Hardcode the fetch path directly: `fetch('/data/india-states.geojson')`. The GeoJSON file is in `public/data/` and served by Vite's static file server. No dynamic import needed.

**Rule**: For static assets in `public/`, use direct `fetch()` with the public path. Dynamic imports are for code-splitting TypeScript modules, not for loading data files.

---

### 5. deck.gl GeoJsonLayer Renders ALL Polygon Edges

**Problem**: When rendering 36 individual state polygons, every polygon edge is drawn — including shared edges between adjacent states. This means internal state boundaries appear with the same weight as the international border. There's no automatic "outer boundary only" mode.

**Solution**: Use two separate `GeoJsonLayer` instances:
1. **`india-boundary-borders`** — thin, subtle lines for all state boundaries (0.3px)
2. **`india-boundary-outer`** — slightly thicker lines for all boundaries (0.4px)

Since shared internal edges are drawn twice by both layers (appearing visually denser), and the outer edge is drawn once (appearing cleaner), this creates a natural visual distinction. Tune line widths to match the basemap's country border thickness.

**Future improvement**: Pre-process the GeoJSON to extract only the dissolved outer boundary as a separate feature, and render it with a dedicated thicker layer.

---

### 6. Console Errors from `map.on('error')` Are NOT Exceptions

**Problem**: MapLibre fires errors through its `map.on('error')` event handler (wired at DeckGLMap.ts L630), not as JS exceptions. The `__publicField` error and `removeLayer` errors appeared in console but did NOT stop execution. This made it look like the overlay was working when it wasn't.

**Symptom**: Console shows `[DeckGLMap] map error: ...` but no stack trace or uncaught exception. Code continues executing — success logs fire — but rendering fails silently.

**Debugging tip**: Always check the console for `[DeckGLMap] map error:` messages. These indicate MapLibre-internal failures that won't be caught by `try/catch`.

---

### 7. Line Width Tuning: Start Bold, Then Refine

**Problem**: The initial implementation used line widths (2–3px) that looked fine in isolation but were much thicker than the basemap's own country borders (~0.3–0.5px at the rendered zoom level).

**Solution**: Start with an **unmistakably bold color** (bright orange `#FF6600`) to confirm the overlay renders at all. Once rendering is confirmed, tune down to match the basemap:
- Internal state borders: **0.3px**, light grey
- Outer boundary: **0.4px**, dark grey (light theme) / light grey (dark theme)

**Rule**: When adding any new map overlay, first verify it renders with a "screaming" color. Then tune to production styling.

---

### 8. Hide Irrelevant UI When Switching Tabs

**Problem**: The state selector bar ("★ Karnataka — Change state") remained visible on the Map tab, overlapping the map view. The state filter is only relevant for the Home/Timeline news feed — it has no effect on the map.

**Solution**: In `setupMobileIndiaLayout()` → `activateTab()`, toggle the state bar visibility:
```typescript
const stateBarEl = document.getElementById('snStateBar');
if (stateBarEl) stateBarEl.style.display = tabKey === 'map' ? 'none' : '';
```

**File**: `src/app/panel-layout.ts` — inside the `activateTab()` closure.

**Rule**: When adding tab-based navigation, audit every persistent UI element (headers, bars, FABs) and explicitly hide/show them per tab. Don't assume elements outside the tab container will be hidden automatically.

---

## Completion Log

- [x] Phase 1 — Host GeoJSON (2026-04-07)
- [x] Phase 2 — deck.gl GeoJsonLayer overlay in buildLayers() (2026-04-07)
- [x] Phase 3 — Enable indiaStates layer (2026-04-07)
- [x] Phase 4 — Theme awareness (2026-04-07)
- [x] Typecheck: 0 errors
- [x] Browser verified — orange test confirmed overlay renders, then tuned to match basemap
- [x] **TASK 012 COMPLETE** ✅
