import type { Pokemon } from '@/types/pokemon'
import { spriteUrl, typeSpriteUrl } from '@/lib/pokemon'

interface PokemonSlotProps {
  pokemon: Pokemon | null
  label: string
  side: 'ours' | 'opponent'
  highlighted?: boolean
  weakToCount?: number
  effectiveToCount?: number
  onClick: () => void
  onClear?: () => void
  pokemonName: (slug: string) => string
}

export function PokemonSlot({
  pokemon,
  label,
  side,
  highlighted = false,
  weakToCount = 0,
  effectiveToCount = 0,
  onClick,
  onClear,
  pokemonName,
}: PokemonSlotProps) {
  const borderColor = side === 'ours' ? 'border-blue-500/60' : 'border-red-500/60'
  const showChips = pokemon && (weakToCount > 0 || effectiveToCount > 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex min-h-36 flex-col rounded-2xl border-2 bg-slate-900/70 p-3 text-left transition',
        borderColor,
        highlighted ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800/80',
        !pokemon ? 'border-dashed' : 'border-solid',
      ].join(' ')}
    >
      <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      {pokemon ? (
        <>
          <div className="flex items-start gap-3">
            <img
              src={spriteUrl(pokemon.id)}
              alt={pokemonName(pokemon.name)}
              className="h-16 w-16 rounded-xl bg-slate-800 object-contain"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {pokemonName(pokemon.name)}
              </p>
              <div className="mt-1 flex gap-1">
                {pokemon.types.map((type) => (
                  <img
                    key={type}
                    src={typeSpriteUrl(type)}
                    alt={type}
                    title={type}
                    className="h-5 w-14 object-contain"
                  />
                ))}
              </div>
            </div>
          </div>

          {showChips && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {weakToCount > 0 && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-200">
                  weak to {weakToCount}
                </span>
              )}
              {effectiveToCount > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                  effective to {effectiveToCount}
                </span>
              )}
            </div>
          )}

          {onClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                onClear()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation()
                  event.preventDefault()
                  onClear()
                }
              }}
              className="absolute right-2 top-2 rounded-full bg-slate-800/90 px-2 py-0.5 text-xs text-slate-300 opacity-0 transition group-hover:opacity-100"
            >
              clear
            </span>
          )}

          {highlighted && (
            <span className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
              top pick
            </span>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
          <span className="text-3xl leading-none">+</span>
          <span className="text-sm">Add Pokemon</span>
        </div>
      )}
    </button>
  )
}
