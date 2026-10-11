import { useMemo, useState } from 'react'
import { individuals } from '../data'
import type { Individual, MapSnapshot } from '../types'

function NotableFigureCard({ person, onClose }: { person: Individual; onClose: () => void }) {
  return (
    <div className="bg-stone-100 border border-stone-300 rounded-lg p-3 text-sm">
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-stone-800">{person.name}</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xs ml-2">
          close
        </button>
      </div>
      <div className="text-stone-500 text-xs mb-1">
        {person.birth}–{person.death} &middot; {person.demographics.occupation}
      </div>
      <p className="text-stone-600 leading-snug">{person.bio}</p>
    </div>
  )
}

export default function MapSidebar({ snapshot }: { snapshot: MapSnapshot }) {
  const [selectedPerson, setSelectedPerson] = useState<Individual | null>(null)

  const notables = useMemo(() => {
    return snapshot.notable_figures
      .map((id) => individuals.find((p) => p.id === id))
      .filter((p): p is Individual => p !== undefined)
  }, [snapshot])

  // Filter to only show notables who are actually dead by this snapshot year
  const visibleNotables = useMemo(() => {
    return notables.filter((p) => p.death <= snapshot.year)
  }, [notables, snapshot.year])

  const { gender, avg_age_at_death, cemetery_acreage, historical_context } = snapshot.demographics
  const total = gender.Male + gender.Female
  const malePct = Math.round((gender.Male / total) * 100)

  return (
    <div className="w-80 bg-white border-l border-stone-200 flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-stone-200">
        <h2 className="text-3xl font-bold text-stone-800 tabular-nums">{snapshot.year === 1970 ? '1970–Present' : snapshot.year}</h2>
        <p className="text-sm text-stone-500 mt-1">Cemetery snapshot</p>
      </div>

      <div className="p-5 border-b border-stone-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
          Total Burials
        </h3>
        <p className="text-2xl font-bold text-stone-800 tabular-nums">
          {snapshot.total_burials.toLocaleString()}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Across {snapshot.sections_active.length} section{snapshot.sections_active.length > 1 ? 's' : ''} ({snapshot.sections_active.join(', ')})
        </p>
      </div>

      <div className="p-5 border-b border-stone-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          Demographics
        </h3>
        <div className="mb-2">
          <div className="flex justify-between text-xs text-stone-600 mb-1">
            <span>Male {malePct}%</span>
            <span>Female {100 - malePct}%</span>
          </div>
          <div className="h-3 bg-stone-200 rounded-full overflow-hidden flex">
            <div
              className="bg-stone-600 transition-all duration-500"
              style={{ width: `${malePct}%` }}
            />
            <div className="bg-amber-600 flex-1 transition-all duration-500" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-stone-500">Avg. age at death</p>
            <p className="text-lg font-semibold text-stone-800 tabular-nums">{avg_age_at_death}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Cemetery acreage</p>
            <p className="text-lg font-semibold text-stone-800 tabular-nums">{cemetery_acreage} acres</p>
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-stone-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
          Historical Context
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed">{historical_context}</p>
      </div>

      <div className="p-5 flex-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
          Notable Figures
        </h3>
        {selectedPerson ? (
          <NotableFigureCard person={selectedPerson} onClose={() => setSelectedPerson(null)} />
        ) : (
          <ul className="space-y-1">
            {visibleNotables.map((person) => (
              <li key={person.id}>
                <button
                  onClick={() => setSelectedPerson(person)}
                  className="text-sm text-stone-700 hover:text-amber-700 hover:underline text-left w-full"
                >
                  {person.name}
                  <span className="text-stone-400 ml-1 text-xs">
                    ({person.birth}–{person.death})
                  </span>
                </button>
              </li>
            ))}
            {visibleNotables.length === 0 && (
              <li className="text-sm text-stone-400 italic">None yet in this period</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
