import { MousePointerClickIcon, XIcon } from 'lucide-react'
import { useMemo, useState, type RefObject } from 'react'
import type { GraphMode } from '@/components/NetworkGraph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { events, individuals } from '@/data'
import { yearRange } from '@/lib/format'
import type { CemeteryEvent, Individual } from '@/types'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

function Search({
  mode,
  inputRef,
  onSelect,
}: {
  mode: GraphMode
  inputRef: RefObject<HTMLInputElement | null>
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const open = focused && query.trim().length > 0

  const pick = (id: string) => {
    onSelect(id)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <Command className="overflow-visible bg-transparent p-0">
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          onFocus={() => setFocused(true)}
          // Let item clicks land before the list unmounts
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={mode === 'events' ? 'Search people or events…' : 'Search people…'}
        />
        {open && (
          <CommandList className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 rounded-lg border bg-popover shadow-md">
            <CommandEmpty>No results found.</CommandEmpty>
            {mode === 'events' && (
              <CommandGroup heading="Events">
                {events.map((ev) => (
                  <CommandItem key={ev.id} value={`${ev.name} ${ev.type}`} onSelect={() => pick(ev.id)}>
                    <span className="truncate">{ev.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {yearRange(ev.year_range)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="People">
              {individuals.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.demographics.occupation}`}
                  onSelect={() => pick(p.id)}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.birth}–{p.death}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-sans text-[10px] text-muted-foreground sm:block">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </div>
  )
}

function LinkRow({
  label,
  detail,
  onClick,
}: {
  label: string
  detail: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="truncate text-sm font-medium">{label}</span>
      <Badge variant="secondary" className="ml-auto shrink-0 capitalize">
        {detail}
      </Badge>
    </>
  )
  if (!onClick) return <li className="flex items-center gap-2 px-2 py-1.5">{content}</li>
  return (
    <li>
      <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-2 py-1.5" onClick={onClick}>
        {content}
      </Button>
    </li>
  )
}

function PersonDetail({
  person,
  mode,
  onSelect,
  onClose,
}: {
  person: Individual
  mode: GraphMode
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const related = person.relations.flatMap((r) => {
    const target = individuals.find((p) => p.id === r.target)
    return target ? [{ ...r, name: target.name }] : []
  })
  const linkedEvents = person.events.flatMap((e) => {
    const ev = events.find((x) => x.id === e.event_id)
    return ev ? [{ ...e, name: ev.name }] : []
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{person.name}</CardTitle>
        <CardDescription>
          {person.birth}–{person.death} · {person.demographics.occupation}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {person.notable && <Badge className="w-fit">Notable figure</Badge>}
        <p className="text-sm leading-relaxed text-muted-foreground">{person.bio}</p>
        <p className="text-xs text-muted-foreground">
          Section {person.section}, Plot {person.plot}
        </p>

        {related.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Connections</h4>
              <ul>
                {related.map((r) => (
                  <LinkRow key={r.target} label={r.name} detail={r.type} onClick={() => onSelect(r.target)} />
                ))}
              </ul>
            </div>
          </>
        )}

        {linkedEvents.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Events</h4>
              <ul>
                {linkedEvents.map((e) => (
                  <LinkRow
                    key={e.event_id}
                    label={e.name}
                    detail={e.role}
                    // Event nodes only exist in the Events view
                    onClick={mode === 'events' ? () => onSelect(e.event_id) : undefined}
                  />
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function EventDetail({
  event,
  onSelect,
  onClose,
}: {
  event: CemeteryEvent
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const people = individuals.flatMap((p) => {
    const link = p.events.find((e) => e.event_id === event.id)
    return link ? [{ person: p, role: link.role }] : []
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{event.name}</CardTitle>
        <CardDescription>
          {yearRange(event.year_range)} · {event.type}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        {people.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">Connected people</h4>
              <ul>
                {people.map(({ person, role }) => (
                  <LinkRow key={person.id} label={person.name} detail={role} onClick={() => onSelect(person.id)} />
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function NetworkPanel({
  mode,
  selectedId,
  searchRef,
  onSelect,
  onClose,
}: {
  mode: GraphMode
  selectedId: string | null
  searchRef: RefObject<HTMLInputElement | null>
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const detail = useMemo(() => {
    if (!selectedId) return null
    const person = individuals.find((p) => p.id === selectedId)
    if (person) return { kind: 'person' as const, person }
    const event = events.find((e) => e.id === selectedId)
    return event ? { kind: 'event' as const, event } : null
  }, [selectedId])

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-background">
      <div className="border-b p-4">
        <Search mode={mode} inputRef={searchRef} onSelect={onSelect} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {detail ? (
            <div key={selectedId} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
              {detail.kind === 'person' ? (
                <PersonDetail person={detail.person} mode={mode} onSelect={onSelect} onClose={onClose} />
              ) : (
                <EventDetail event={detail.event} onSelect={onSelect} onClose={onClose} />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MousePointerClickIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">Nothing selected</p>
                <p className="text-sm text-muted-foreground">
                  Click a node on the graph or search for someone to see their story and connections.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
