import type { CemeteryEvent, Individual, MapSnapshot, Supporter } from '../types'
import eventsData from './events.json'
import individualsData from './individuals.json'
import mapSnapshotsData from './map_snapshots.json'
import supportersData from './supporters.json'

export const individuals: Individual[] = individualsData as Individual[]
export const events: CemeteryEvent[] = eventsData as CemeteryEvent[]
export const mapSnapshots: MapSnapshot[] = mapSnapshotsData as MapSnapshot[]
export const supporters: Supporter[] = supportersData as Supporter[]
