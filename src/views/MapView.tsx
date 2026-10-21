import 'leaflet/dist/leaflet.css'
import type { LatLngBoundsExpression } from 'leaflet'
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
const PLAY_INTERVAL_MS = 1467
// Pause after the map first appears before the timeline starts playing on its own
const AUTOPLAY_DELAY_MS = 1000
const LAST = mapSnapshots.length - 1

function footprintBounds(footprint: [number, number][]): LatLngBoundsExpression | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const [lat, lng] of footprint) {
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  return maxLat < minLat ? null : [[minLat, minLng], [maxLat, maxLng]]
}

function FootprintOverlays({ snapshot }: { snapshot: MapSnapshot }) {
  const map = useMap()
  const first = useRef(true)

  useEffect(() => {
    const bounds = footprintBounds(snapshot.footprint)
    if (!bounds) return
    const options = { padding: [60, 60] as [number, number], maxZoom: 17 }
    if (first.current) {
      first.current = false
      map.fitBounds(bounds, options)
    } else {
      map.flyToBounds(bounds, { ...options, duration: 0.8 })
    }
  }, [snapshot, map])

  // Every date's footprint stays mounted and fades in/out, so the cemetery appears to grow
  // smoothly. Adding polygons mid-flyToBounds would also render them offset.
  return (
    <>
      {mapSnapshots.map((s) => {
        const active = s.year === snapshot.year
        return (
          <Polygon
            key={s.year}
            positions={s.footprint}
            interactive={active}
            pathOptions={{
              className: 'fill-chart-1 stroke-chart-1 transition-[fill-opacity,stroke-opacity] duration-500',
              fillOpacity: active ? 0.28 : 0,
              opacity: active ? 0.9 : 0,
              weight: 2,
            }}
          >
            {active && (
              <Tooltip sticky className="sv-tooltip">
                Developed area, {s.year}
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

function FootprintLegend() {
  return (
    <Card className="absolute top-3 right-3 z-[1000] gap-1.5 bg-background/95 px-3 py-2.5 text-xs shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm bg-chart-1" />
        <span>Developed area</span>
      </div>
    </Card>
  )
}

export default function MapView() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tilesReady, setTilesReady] = useState(false)
  const [autoplayPending, setAutoplayPending] = useState(true)
  // Set when the user presses play so the first step comes quickly as feedback
  const quickStepRef = useRef(false)
  const snapshot = mapSnapshots[index]

  // Don't leave the skeleton up forever if tiles can't load (offline demo)
  useEffect(() => {
    const t = setTimeout(() => setTilesReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  // Start playing once the map is visible, unless the user has already taken over
  useEffect(() => {
    if (!tilesReady || !autoplayPending) return
    const t = setTimeout(() => {
      setAutoplayPending(false)
      setPlaying(true)
    }, AUTOPLAY_DELAY_MS)
    return () => clearTimeout(t)
  }, [tilesReady, autoplayPending])

  useEffect(() => {
    if (!playing) return
    const delay = quickStepRef.current ? PLAY_INTERVAL_MS / 2 : PLAY_INTERVAL_MS
    const t = setTimeout(() => {
      quickStepRef.current = false
      if (index >= LAST) setPlaying(false)
      else setIndex(index + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [playing, index])

  const togglePlay = useCallback(() => {
    setAutoplayPending(false)
    quickStepRef.current = !playing
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
          <FootprintOverlays snapshot={snapshot} />
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

        <FootprintLegend />
        <Timeline
          index={index}
          onChange={(i) => {
            setAutoplayPending(false)
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
