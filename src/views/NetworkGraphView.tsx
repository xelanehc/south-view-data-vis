import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import NetworkGraph, { type GraphMode, type Selection } from '@/components/NetworkGraph'
import NetworkPanel from '@/components/NetworkPanel'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { events, individuals } from '@/data'

const TOGGLE_ON = 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
const isPerson = (id: string) => individuals.some((p) => p.id === id)
const isEvent = (id: string) => events.some((e) => e.id === id)

function LegendItem({ children, swatch }: { children: React.ReactNode; swatch: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  )
}

function EdgeSwatch({ dash }: { dash?: string }) {
  return (
    <svg width="20" height="6" aria-hidden className="text-muted-foreground">
      <line x1="0" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dash} />
    </svg>
  )
}

export default function NetworkGraphView() {
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState<GraphMode>('relations')
  const [selection, setSelection] = useState<Selection | null>(() => {
    // Deep link from the map: /network?select=person-1
    const id = params.get('select')
    return id && isPerson(id) ? { id, recenter: true } : null
  })
  const searchRef = useRef<HTMLInputElement>(null)

  // The param is only an entry point; drop it so the URL doesn't go stale
  useEffect(() => {
    if (params.has('select')) setParams({}, { replace: true })
  }, [params, setParams])

  const changeMode = useCallback((next: GraphMode) => {
    setMode(next)
    // Event nodes don't exist in the Relations view
    setSelection((s) => (s && next === 'relations' && isEvent(s.id) ? null : s))
  }, [])

  const select = useCallback((id: string | null, recenter = false) => {
    setSelection(id ? { id, recenter } : null)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement !== searchRef.current) {
        setSelection(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2.5 md:px-6">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) => v && changeMode(v as GraphMode)}
          aria-label="Graph view"
        >
          <ToggleGroupItem value="relations" className={TOGGLE_ON}>Relations</ToggleGroupItem>
          <ToggleGroupItem value="events" className={TOGGLE_ON}>Events</ToggleGroupItem>
        </ToggleGroup>

        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <LegendItem swatch={<span className="size-3 rounded-full bg-chart-1" />}>Notable</LegendItem>
          <LegendItem swatch={<span className="size-2.5 rounded-full bg-chart-2" />}>Individual</LegendItem>
          {mode === 'events' ? (
            <LegendItem swatch={<span className="h-2.5 w-3.5 rounded-sm bg-chart-3" />}>Event</LegendItem>
          ) : (
            <>
              <LegendItem swatch={<EdgeSwatch />}>Spouse</LegendItem>
              <LegendItem swatch={<EdgeSwatch dash="5,3" />}>Friend</LegendItem>
              <LegendItem swatch={<EdgeSwatch dash="2,3" />}>Other kin</LegendItem>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <NetworkGraph mode={mode} selection={selection} onSelect={(id) => select(id)} />
        </div>
        <NetworkPanel
          mode={mode}
          selectedId={selection?.id ?? null}
          searchRef={searchRef}
          onSelect={(id) => select(id, true)}
          onClose={() => select(null)}
        />
      </div>
    </div>
  )
}
