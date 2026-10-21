import * as d3 from 'd3'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { events, individuals } from '@/data'
import { yearRange } from '@/lib/format'
import type { CemeteryEvent, Individual } from '@/types'

export type GraphMode = 'relations' | 'events'

export interface Selection {
  id: string
  /** Pan/zoom the graph to the node (used when selecting from search or detail links) */
  recenter: boolean
}

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
  style: 'solid' | 'dashed' | 'dotted'
}

const FIT_PADDING = 70
const PREWARM_TICKS = 220

function buildGraph(mode: GraphMode): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = individuals.map((p) => ({ id: p.id, type: 'person', data: p }))
  const links: GraphLink[] = []

  if (mode === 'relations') {
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
  } else {
    for (const e of events) nodes.push({ id: e.id, type: 'event', data: e })
    for (const person of individuals) {
      for (const ev of person.events) {
        links.push({ source: person.id, target: ev.event_id, label: ev.role, style: 'solid' })
      }
    }
  }

  return { nodes, links }
}

function nodeLabel(d: GraphNode) {
  if (d.type === 'event') return d.data.name
  // "J. Whitfield": initial + surname keeps relatives apart, and suffixes like "Jr." are skipped
  const parts = d.data.name.split(' ').filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w))
  return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : parts[0] ?? d.data.name
}

function nodeRadius(d: PersonNode) {
  return d.data.notable ? 14 : 10
}

interface HoverState {
  x: number
  y: number
  name: string
  meta: string
}

function nodeMeta(d: GraphNode) {
  return d.type === 'person'
    ? `${d.data.birth}–${d.data.death} · ${d.data.demographics.occupation}`
    : `${yearRange(d.data.year_range)} · ${d.data.type}`
}

export default function NetworkGraph({
  mode,
  selection,
  onSelect,
}: {
  mode: GraphMode
  selection: Selection | null
  onSelect: (id: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const fitRef = useRef<(animate: boolean) => void>(() => {})
  const highlightRef = useRef<(selectedId: string | null, hoverId: string | null) => void>(() => {})
  const hoverIdRef = useRef<string | null>(null)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef<string | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Build the graph. Runs only when the mode changes, never on selection or resize,
  // so the layout stays put while people explore it.
  useEffect(() => {
    const svgEl = svgRef.current
    const container = containerRef.current
    if (!svgEl || !container) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const { nodes, links } = buildGraph(mode)
    nodesRef.current = nodes

    const g = svg.append('g')
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    zoomRef.current = zoom
    svg.call(zoom).on('dblclick.zoom', null)

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(100).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide(40))
      .alphaDecay(0.03)
      .velocityDecay(0.5)
      .stop()

    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('class', 'stroke-muted-foreground/50 transition-opacity duration-150')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d) => (d.style === 'dashed' ? '6,4' : d.style === 'dotted' ? '2,4' : null))

    const linkLabel = g
      .append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => d.label)
      .attr(
        'class',
        'pointer-events-none fill-muted-foreground stroke-background text-[10px] opacity-0 transition-opacity duration-150 [paint-order:stroke]',
      )
      .attr('stroke-width', 3)
      .attr('text-anchor', 'middle')
      .attr('dy', -4)

    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer transition-opacity duration-150 outline-none')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => d.data.name)
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
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
          }),
      )

    node.each(function (d) {
      const el = d3.select(this)
      if (d.type === 'event') {
        el.append('rect')
          .attr('class', 'ring fill-none stroke-primary opacity-0 transition-opacity')
          .attr('x', -25)
          .attr('y', -19)
          .attr('width', 50)
          .attr('height', 38)
          .attr('rx', 9)
          .attr('stroke-width', 2)
        el.append('rect')
          .attr('class', 'fill-chart-3 stroke-background')
          .attr('x', -20)
          .attr('y', -14)
          .attr('width', 40)
          .attr('height', 28)
          .attr('rx', 6)
          .attr('stroke-width', 2)
      } else {
        const r = nodeRadius(d)
        el.append('circle')
          .attr('class', 'ring fill-none stroke-primary opacity-0 transition-opacity')
          .attr('r', r + 5)
          .attr('stroke-width', 2)
        el.append('circle')
          .attr('class', d.data.notable ? 'fill-chart-1 stroke-background' : 'fill-chart-2 stroke-background')
          .attr('r', r)
          .attr('stroke-width', 2)
      }
    })

    node
      .append('text')
      .text(nodeLabel)
      .attr('class', 'pointer-events-none fill-foreground stroke-background [paint-order:stroke]')
      .attr('stroke-width', 3)
      .attr('font-size', (d) => (d.type === 'event' ? 10 : 11))
      .attr('font-weight', (d) => (d.type === 'event' || d.data.notable ? 600 : 400))
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'event' ? 30 : d.data.notable ? 28 : 24))

    // Dim everything except the focused node and its neighbours
    const neighbours = new Map<string, Set<string>>()
    for (const n of nodes) neighbours.set(n.id, new Set([n.id]))
    for (const l of links) {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : String(l.source)
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : String(l.target)
      neighbours.get(s)?.add(t)
      neighbours.get(t)?.add(s)
    }
    const endId = (end: GraphLink['source']) => (typeof end === 'object' ? (end as GraphNode).id : String(end))

    highlightRef.current = (selectedId, hoverId) => {
      const focus = hoverId ?? selectedId
      const near = focus ? neighbours.get(focus) : null
      node.style('opacity', (d) => (!near || near.has(d.id) ? 1 : 0.2))
      node.select('.ring').attr('class', (d) =>
        `ring fill-none stroke-primary transition-opacity ${d.id === selectedId ? 'opacity-100' : 'opacity-0'}`,
      )
      link.style('opacity', (l) => (!focus || endId(l.source) === focus || endId(l.target) === focus ? 1 : 0.1))
      linkLabel.style('opacity', (l) => (focus && (endId(l.source) === focus || endId(l.target) === focus) ? 1 : 0))
    }

    node
      .on('click', (_event, d) => onSelectRef.current(d.id))
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectRef.current(d.id)
        }
      })
      .on('mouseenter', function (_event, d) {
        hoverIdRef.current = d.id
        highlightRef.current(selectedIdRef.current, d.id)
        const box = this.getBoundingClientRect()
        const host = container.getBoundingClientRect()
        setHover({
          x: box.left + box.width / 2 - host.left,
          y: box.top - host.top,
          name: d.data.name,
          meta: nodeMeta(d),
        })
      })
      .on('mouseleave', () => {
        hoverIdRef.current = null
        highlightRef.current(selectedIdRef.current, null)
        setHover(null)
      })

    svg.on('click', (event) => {
      if (event.target === svgEl) onSelectRef.current(null)
    })

    const ticked = () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!)
      linkLabel
        .attr('x', (d) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', (d) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    }

    fitRef.current = (animate) => {
      const { width, height } = svgEl.getBoundingClientRect()
      const xs = nodes.map((n) => n.x ?? 0)
      const ys = nodes.map((n) => n.y ?? 0)
      const [x0, x1] = d3.extent(xs) as [number, number]
      const [y0, y1] = d3.extent(ys) as [number, number]
      const k = Math.min(1.2, (width - FIT_PADDING * 2) / Math.max(1, x1 - x0), (height - FIT_PADDING * 2) / Math.max(1, y1 - y0))
      const t = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
      if (animate) svg.transition().duration(500).call(zoom.transform, t)
      else svg.call(zoom.transform, t)
    }

    // Settle the layout before the first paint so the graph doesn't jolt around on load
    for (let i = 0; i < PREWARM_TICKS; i++) simulation.tick()
    ticked()
    fitRef.current(false)
    simulation.on('tick', ticked)

    highlightRef.current(selectedIdRef.current, null)

    return () => {
      simulation.stop()
      svg.on('.zoom', null).on('click', null)
    }
  }, [mode])

  // Selection is driven from outside (graph clicks, search, detail links)
  useEffect(() => {
    selectedIdRef.current = selection?.id ?? null
    highlightRef.current(selectedIdRef.current, hoverIdRef.current)

    if (!selection?.recenter || !svgRef.current || !zoomRef.current) return
    const node = nodesRef.current.find((n) => n.id === selection.id)
    if (!node || node.x === undefined || node.y === undefined) return
    const { width, height } = svgRef.current.getBoundingClientRect()
    const k = Math.max(1.4, d3.zoomTransform(svgRef.current).k)
    const t = d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-node.x, -node.y)
    d3.select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, t)
  }, [selection, mode])

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, factor)
  }, [])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-muted/30">
      <svg ref={svgRef} className="h-full w-full" />

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <p className="font-medium">{hover.name}</p>
          <p className="text-muted-foreground">{hover.meta}</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg border bg-background p-1 shadow-sm">
        <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          <MinusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => fitRef.current(true)} aria-label="Fit graph to view">
          <MaximizeIcon />
        </Button>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur md:block">
        Drag to move · scroll to zoom · click a node for details
      </p>
    </div>
  )
}
