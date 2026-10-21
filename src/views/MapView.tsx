import 'leaflet/dist/leaflet.css'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import MapSidebar from '@/components/MapSidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { mapSnapshots } from '@/data'
import { snapshotLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MapSnapshot } from '@/types'

const CENTER: [number, number] = [33.7013, -84.3700]
const PLAY_INTERVAL_MS = 2200
const LAST = mapSnapshots.length - 1

// Full class strings so Tailwind can see them. Colors come from the theme's chart tokens.
const SECTION_STYLES: Record<string, { path: string; dot: string }> = {
  A: { path: 'fill-chart-1 stroke-chart-1', dot: 'bg-chart-1' },
  B: { path: 'fill-chart-2 stroke-chart-2', dot: 'bg-chart-2' },
  C: { path: 'fill-chart-3 stroke-chart-3', dot: 'bg-chart-3' },
  D: { path: 'fill-chart-4 stroke-chart-4', dot: 'bg-chart-4' },
  E: { path: 'fill-chart-5 stroke-chart-5', dot: 'bg-chart-5' },
  F: { path: 'fill-chart-6 stroke-chart-6', dot: 'bg-chart-6' },
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

function sectionBounds(sections: string[]): LatLngBoundsExpression | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const section of sections) {
    for (const pt of SECTION_POLYGONS[section] ?? []) {
      const [lat, lng] = pt as [number, number]
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    }
  }
  return maxLat < minLat ? null : [[minLat, minLng], [maxLat, maxLng]]
}

function SectionOverlays({ snapshot }: { snapshot: MapSnapshot }) {
  const map = useMap()
  const first = useRef(true)

  useEffect(() => {
    const bounds = sectionBounds(snapshot.sections_active)
    if (!bounds) return
    const options = { padding: [60, 60] as [number, number], maxZoom: 17 }
    if (first.current) {
      first.current = false
      map.fitBounds(bounds, options)
    } else {
      map.flyToBounds(bounds, { ...options, duration: 0.8 })
    }
  }, [snapshot, map])

  // All polygons stay mounted and fade in/out, so sections appear smoothly
  return (
    <>
      {Object.entries(SECTION_POLYGONS).map(([section, poly]) => {
        const active = snapshot.sections_active.includes(section)
        return (
          <Polygon
            key={section}
            positions={poly}
            interactive={active}
            pathOptions={{
              className: cn(
                SECTION_STYLES[section].path,
                'transition-[fill-opacity,stroke-opacity] duration-500',
              ),
              fillOpacity: active ? 0.28 : 0,
              opacity: active ? 0.9 : 0,
              weight: 2,
            }}
          >
            {active && (
              <Tooltip sticky className="sv-tooltip">
                Section {section}
              </Tooltip>
            )}
          </Polygon>
        )
      })}
    </>
  )
}

function Timeline({
  index,
  onChange,
  playing,
  onTogglePlay,
}: {
  index: number
  onChange: (i: number) => void
  playing: boolean
  onTogglePlay: () => void
}) {
  const snapshot = mapSnapshots[index]
  return (
    <Card className="absolute inset-x-4 bottom-4 z-[1000] mx-auto max-w-3xl gap-0 bg-background/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          variant="outline"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause timeline' : 'Play timeline'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <div className="min-w-0 flex-1">
          <Slider
            min={0}
            max={LAST}
            step={1}
            value={[index]}
            onValueChange={([v]) => onChange(v)}
            aria-label="Timeline year"
          />
          <div className="relative mt-3 h-4">
            {mapSnapshots.map((s, i) => (
              <button
                key={s.year}
                type="button"
                onClick={() => onChange(i)}
                tabIndex={-1}
                className={cn(
                  'absolute -translate-x-1/2 text-xs tabular-nums transition-colors hover:text-foreground',
                  i === index ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
                // Radix thumbs are inset by half their 16px width at each end
                style={{ left: `calc(8px + (100% - 16px) * ${i / LAST})` }}
              >
                {s.year}
              </button>
            ))}
          </div>
        </div>
        {/* Fixed width sized for "1970–Present" so the slider doesn't resize as the label changes */}
        <div className="w-48 shrink-0 text-right">
          <p className="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
            {snapshotLabel(snapshot, index === LAST)}
          </p>
        </div>
      </div>
    </Card>
  )
}

function SectionLegend({ sections }: { sections: string[] }) {
  return (
    <Card className="absolute top-3 right-3 z-[1000] gap-1.5 bg-background/95 px-3 py-2.5 text-xs shadow-sm backdrop-blur">
      {sections.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <span className={cn('size-2.5 rounded-sm', SECTION_STYLES[s].dot)} />
          <span>Section {s}</span>
        </div>
      ))}
    </Card>
  )
}

export default function MapView() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tilesReady, setTilesReady] = useState(false)
  const snapshot = mapSnapshots[index]

  // Don't leave the skeleton up forever if tiles can't load (offline demo)
  useEffect(() => {
    const t = setTimeout(() => setTilesReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      if (index >= LAST) setPlaying(false)
      else setIndex(index + 1)
    }, PLAY_INTERVAL_MS)
    return () => clearTimeout(t)
  }, [playing, index])

  const togglePlay = useCallback(() => {
    if (!playing && index >= LAST) setIndex(0)
    setPlaying((p) => !p)
  }, [playing, index])

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        <MapContainer center={CENTER} zoom={16} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ load: () => setTilesReady(true) }}
          />
          <SectionOverlays snapshot={snapshot} />
        </MapContainer>

        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-[1100] transition-opacity duration-500',
            tilesReady ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden={tilesReady}
        >
          <Skeleton className="h-full w-full rounded-none" />
        </div>

        <SectionLegend sections={snapshot.sections_active} />
        <Timeline
          index={index}
          onChange={(i) => {
            setPlaying(false)
            setIndex(i)
          }}
          playing={playing}
          onTogglePlay={togglePlay}
        />
      </div>
      <MapSidebar snapshot={snapshot} label={snapshotLabel(snapshot, index === LAST)} />
    </div>
  )
}
