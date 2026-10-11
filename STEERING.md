# South-View Cemetery Visualization — Implementation Steering

## Project Overview

A locally hosted, interactive data visualization tool for **South-View Cemetery** (Atlanta, GA — founded 1886, the oldest African American-owned cemetery in the United States). The tool has two core views:

1. **Cemetery Map** — a temporal map with a slider showing cemetery growth over time, plus a sidebar with population stats, notable figures, and demographics.
2. **Network Graph** — an interactive node-link graph of buried individuals, switchable between relation-based (kinship/friendship edges) and event-based (individuals linked to shared historical events) modes.

Since this is an MVP with no real dataset yet, we populate everything with plausible sample data drawn from publicly known history of South-View Cemetery and the broader Atlanta Black community.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **React 18** (Vite) | Fast dev server, hot reload, simple setup |
| Language | **TypeScript** | Catches shape errors in our data early |
| Styling | **Tailwind CSS** | Rapid layout without writing custom CSS |
| Map rendering | **Leaflet** + `react-leaflet` | Lightweight, no API key needed, works offline |
| Network graph | **D3.js** (force layout) | Full control over node/edge rendering and interaction |
| Routing / tabs | **React Router v6** | Simple tab switching between Map and Graph |
| Sample data | Static JSON files | No backend needed for the MVP |

No backend. Everything runs client-side from `npm run dev`.

---

## Data Schema (sample JSON)

### `individuals.json`

```jsonc
[
  {
    "id": "person-1",
    "name": "John Wesley Dobbs",
    "birth": 1882,
    "death": 1961,
    "burial_year": 1961,
    "section": "A",
    "plot": "12",
    "bio": "Known as the unofficial mayor of Auburn Avenue...",
    "notable": true,
    "demographics": {
      "gender": "Male",
      "race": "Black",
      "occupation": "Civic leader, Mason"
    },
    "relations": [
      { "target": "person-2", "type": "spouse" }
    ],
    "events": [
      { "event_id": "event-1", "role": "Leader" }
    ]
  }
]
```

### `events.json`

```jsonc
[
  {
    "id": "event-1",
    "name": "Atlanta Civil Rights Movement",
    "year_range": [1940, 1965],
    "description": "Broad coalition of activists, ministers, and civic leaders...",
    "type": "Movement"
  }
]
```

### `map_snapshots.json`

```jsonc
[
  {
    "year": 1890,
    "total_burials": 48,
    "sections_active": ["A"],
    "notable_figures": ["person-5"],
    "demographics": {
      "gender": { "Male": 30, "Female": 18 },
      "occupation_top": ["Laborer", "Minister", "Teacher"]
    },
    "bounds": [[33.7175, -84.3800], [33.7195, -84.3770]]
  },
  {
    "year": 1920,
    "total_burials": 430,
    "sections_active": ["A", "B", "C"],
    "notable_figures": ["person-5", "person-3"],
    "demographics": {
      "gender": { "Male": 250, "Female": 180 },
      "occupation_top": ["Laborer", "Domestic worker", "Minister", "Teacher", "Business owner"]
    },
    "bounds": [[33.7170, -84.3810], [33.7200, -84.3760]]
  }
]
```

---

## Incremental Implementation Plan

Work through these phases in order. Each phase produces a working, runnable state of the app.

---

### Phase 0 — Project Scaffolding

**Goal:** Empty app runs in the browser with tab navigation.

- [ ] `npm create vite@latest . -- --template react-ts`
- [ ] Install dependencies: `react-router-dom`, `tailwindcss @tailwindcss/vite`
- [ ] Set up Tailwind (`@import "tailwindcss"` in `index.css`)
- [ ] Create a top-level layout with a header ("South-View Cemetery") and two tab links: **Map** and **Network Graph**
- [ ] Create placeholder route components: `MapView.tsx`, `NetworkGraphView.tsx`
- [ ] Verify `npm run dev` shows the header and tabs, clicking tabs switches the view

**Checkpoint:** App runs, tabs switch between two placeholder pages.

---

### Phase 1 — Sample Data

**Goal:** All mock data exists as static JSON, with TypeScript types.

- [ ] Create `src/data/individuals.json` — ~15-20 individuals spanning 1886-1970. Mix of:
  - Notable real figures (John Wesley Dobbs, Alonzo Herndon, Antoine Graves, etc.)
  - Plausible fictional entries to fill out the population
- [ ] Create `src/data/events.json` — ~5-6 events (founding of South-View 1886, Atlanta Race Riot 1906, Civil Rights Movement, founding of Atlanta Life Insurance, etc.)
- [ ] Create `src/data/map_snapshots.json` — ~6 time slices (1890, 1900, 1920, 1940, 1960, 1970) with growing totals, expanding bounds, and shifting demographics
- [ ] Create `src/types.ts` with interfaces: `Individual`, `Event`, `MapSnapshot`, `Relation`, `EventLink`, `Demographics`
- [ ] Create `src/data/index.ts` that imports and re-exports the JSON with proper typing

**Checkpoint:** Types compile. You can `console.log` the data in any component.

---

### Phase 2 — Cemetery Map (Basic)

**Goal:** Leaflet map renders centered on South-View Cemetery coordinates.

- [ ] Install `leaflet`, `react-leaflet`, `@types/leaflet`
- [ ] In `MapView.tsx`, render a `<MapContainer>` centered at approx. `[33.7185, -84.3785]` with OpenStreetMap tiles
- [ ] Import Leaflet's CSS (`leaflet/dist/leaflet.css`)
- [ ] Add a `<Rectangle>` overlay for the first snapshot's bounds (translucent fill to represent cemetery area)
- [ ] Style the map to fill the available space (full height minus header)

**Checkpoint:** Map loads showing the real-world location of South-View Cemetery with a colored overlay.

---

### Phase 3 — Time Slider + Dynamic Map

**Goal:** Slider scrubs through time; the map overlay and sidebar update.

- [ ] Add an `<input type="range">` below the map, with stops at each snapshot year
- [ ] On slider change, update state to the selected `MapSnapshot`
- [ ] Animate/transition the `<Rectangle>` bounds to the new snapshot's bounds (cemetery "grows")
- [ ] Show the current year prominently near the slider
- [ ] Add section overlays — each active section as a smaller colored rectangle within the cemetery bounds

**Checkpoint:** Dragging the slider visibly grows/shrinks the cemetery overlay and shows different active sections.

---

### Phase 4 — Map Sidebar (Info Panel)

**Goal:** Sidebar displays contextual information for the selected time period.

- [ ] Create `MapSidebar.tsx` — a fixed-width panel to the right of the map
- [ ] Display for the current snapshot:
  - **Year** (large heading)
  - **Total burials** (number with label)
  - **Notable figures** — list names, clicking one shows a tooltip/modal with their bio
  - **Demographics** — gender breakdown as a simple horizontal bar, top occupations as a ranked list
- [ ] Ensure the sidebar scrolls independently if content overflows
- [ ] Add smooth transitions when the slider changes (fade or slide content)

**Checkpoint:** Sliding through time updates the sidebar with population, names, and demographic bars.

---

### Phase 5 — Network Graph (Basic Force Layout)

**Goal:** D3 force-directed graph renders all individuals as nodes.

- [ ] Install `d3` and `@types/d3`
- [ ] In `NetworkGraphView.tsx`, use `useRef` + `useEffect` to binds D3 to an SVG
- [ ] Create a force simulation with all individuals as nodes (circle + label)
- [ ] Style nodes: larger/highlighted for notable figures, standard for others
- [ ] Add zoom and pan via `d3.zoom()`
- [ ] On hover/click a node, show a tooltip with the individual's name, dates, occupation, and bio

**Checkpoint:** All individuals appear as a node cloud. Hovering shows info. You can zoom/pan.

---

### Phase 6 — Relation-Based Edges

**Goal:** Toggle "Relations" mode; edges show kinship/friendship links.

- [ ] Add a toggle/filter bar above the graph: **Relations** | **Events** (default to Relations)
- [ ] When "Relations" is active, draw edges from each individual's `relations` array
- [ ] Style edges by type: solid for spouse, dashed for friendship, dotted for other kinship
- [ ] Add a small label or tooltip on edges showing the relation type
- [ ] Tune the force simulation so connected clusters pull together

**Checkpoint:** In Relations mode, you can see family clusters and friend connections.

---

### Phase 7 — Event-Based Edges

**Goal:** Toggle "Events" mode; individuals link to shared event nodes.

- [ ] When "Events" is active, add event nodes (larger, different shape — e.g., rounded rectangle or diamond)
- [ ] Draw edges from each individual to their associated events
- [ ] Label edges with the individual's role in the event (from `events` array on the individual)
- [ ] Style event nodes distinctly (different color, larger, with event name as label)
- [ ] On click/hover of an event node, show event description and year range
- [ ] Tune forces so event nodes sit centrally with individuals orbiting

**Checkpoint:** In Events mode, you see a bipartite-style graph — people connected to events, with role labels on edges.

---

### Phase 8 — Polish and Integration

**Goal:** The app feels cohesive and presentable for a pitch.

- [ ] Consistent color palette across both views (muted earth tones — greens, browns, golds — fitting for a cemetery/heritage project)
- [ ] Add a brief intro/about section accessible from the header (modal or collapsible) explaining the project's purpose
- [ ] Smooth transitions when switching tabs
- [ ] Responsive layout — works on a laptop screen (no need for mobile)
- [ ] Loading states for map tiles
- [ ] Keyboard accessibility for the slider and graph toggle
- [ ] Final pass on sample data — ensure bios, dates, and events are internally consistent

**Checkpoint:** The full app is demo-ready. Both views work, data is coherent, and it looks intentional.

---

## Running the Project

```bash
cd south-view-pitch-mvp
npm install
npm run dev
# Open http://localhost:5173
```

---

## Notes

- **No backend.** Everything is client-side with static JSON.
- **No API keys.** Leaflet uses free OpenStreetMap tiles.
- **No real data yet.** Sample data should be clearly marked as illustrative. When real data arrives, it drops into the same JSON shape.
- **Performance is not a concern** at MVP scale (~20 nodes, ~6 map snapshots).
- Each phase should be committed separately so we can revert if needed.
