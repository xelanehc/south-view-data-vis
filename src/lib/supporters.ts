import type { Supporter, SupporterCategory } from '@/types'

export const CEMETERY_ID = 'south-view'

// Full class strings so Tailwind can see them. Colors come from the theme's chart tokens.
export const CATEGORY_STYLES: Record<SupporterCategory, { fill: string; bg: string }> = {
  Government: { fill: 'fill-chart-1', bg: 'bg-chart-1' },
  Nonprofit: { fill: 'fill-chart-4', bg: 'bg-chart-4' },
  Foundation: { fill: 'fill-chart-6', bg: 'bg-chart-6' },
  Corporate: { fill: 'fill-chart-2', bg: 'bg-chart-2' },
  'Faith community': { fill: 'fill-chart-5', bg: 'bg-chart-5' },
  Individual: { fill: 'fill-chart-3', bg: 'bg-chart-3' },
}

export const CATEGORIES = Object.keys(CATEGORY_STYLES) as SupporterCategory[]

export function totalGiving(s: Supporter) {
  return s.contributions.reduce((sum, c) => sum + (c.amount ?? 0), 0)
}

export function givingYears(s: Supporter) {
  const years = s.contributions.map((c) => c.year)
  const first = Math.min(...years)
  const last = Math.max(...years)
  return first === last ? String(first) : `${first}–${last}`
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function formatUSD(amount: number | null) {
  return amount === null ? 'In-kind' : usd.format(amount)
}
