export interface Demographics {
  gender: string
  race: string
  occupation: string
}

export interface Relation {
  target: string
  type: 'spouse' | 'parent' | 'child' | 'sibling' | 'friend' | 'colleague'
}

export interface EventLink {
  event_id: string
  role: string
}

export interface Individual {
  id: string
  name: string
  birth: number
  death: number
  burial_year: number
  section: string
  plot: string
  bio: string
  notable: boolean
  demographics: Demographics
  relations: Relation[]
  events: EventLink[]
}

export interface CemeteryEvent {
  id: string
  name: string
  year_range: [number, number]
  description: string
  type: string
}

export interface SnapshotDemographics {
  gender: { Male: number; Female: number }
  occupation_top: string[]
}

export interface MapSnapshot {
  year: number
  total_burials: number
  sections_active: string[]
  notable_figures: string[]
  demographics: SnapshotDemographics
  bounds: [[number, number], [number, number]]
}
