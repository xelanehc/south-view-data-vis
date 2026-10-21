import type { MapSnapshot } from '@/types'

export function snapshotLabel(snapshot: MapSnapshot, isLast: boolean) {
  return isLast ? `${snapshot.year}–Present` : String(snapshot.year)
}

export function yearRange([start, end]: [number, number]) {
  return start === end ? String(start) : `${start}–${end}`
}
