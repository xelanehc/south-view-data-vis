import * as d3 from 'd3'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { events, individuals } from '../data'
import type { CemeteryEvent, Individual } from '../types'

type GraphMode = 'relations' | 'events'

interface PersonNode extends d3.SimulationNodeDatum {
  id: string
  type: 'person'
  data: Individual
}

interface EventNode extends d3.SimulationNodeDatum {
  id: string
  type: 'event'
  data: CemeteryEvent
}

type GraphNode = PersonNode | EventNode

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  label: string
  style: string
}

function buildRelationGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = individuals.map((p) => ({
    id: p.id,
    type: 'person',
    data: p,
  }))

  const links: GraphLink[] = []
  const seen = new Set<string>()

  for (const person of individuals) {
    for (const rel of person.relations) {
      const key = [person.id, rel.target].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)
      links.push({
        source: person.id,
        target: rel.target,
        label: rel.type,
        style: rel.type === 'spouse' ? 'solid' : rel.type === 'friend' ? 'dashed' : 'dotted',
      })
    }
  }

  return { nodes, links }
}

function buildEventGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const personNodes: GraphNode[] = individuals.map((p) => ({
    id: p.id,
    type: 'person',
    data: p,
  }))

  const eventNodes: GraphNode[] = events.map((e) => ({
    id: e.id,
    type: 'event',
    data: e,
  }))

  const links: GraphLink[] = []
  for (const person of individuals) {
    for (const ev of person.events) {
      links.push({
        source: person.id,
        target: ev.event_id,
        label: ev.role,
        style: 'solid',
      })
    }
  }

  return { nodes: [...personNodes, ...eventNodes], links }
}

function DetailPanel({
  mode,
  selected,
  searchQuery,
  onSearchChange,
  searchResults,
  eventSearchResults,
  onSelectResult,
  onClose,
}: {
  mode: GraphMode
  selected: GraphNode | null
  searchQuery: string
  onSearchChange: (q: string) => void
  searchResults: Individual[]
  eventSearchResults: CemeteryEvent[]
  onSelectResult: (id: string) => void
  onClose: () => void
}) {
  const placeholder = mode === 'events'
    ? 'Search individuals or events...'
    : 'Search individuals...'

  return (
    <div className="w-80 bg-sv-cream border-l border-sv-border flex flex-col overflow-hidden shrink-0">
      {/* Search */}
      <div className="p-4 border-b border-sv-border">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-sv-border rounded-md focus:outline-none focus:ring-2 focus:ring-sv-gold-500 focus:border-sv-gold-500"
        />
        {searchQuery && (searchResults.length > 0 || eventSearchResults.length > 0) && (
          <ul className="mt-2 max-h-56 overflow-y-auto">
            {eventSearchResults.length > 0 && (
              <>
                <li className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sv-text-muted">
                  Events
                </li>
                {eventSearchResults.map((ev) => (
                  <li key={ev.id}>
                    <button
                      onClick={() => onSelectResult(ev.id)}
                      className="w-full text-left px-2 py-1.5 text-sm text-sv-text hover:bg-sv-green-50 rounded"
                    >
                      <span className="font-medium">{ev.name}</span>
                      <span className="text-sv-text-muted ml-1 text-xs">
                        {ev.year_range[0]}–{ev.year_range[1]}
                      </span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {searchResults.length > 0 && (
              <>
                {eventSearchResults.length > 0 && (
                  <li className="px-2 pt-2 py-1 text-xs font-semibold uppercase tracking-wider text-sv-text-muted">
                    Individuals
                  </li>
                )}
                {searchResults.map((person) => (
                  <li key={person.id}>
                    <button
                      onClick={() => onSelectResult(person.id)}
                      className="w-full text-left px-2 py-1.5 text-sm text-sv-text hover:bg-sv-green-50 rounded"
                    >
                      <span className="font-medium">{person.name}</span>
                      <span className="text-sv-text-muted ml-1 text-xs">
                        {person.birth}–{person.death}
                      </span>
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
        {searchQuery && searchResults.length === 0 && eventSearchResults.length === 0 && (
          <p className="mt-2 text-xs text-sv-text-muted italic">No results found</p>
        )}
      </div>

      {/* Detail view */}
      <div className="flex-1 overflow-y-auto p-4">
        {selected ? (
          selected.type === 'person' ? (
            <PersonDetail person={selected.data as Individual} onClose={onClose} />
          ) : (
            <EventDetail event={selected.data as CemeteryEvent} onClose={onClose} />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-sv-text-muted text-sm text-center px-4">
            Click a node on the graph or use the search bar to view details
          </div>
        )}
      </div>
    </div>
  )
}

function PersonDetail({ person, onClose }: { person: Individual; onClose: () => void }) {
  const relatedPeople = person.relations
    .map((r) => {
      const target = individuals.find((p) => p.id === r.target)
      return target ? { ...r, name: target.name } : null
    })
    .filter(Boolean) as { target: string; type: string; name: string }[]

  const linkedEvents = person.events
    .map((e) => {
      const ev = events.find((ev) => ev.id === e.event_id)
      return ev ? { ...e, name: ev.name } : null
    })
    .filter(Boolean) as { event_id: string; role: string; name: string }[]

  return (
    <div>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-sv-text">{person.name}</h3>
          <p className="text-xs text-sv-text-secondary">
            {person.birth}–{person.death} &middot; {person.demographics.occupation}
          </p>
        </div>
        <button onClick={onClose} className="text-sv-text-muted hover:text-sv-text-secondary text-sm p-1">
          &times;
        </button>
      </div>

      {person.notable && (
        <span className="inline-block text-xs bg-sv-green-100 text-sv-green-900 px-2 py-0.5 rounded-full mb-3">
          Notable Figure
        </span>
      )}

      <p className="text-sm text-sv-text-secondary leading-relaxed mb-4">{person.bio}</p>

      <div className="text-xs text-sv-text-secondary mb-1">
        Section {person.section}, Plot {person.plot}
      </div>

      {relatedPeople.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-sv-text-muted mb-2">
            Connections
          </h4>
          <ul className="space-y-1">
            {relatedPeople.map((r) => (
              <li key={r.target} className="text-sm text-sv-text-secondary">
                <span className="text-sv-text-muted capitalize">{r.type}:</span> {r.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {linkedEvents.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-sv-text-muted mb-2">
            Events
          </h4>
          <ul className="space-y-1">
            {linkedEvents.map((e) => (
              <li key={e.event_id} className="text-sm text-sv-text-secondary">
                <span className="font-medium">{e.name}</span>
                <span className="text-sv-text-muted ml-1">— {e.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EventDetail({ event, onClose }: { event: CemeteryEvent; onClose: () => void }) {
  const linkedPeople = individuals.filter((p) =>
    p.events.some((e) => e.event_id === event.id)
  )

  return (
    <div>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-sv-text">{event.name}</h3>
          <p className="text-xs text-sv-text-secondary">
            {event.year_range[0]}–{event.year_range[1]} &middot; {event.type}
          </p>
        </div>
        <button onClick={onClose} className="text-sv-text-muted hover:text-sv-text-secondary text-sm p-1">
          &times;
        </button>
      </div>

      <p className="text-sm text-sv-text-secondary leading-relaxed mb-4">{event.description}</p>

      {linkedPeople.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-sv-text-muted mb-2">
            Connected Individuals
          </h4>
          <ul className="space-y-1">
            {linkedPeople.map((p) => {
              const link = p.events.find((e) => e.event_id === event.id)
              return (
                <li key={p.id} className="text-sm text-sv-text-secondary">
                  <span className="font-medium">{p.name}</span>
                  {link && <span className="text-sv-text-muted ml-1">— {link.role}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function NetworkGraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const [mode, setMode] = useState<GraphMode>('relations')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return individuals.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.demographics.occupation.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const eventSearchResults = useMemo(() => {
    if (mode !== 'events' || !searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    )
  }, [searchQuery, mode])

  const selectNodeById = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node || !svgRef.current || !gRef.current || !zoomRef.current) return

    setSelectedNode(node)
    setSearchQuery('')

    // Highlight the selected node
    gRef.current.selectAll<SVGGElement, GraphNode>('g.node-group')
      .select('.node-highlight')
      .attr('opacity', (d) => d.id === id ? 1 : 0)

    // Center on the node with a smooth transition
    const svg = d3.select(svgRef.current)
    const rect = svgRef.current.getBoundingClientRect()
    const transform = d3.zoomIdentity
      .translate(rect.width / 2, rect.height / 2)
      .scale(1.5)
      .translate(-node.x!, -node.y!)

    svg.transition().duration(600).call(zoomRef.current.transform, transform)
  }, [])

  const render = useCallback(() => {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    setSelectedNode(null)

    const rect = svgRef.current!.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    const { nodes, links } = mode === 'relations' ? buildRelationGraph() : buildEventGraph()
    nodesRef.current = nodes

    const g = svg.append('g')
    gRef.current = g

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    zoomRef.current = zoom
    svg.call(zoom)

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(100).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))
      .alphaDecay(0.03)
      .velocityDecay(0.5)
    simulationRef.current = simulation

    // Links
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#D9D3CA')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d) =>
        d.style === 'dashed' ? '6,4' : d.style === 'dotted' ? '2,4' : 'none'
      )

    // Link labels
    const linkLabel = g.append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => d.label)
      .attr('font-size', 9)
      .attr('fill', '#8A8279')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.1).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Draw shapes
    node.each(function (d) {
      const el = d3.select(this)
      if (d.type === 'event') {
        // Highlight ring (hidden by default)
        el.append('rect')
          .attr('class', 'node-highlight')
          .attr('x', -24)
          .attr('y', -18)
          .attr('width', 48)
          .attr('height', 36)
          .attr('rx', 8)
          .attr('fill', 'none')
          .attr('stroke', '#C4943D')
          .attr('stroke-width', 3)
          .attr('opacity', 0)

        el.append('rect')
          .attr('x', -20)
          .attr('y', -14)
          .attr('width', 40)
          .attr('height', 28)
          .attr('rx', 6)
          .attr('fill', '#A67C2E')
          .attr('stroke', '#854d0e')
          .attr('stroke-width', 2)
      } else {
        const person = d.data as Individual
        const r = person.notable ? 14 : 10

        // Highlight ring (hidden by default)
        el.append('circle')
          .attr('class', 'node-highlight')
          .attr('r', r + 5)
          .attr('fill', 'none')
          .attr('stroke', '#C4943D')
          .attr('stroke-width', 3)
          .attr('opacity', 0)

        el.append('circle')
          .attr('r', r)
          .attr('fill', person.notable ? '#1B3A1E' : '#5A8F5E')
          .attr('stroke', person.notable ? '#0f2412' : '#3A5E3C')
          .attr('stroke-width', 2)
      }
    })

    // Node labels
    node.append('text')
      .text((d) => {
        if (d.type === 'event') return (d.data as CemeteryEvent).name
        const p = d.data as Individual
        return p.name.split(' ').pop() || p.name
      })
      .attr('font-size', (d) => d.type === 'event' ? 10 : 11)
      .attr('font-weight', (d) => {
        if (d.type === 'event') return '600'
        return (d.data as Individual).notable ? '600' : '400'
      })
      .attr('fill', '#2D2A26')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.type === 'event' ? 28 : ((d.data as Individual).notable ? 26 : 22))

    // Click to select
    node.on('click', (_event, d) => {
      setSelectedNode(d)
      setSearchQuery('')

      // Update highlight rings
      g.selectAll<SVGGElement, GraphNode>('g.node-group')
        .select('.node-highlight')
        .attr('opacity', (n) => n.id === d.id ? 1 : 0)
    })

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!)

      linkLabel
        .attr('x', (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })
  }, [mode])

  useEffect(() => {
    if (!svgRef.current) return
    render()
    const observer = new ResizeObserver(() => render())
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [render])

  return (
    <div className="flex flex-col h-full">
      <div className="bg-sv-green-50 border-b border-sv-border px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-medium text-sv-text-secondary">View:</span>
        <button
          onClick={() => setMode('relations')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'relations'
              ? 'bg-sv-green-900 text-white'
              : 'bg-sv-cream text-sv-text-secondary border border-sv-border hover:bg-sv-green-100'
          }`}
        >
          Relations
        </button>
        <button
          onClick={() => setMode('events')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'events'
              ? 'bg-sv-green-900 text-white'
              : 'bg-sv-cream text-sv-text-secondary border border-sv-border hover:bg-sv-green-100'
          }`}
        >
          Events
        </button>
        <div className="ml-auto flex items-center gap-4 text-xs text-sv-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-sv-green-900" /> Notable
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-sv-green-500" /> Individual
          </span>
          {mode === 'events' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-sv-gold-600" /> Event
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-sv-cream">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
        <DetailPanel
          mode={mode}
          selected={selectedNode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          eventSearchResults={eventSearchResults}
          onSelectResult={selectNodeById}
          onClose={() => {
            setSelectedNode(null)
            // Clear all highlights
            if (gRef.current) {
              gRef.current.selectAll('.node-highlight').attr('opacity', 0)
            }
          }}
        />
      </div>
    </div>
  )
}
