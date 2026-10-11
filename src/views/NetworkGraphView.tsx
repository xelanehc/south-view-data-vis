import * as d3 from 'd3'
import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function NetworkGraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<GraphMode>('relations')
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    content: React.ReactNode
  } | null>(null)

  const render = useCallback(() => {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    setTooltip(null)

    const rect = svgRef.current!.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    const { nodes, links } = mode === 'relations' ? buildRelationGraph() : buildEventGraph()

    const g = svg.append('g')

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform)
        })
    )

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#a8a29e')

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30))

    // Links
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#a8a29e')
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
      .attr('fill', '#78716c')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)

    // Nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
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
        el.append('rect')
          .attr('x', -20)
          .attr('y', -14)
          .attr('width', 40)
          .attr('height', 28)
          .attr('rx', 6)
          .attr('fill', '#92400e')
          .attr('stroke', '#78350f')
          .attr('stroke-width', 2)
      } else {
        const person = d.data as Individual
        el.append('circle')
          .attr('r', person.notable ? 14 : 10)
          .attr('fill', person.notable ? '#1e40af' : '#57534e')
          .attr('stroke', person.notable ? '#1e3a8a' : '#44403c')
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
      .attr('fill', '#1c1917')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.type === 'event' ? 28 : ((d.data as Individual).notable ? 26 : 22))

    // Hover
    node.on('mouseenter', (event, d) => {
      const [x, y] = d3.pointer(event, svgRef.current!)
      if (d.type === 'person') {
        const p = d.data as Individual
        setTooltip({
          x, y: y - 10,
          content: (
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-stone-500">{p.birth}–{p.death} &middot; {p.demographics.occupation}</div>
              <p className="text-xs mt-1 max-w-60">{p.bio}</p>
            </div>
          ),
        })
      } else {
        const e = d.data as CemeteryEvent
        setTooltip({
          x, y: y - 10,
          content: (
            <div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-stone-500">{e.year_range[0]}–{e.year_range[1]} &middot; {e.type}</div>
              <p className="text-xs mt-1 max-w-60">{e.description}</p>
            </div>
          ),
        })
      }
    }).on('mouseleave', () => setTooltip(null))

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
      <div className="bg-stone-100 border-b border-stone-200 px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-medium text-stone-600">View:</span>
        <button
          onClick={() => setMode('relations')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'relations'
              ? 'bg-stone-800 text-white'
              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          Relations
        </button>
        <button
          onClick={() => setMode('events')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'events'
              ? 'bg-stone-800 text-white'
              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          Events
        </button>
        <div className="ml-auto flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-800" /> Notable
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-stone-600" /> Individual
          </span>
          {mode === 'events' && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-amber-800" /> Event
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-stone-50">
        <svg ref={svgRef} className="w-full h-full" />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-white border border-stone-200 rounded-lg shadow-lg p-3 text-sm text-stone-700 z-50"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 20,
              maxWidth: 280,
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  )
}
