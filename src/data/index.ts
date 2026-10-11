import type { CemeteryEvent, Individual, MapSnapshot } from '../types'
import eventsData from './events.json'
import individualsData from './individuals.json'
import mapSnapshotsData from './map_snapshots.json'

export const individuals: Individual[] = individualsData as Individual[]
export const events: CemeteryEvent[] = eventsData as CemeteryEvent[]
export const mapSnapshots: MapSnapshot[] = mapSnapshotsData as MapSnapshot[]
