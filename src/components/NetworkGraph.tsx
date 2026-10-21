import * as d3 from 'd3'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { supporters } from '@/data'
import { CATEGORIES, CATEGORY_STYLES, CEMETERY_ID, formatUSD, totalGiving } from '@/lib/supporters'
import type { Supporter } from '@/types'

export interface Selection {
  id: string
  /** Pan/zoom the graph to the node (used when selecting from search or the detail panel) */
  recenter: boolean
}

interface HubNode extends d3.SimulationNodeDatum {
  id: string
  type: 'hub'
  name: string
}

interface SupporterNode extends d3.SimulationNodeDatum {
  id: string
  type: 'supporter'
  name: string
  data: Supporter
  total: number
  /** Resting position on the rings; nodes spring back here after a drag */
  homeX: number
  homeY: number
  angle: number
  ring: number
}

type GraphNode = HubNode | SupporterNode

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  label: string
  dashed: boolean
}

const FIT_PADDING = 40
const PREWARM_TICKS = 200
const HUB_RADIUS = 30
// Alternating rings keep neighbouring labels apart; the ellipse uses the canvas's extra width
const RINGS = [170, 255]
const X_STRETCH = 1.2
const Y_STRETCH = 1.2

function buildGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  // The cemetery is pinned at the centre; every supporter links to it
  const hub: HubNode = { id: CEMETERY_ID, type: 'hub', name: 'South-View Cemetery', fx: 0, fy: 0 }
  const nodes: GraphNode[] = [hub]
  const links: GraphLink[] = []

  // Group by type so colours cluster around the ring, biggest supporters first within a type
  const ordered = [...supporters].sort(
    (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || totalGiving(b) - totalGiving(a),
  )
  ordered.forEach((s, i) => {
    const total = totalGiving(s)
    const angle = -Math.PI / 2 + (i / ordered.length) * Math.PI * 2
    const ring = i % RINGS.length
    const homeX = Math.cos(angle) * RINGS[ring] * X_STRETCH
    const homeY = Math.sin(angle) * RINGS[ring] * Y_STRETCH
    nodes.push({ id: s.id, type: 'supporter', name: s.name, data: s, total, homeX, homeY, angle, ring, x: homeX, y: homeY })
    links.push({
      source: s.id,
      target: CEMETERY_ID,
      label: total > 0 ? formatUSD(total) : 'In-kind',
      dashed: s.relationship === 'sponsor',
    })
  })
  return { nodes, links }
}

/**
 * Outer-ring labels point away from the centre. Inner-ring labels sit above or below their node,
 * since pointing outward would run them into the outer ring.
 */
function labelPosition(d: GraphNode, r: number) {
  if (d.type === 'hub') return { x: 0, y: r + 18, anchor: 'middle' }
  const cos = Math.cos(d.angle)
  const sin = Math.sin(d.angle)
  if (d.ring === 0 || Math.abs(cos) < 0.25) return { x: 0, y: sin < 0 ? -r - 8 : r + 16, anchor: 'middle' }
  return { x: cos > 0 ? r + 7 : -r - 7, y: 4, anchor: cos > 0 ? 'start' : 'end' }
}

interface HoverState {
  x: number
  y: number
  name: string
  meta: string
}

function nodeMeta(d: GraphNode) {
  if (d.type === 'hub') return `Est. 1886 · ${supporters.length} supporters`
  const role = d.data.relationship === 'sponsor' ? 'Sponsor' : 'Donor'
  return `${d.data.category} · ${role} · ${d.total > 0 ? formatUSD(d.total) : 'In-kind'}`
}

export default function NetworkGraph({
  selection,
  onSelect,
}: {
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

  // Build the graph once. Selection and resize never rebuild it, so the layout stays
  // put while people explore.
  useEffect(() => {
    const svgEl = svgRef.current
    const container = containerRef.current
    if (!svgEl || !container) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const { nodes, links } = buildGraph()
    const maxTotal = d3.max(nodes, (n) => (n.type === 'supporter' ? n.total : 0)) || 1
    const sizeScale = d3.scaleSqrt().domain([0, maxTotal]).range([8, 22])
    const radius = (d: GraphNode) => (d.type === 'hub' ? HUB_RADIUS : sizeScale(d.total))
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
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).strength(0))
      .force('x', d3.forceX<GraphNode>((d) => (d.type === 'hub' ? 0 : d.homeX)).strength(0.4))
      .force('y', d3.forceY<GraphNode>((d) => (d.type === 'hub' ? 0 : d.homeY)).strength(0.4))
      .force('collision', d3.forceCollide<GraphNode>((d) => radius(d) + 6))
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
      .attr('stroke-dasharray', (d) => (d.dashed ? '6,4' : null))

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
      .attr('aria-label', (d) => d.name)
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
      const r = radius(d)
      el.append('circle')
        .attr('class', 'ring fill-none stroke-primary opacity-0 transition-opacity')
        .attr('r', r + 5)
        .attr('stroke-width', 2)
      el.append('circle')
        .attr('class', `${d.type === 'hub' ? 'fill-primary' : CATEGORY_STYLES[d.data.category].fill} stroke-background`)
        .attr('r', r)
        .attr('stroke-width', 2)

      if (d.type === 'supporter' && d.data.verified) {
        // Check badge marks support confirmed by a public source
        const badge = el.append('g').attr('transform', `translate(${r * 0.75},${-r * 0.75})`)
        badge.append('circle').attr('class', 'fill-primary stroke-background').attr('r', 6).attr('stroke-width', 1.5)
        badge
          .append('path')
          .attr('d', 'M-2.5 0 L-0.75 1.75 L2.5 -1.75')
          .attr('class', 'fill-none stroke-primary-foreground')
          .attr('stroke-width', 1.5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
      }
    })

    node
      .append('text')
      .text((d) => d.name)
      .attr('class', 'pointer-events-none fill-foreground stroke-background [paint-order:stroke]')
      .attr('stroke-width', 3)
      .attr('font-size', (d) => (d.type === 'hub' ? 13 : 11))
      .attr('font-weight', (d) => (d.type === 'hub' || d.data.verified ? 600 : 400))
      .each(function (d) {
        const pos = labelPosition(d, radius(d))
        d3.select(this).attr('x', pos.x).attr('y', pos.y).attr('text-anchor', pos.anchor)
      })

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
      // Every edge touches the hub, so only label edges when a supporter is in focus
      linkLabel.style('opacity', (l) => (focus && focus !== CEMETERY_ID && endId(l.source) === focus ? 1 : 0))
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
          name: d.name,
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
      // Measure the drawn content (labels included) rather than node centres
      const box = g.node()!.getBBox()
      const k = Math.min(
        1.2,
        (width - FIT_PADDING * 2) / Math.max(1, box.width),
        (height - FIT_PADDING * 2) / Math.max(1, box.height),
      )
      const t = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-(box.x + box.width / 2), -(box.y + box.height / 2))
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
  }, [])

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
  }, [selection])

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
