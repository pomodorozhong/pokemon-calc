import type { MatchupSummary, Pokemon } from '@/types/pokemon'
import { TEAM_SLOTS, useTeamStore } from '@/store/teamStore'
import { PokemonSlot } from '@/components/PokemonSlot'

interface TeamSidePanelProps {
  title: string
  subtitle: string
  side: 'ours' | 'opponent'
  team: (Pokemon | null)[]
  recommendations: Set<string>
  summaries: Map<string, MatchupSummary>
  pokemonName: (slug: string) => string
}

export function TeamSidePanel({
  title,
  subtitle,
  side,
  team,
  recommendations,
  summaries,
  pokemonName,
}: TeamSidePanelProps) {
  const openPicker = useTeamStore((s) => s.openPicker)
  const clearSlot = useTeamStore((s) => s.clearSlot)
  const clearOpponentTeam = useTeamStore((s) => s.clearOpponentTeam)

  const hasOpponentPokemon = side === 'opponent' && team.some(Boolean)

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        {hasOpponentPokemon && (
          <button
            type="button"
            onClick={clearOpponentTeam}
            className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10"
          >
            Clear team
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: TEAM_SLOTS }, (_, index) => {
          const mon = team[index]
          const summary = mon ? summaries.get(mon.name) : undefined

          return (
            <PokemonSlot
              key={`${side}-${index}`}
              pokemon={mon}
              label={`Slot ${index + 1}`}
              side={side}
              highlighted={mon ? recommendations.has(mon.name) : false}
              weakToCount={summary?.weakToCount ?? 0}
              effectiveToCount={summary?.effectiveToCount ?? 0}
              weakTo={summary?.weakTo}
              effectiveTo={summary?.effectiveTo}
              pokemonName={pokemonName}
              onClick={() => openPicker(side, index)}
              onClear={mon ? () => clearSlot(side, index) : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}
