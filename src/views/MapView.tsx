import 'leaflet/dist/leaflet.css'
import type { LatLngExpression } from 'leaflet'
import { useMemo, useState } from 'react'
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet'
import MapSidebar from '../components/MapSidebar'
import { mapSnapshots } from '../data'
import type { MapSnapshot } from '../types'

const CENTER: [number, number] = [33.7013, -84.3700]

const SECTION_COLORS: Record<string, string> = {
  A: '#92400e',
  B: '#065f46',
  C: '#1e40af',
  D: '#7c2d12',
  E: '#4c1d95',
  F: '#854d0e',
}

// Section polygons tile the cemetery from north to south. The western boundary
// follows Jonesboro Rd (GA 54) which runs NW–SE diagonally, so the western
// edge shifts east as sections go further south. The eastern boundary runs
// roughly straight along the tree line.

const SECTION_POLYGONS: Record<string, LatLngExpression[]> = {
  // Section A — northernmost strip (original plot)
  A: [
    [33.7035, -84.3710],
    [33.7035, -84.3660],
    [33.7027, -84.3660],
    [33.7027, -84.3709],
  ],
  // Section B — second strip from north
  B: [
    [33.7027, -84.3709],
    [33.7027, -84.3660],
    [33.7019, -84.3660],
    [33.7019, -84.3707],
  ],
  // Section C — middle strip
  C: [
    [33.7019, -84.3707],
    [33.7019, -84.3660],
    [33.7011, -84.3660],
    [33.7011, -84.3704],
  ],
  // Section D — south-center strip
  D: [
    [33.7011, -84.3704],
    [33.7011, -84.3660],
    [33.7003, -84.3660],
    [33.7003, -84.3700],
  ],
  // Section E — second from south
  E: [
    [33.7003, -84.3700],
    [33.7003, -84.3660],
    [33.6997, -84.3660],
    [33.6997, -84.3697],
  ],
  // Section F — southernmost strip
  F: [
    [33.6997, -84.3697],
    [33.6997, -84.3660],
    [33.6991, -84.3660],
    [33.6991, -84.3694],
  ],
}

function SectionOverlays({ snapshot }: { snapshot: MapSnapshot }) {
  const map = useMap()

  useMemo(() => {
    // Compute a bounding box from all active section polygons
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
    for (const section of snapshot.sections_active) {
      const poly = SECTION_POLYGONS[section]
      if (!poly) continue
      for (const pt of poly) {
        const [lat, lng] = pt as [number, number]
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
      }
    }
    map.flyToBounds([[minLat, minLng], [maxLat, maxLng]], { duration: 0.8, padding: [40, 40] })
  }, [snapshot, map])

  return (
    <>
      {snapshot.sections_active.map((section) => {
        const poly = SECTION_POLYGONS[section]
        if (!poly) return null
        return (
          <Polygon
            key={section}
            positions={poly}
            pathOptions={{
              color: SECTION_COLORS[section] || '#78716c',
              fillColor: SECTION_COLORS[section] || '#a8a29e',
              fillOpacity: 0.25,
              weight: 2,
            }}
          />
        )
      })}
    </>
  )
}

export default function MapView() {
  const [snapshotIndex, setSnapshotIndex] = useState(0)
  const snapshot = mapSnapshots[snapshotIndex]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 relative">
          <MapContainer
            center={CENTER}
            zoom={16}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SectionOverlays snapshot={snapshot} />
          </MapContainer>
        </div>
        <MapSidebar snapshot={snapshot} />
      </div>

      <div className="bg-stone-800 text-stone-100 px-6 py-4 flex items-center gap-6 h-16 shrink-0">
        <span className="text-2xl font-bold tabular-nums shrink-0">{snapshot.year === 1970 ? '1970–Present' : snapshot.year}</span>
        <input
          type="range"
          min={0}
          max={mapSnapshots.length - 1}
          value={snapshotIndex}
          onChange={(e) => setSnapshotIndex(Number(e.target.value))}
          className="flex-1 min-w-40 accent-amber-600 cursor-pointer"
        />
        <div className="text-sm text-stone-400 shrink-0 text-right">
          {mapSnapshots[0].year} — Present
        </div>
      </div>
    </div>
  )
}
