# South-View Cemetery Data Visualization MVP

An interactive data visualization tool for exploring the history and community of [South-View Cemetery](https://www.southviewpreservation.com/) (1990 Jonesboro Rd SE, Atlanta, GA 30315). The app provides two linked visualizations — a temporal cemetery map and a network graph — to surface relationships between buried individuals and their connections to historical events.

> **Note:** This is an MVP with placeholder data. All names, biographies, and statistics are fictional filler. The structure is designed to be populated with real archival data in the future.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **React 19** + **TypeScript 6** | Component architecture and type safety |
| Build Tool | **Vite 8** | Dev server with HMR, production bundling |
| Styling | **Tailwind CSS 4** (via `@tailwindcss/vite`) | Utility-first CSS with custom theme tokens |
| Map | **Leaflet 1.9** + **react-leaflet 5** | Interactive tiled map with polygon overlays |
| Graph | **D3.js 7** | Force-directed network graph with zoom/drag |
| Routing | **React Router 7** | Client-side tab navigation (Map / Network Graph) |
| Linting | **Oxlint** | Fast Rust-based linter for code quality |

## How It Works

### Project Structure

```
src/
├── App.tsx                  # Root layout: header with logo/nav, route outlet
├── main.tsx                 # React DOM entry point, BrowserRouter wrapper
├── index.css                # Tailwind import + @theme custom color tokens
├── types.ts                 # TypeScript interfaces for all data models
├── assets/
│   └── southviewlogo.avif   # South-View Preservation Foundation logo
├── data/
│   ├── index.ts             # Re-exports typed JSON data
│   ├── individuals.json     # 30 individuals with demographics, relations, events
│   ├── events.json          # 6 historical events with year ranges
│   └── map_snapshots.json   # 6 time snapshots (1890–1970) with burial stats
├── views/
│   ├── MapView.tsx          # Leaflet map + time slider + section polygons
│   └── NetworkGraphView.tsx # D3 force graph + detail panel + search
└── components/
    └── MapSidebar.tsx       # Sidebar with demographics, context, notable figures
```

### Data Layer

All data lives in static JSON files under `src/data/` — there is no backend or API. The `data/index.ts` barrel file imports each JSON file and casts it to the corresponding TypeScript interface (`Individual`, `CemeteryEvent`, `MapSnapshot`), providing type safety throughout the app without a build-time code generation step.

Key data models (`src/types.ts`):

- **Individual** — name, birth/death years, burial section/plot, bio, demographics, a `relations` array (edges to other individuals by type: spouse, parent, sibling, friend, colleague), and an `events` array (links to historical events with a role description).
- **CemeteryEvent** — name, year range, description, and type classification.
- **MapSnapshot** — a point-in-time view of the cemetery: year, total burials, active sections, notable figure IDs, and demographic aggregates (gender split, average age at death, acreage, historical context text).

### Cemetery Map Tab (`MapView` + `MapSidebar`)

The map uses **Leaflet** via `react-leaflet` with OpenStreetMap tiles centered on the real cemetery coordinates (33.7013, -84.3700).

- **Section overlays**: Six polygon regions (A–F) are defined as coordinate arrays in `SECTION_POLYGONS`. The western boundary follows the diagonal of Jonesboro Rd (GA-54), so each section's western edge shifts east as sections go south. Active sections for each time period are rendered as semi-transparent `<Polygon>` components.
- **Time slider**: A range input at the bottom controls which `MapSnapshot` is displayed. Changing the snapshot updates the sidebar data and triggers `map.flyToBounds()` to animate the viewport to fit the active sections.
- **Sidebar**: Displays the selected snapshot's year, total burials, active sections, a gender demographics bar, average age at death, cemetery acreage, historical context paragraph, and a clickable list of notable figures. Clicking a notable figure opens an inline card with their bio.

### Network Graph Tab (`NetworkGraphView`)

The graph uses **D3.js** to render a force-directed simulation directly into an SVG element.

- **Two modes** toggled by toolbar buttons:
  - *Relations* — nodes are individuals, edges are interpersonal relationships (spouse, parent, sibling, friend, colleague) with line style encoding (solid = spouse, dashed = friend, dotted = other).
  - *Events* — individuals and historical events are both nodes; edges connect individuals to events they participated in, labeled with their role.
- **Force simulation** parameters: charge strength -250, link distance 100, link strength 0.4, collision radius 40, alpha decay 0.03, velocity decay 0.5. These values were tuned to balance readability and settling speed.
- **Interaction**: Nodes are draggable (D3 drag behavior). Clicking a node opens a detail panel showing the individual's bio, section/plot, connections, and linked events (or event details with connected individuals). A search bar filters individuals by name or occupation; in Events mode it also searches events by name or type. Selecting a search result zooms/pans the graph to center on that node with a highlight ring.
- **Zoom/pan**: D3 zoom behavior with scale extent [0.3, 4x] applied to the SVG, transforming a root `<g>` element.
- **Responsive**: A `ResizeObserver` on the SVG element triggers a full re-render when the container resizes.

### Theming

The color system is defined in `src/index.css` using Tailwind CSS 4's `@theme` directive, which registers CSS custom properties that Tailwind classes reference at build time:

- **Greens** (`sv-green-50` through `sv-green-900`) — header, buttons, active states, map section overlays, graph nodes
- **Golds** (`sv-gold-100` through `sv-gold-600`) — accents, event nodes, highlight rings, slider, demographics bar
- **Neutrals** (`sv-cream`, `sv-cream-dark`, `sv-text`, `sv-text-secondary`, `sv-text-muted`, `sv-border`) — backgrounds, body text, borders

D3-rendered elements (nodes, links, labels) use the same hex values directly since they exist outside Tailwind's class system.

### Routing

React Router 7 provides two routes (`/map` and `/network`) with a catch-all redirect to `/map`. Navigation is handled by `<NavLink>` components in the header that apply active styling.

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with hot module replacement. No environment variables or external services are required.

### Build for Production

```bash
npm run build
npm run preview
```

The `build` command runs the TypeScript compiler followed by Vite's production bundler. Output goes to `dist/`.
