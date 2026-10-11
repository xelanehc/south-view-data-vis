import 'leaflet/dist/leaflet.css'
import { useMemo, useState } from 'react'
import { MapContainer, Rectangle, TileLayer, useMap } from 'react-leaflet'
import MapSidebar from '../components/MapSidebar'
import { mapSnapshots } from '../data'
import type { MapSnapshot } from '../types'

const CENTER: [number, number] = [33.7185, -84.3785]

const SECTION_COLORS: Record<string, string> = {
  A: '#92400e',
  B: '#065f46',
  C: '#1e40af',
  D: '#7c2d12',
  E: '#4c1d95',
  F: '#854d0e',
}

function SectionOverlays({ snapshot }: { snapshot: MapSnapshot }) {
  const map = useMap()
  const sectionBounds = useMemo(() => {
    const [sw, ne] = snapshot.bounds
    const latRange = ne[0] - sw[0]
    const lngRange = ne[1] - sw[1]
    const count = snapshot.sections_active.length

    return snapshot.sections_active.map((section, i) => {
      const latStart = sw[0] + (latRange / count) * i
      const latEnd = sw[0] + (latRange / count) * (i + 1)
      return {
        section,
        bounds: [[latStart, sw[1]] as [number, number], [latEnd, ne[1]] as [number, number]],
        lngMid: sw[1] + lngRange / 2,
      }
    })
  }, [snapshot])

  useMemo(() => {
    map.flyToBounds(snapshot.bounds, { duration: 0.8, padding: [40, 40] })
  }, [snapshot, map])

  return (
    <>
      {sectionBounds.map(({ section, bounds }) => (
        <Rectangle
          key={section}
          bounds={bounds}
          pathOptions={{
            color: SECTION_COLORS[section] || '#78716c',
            fillColor: SECTION_COLORS[section] || '#a8a29e',
            fillOpacity: 0.25,
            weight: 2,
          }}
        >
        </Rectangle>
      ))}
    </>
  )
}

export default function MapView() {
  const [snapshotIndex, setSnapshotIndex] = useState(0)
  const snapshot = mapSnapshots[snapshotIndex]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <MapContainer
          center={CENTER}
          zoom={17}
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

      <div className="bg-stone-800 text-stone-100 px-6 py-4 flex items-center gap-6">
        <span className="text-2xl font-bold tabular-nums w-16">{snapshot.year}</span>
        <input
          type="range"
          min={0}
          max={mapSnapshots.length - 1}
          value={snapshotIndex}
          onChange={(e) => setSnapshotIndex(Number(e.target.value))}
          className="flex-1 accent-amber-600 cursor-pointer"
        />
        <div className="text-sm text-stone-400 w-40 text-right">
          {mapSnapshots[0].year} — {mapSnapshots[mapSnapshots.length - 1].year}
        </div>
      </div>
    </div>
  )
}
