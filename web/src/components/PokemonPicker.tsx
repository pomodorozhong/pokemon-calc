import { useEffect, useMemo, useState } from 'react'
import type { Pokemon } from '@/types/pokemon'
import { filterPokemon, sortPokemon, type SortMode } from '@/lib/pokemonSort'
import { spriteUrl, typeSpriteUrl } from '@/lib/pokemon'
import { useTeamStore } from '@/store/teamStore'

interface PokemonPickerProps {
  pokemon: Pokemon[]
  typeOptions: string[]
  pokemonName: (slug: string) => string
  typeName: (slug: string) => string
}

export function PokemonPicker({
  pokemon,
  typeOptions,
  pokemonName,
  typeName,
}: PokemonPickerProps) {
  const activeSlot = useTeamStore((s) => s.activeSlot)
  const assignPokemon = useTeamStore((s) => s.assignPokemon)
  const dismiss = useTeamStore((s) => s.closePicker)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('meta')

  useEffect(() => {
    if (!activeSlot) return
    setQuery('')
    setTypeFilter(null)
    setSortMode('meta')
  }, [activeSlot])

  const filtered = useMemo(() => {
    const filteredList = filterPokemon(pokemon, query, typeFilter, pokemonName)
    return sortPokemon(filteredList, sortMode)
  }, [pokemon, query, typeFilter, sortMode, pokemonName])

  if (!activeSlot) return null

  const sideLabel = activeSlot.side === 'ours' ? 'Your team' : 'Opponent'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 sm:items-center">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">Choose Pokemon</h3>
            <p className="text-sm text-slate-400">
              {sideLabel} · Slot {activeSlot.index + 1}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </header>

        <div className="space-y-3 border-b border-slate-700 px-5 py-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or number..."
            className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-white outline-none ring-blue-500 focus:ring-2"
          />

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">Sort</label>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-white"
            >
              <option value="meta">Meta usage</option>
              <option value="codex">Codex ID</option>
              <option value="name">Name</option>
            </select>

            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition',
                typeFilter === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              All types
            </button>

            {typeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={[
                  'rounded-full px-2 py-1 transition',
                  typeFilter === type ? 'ring-2 ring-blue-400' : 'opacity-80 hover:opacity-100',
                ].join(' ')}
                title={typeName(type)}
              >
                <img src={typeSpriteUrl(type)} alt={typeName(type)} className="h-5 w-14 object-contain" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((mon) => (
              <button
                key={mon.name}
                type="button"
                onClick={() => assignPokemon(mon)}
                className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-left transition hover:border-blue-500/60 hover:bg-slate-800"
              >
                <img
                  src={spriteUrl(mon.id)}
                  alt={pokemonName(mon.name)}
                  className="h-14 w-14 rounded-xl bg-slate-800 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {pokemonName(mon.name)}
                  </p>
                  <p className="text-xs text-slate-400">#{mon.id}</p>
                  <div className="mt-1 flex gap-1">
                    {mon.types.map((type) => (
                      <img
                        key={type}
                        src={typeSpriteUrl(type)}
                        alt={typeName(type)}
                        className="h-4 w-12 object-contain"
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              No Pokemon match your filters.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
