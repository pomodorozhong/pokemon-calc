import type { MatchupDetail, Pokemon } from '@/types/pokemon'
import { spriteUrl, typeSpriteUrl } from '@/lib/pokemon'

interface PokemonSlotProps {
  pokemon: Pokemon | null
  label: string
  side: 'ours' | 'opponent'
  highlighted?: boolean
  weakToCount?: number
  effectiveToCount?: number
  weakTo?: MatchupDetail[]
  effectiveTo?: MatchupDetail[]
  onClick: () => void
  onClear?: () => void
  pokemonName: (slug: string) => string
}

function formatMultiplier(multiplier: number): string {
  if (multiplier >= 4) return '4×'
  if (multiplier >= 2) return '2×'
  return `${multiplier}×`
}

function MatchupDetailList({
  title,
  details,
  variant,
  pokemonName,
}: {
  title: string
  details: MatchupDetail[]
  variant: 'weak' | 'effective'
  pokemonName: (slug: string) => string
}) {
  if (details.length === 0) return null

  const titleColor = variant === 'weak' ? 'text-red-300' : 'text-emerald-300'

  return (
    <div>
      <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${titleColor}`}>
        {title}
      </p>
      <ul className="space-y-0.5">
        {details.map((detail) => {
          const isQuad = detail.multiplier >= 4
          const itemColor =
            variant === 'weak'
              ? isQuad
                ? 'bg-red-500/30 text-red-100 ring-1 ring-red-400/60'
                : 'text-red-200'
              : isQuad
                ? 'bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400/60'
                : 'text-emerald-200'

          return (
            <li
              key={detail.opponentName}
              className={[
                'flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-xs',
                itemColor,
                isQuad ? 'font-semibold' : '',
              ].join(' ')}
            >
              <span className="truncate">{pokemonName(detail.opponentName)}</span>
              <span className="shrink-0 tabular-nums">{formatMultiplier(detail.multiplier)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PokemonSlot({
  pokemon,
  label,
  side,
  highlighted = false,
  weakToCount = 0,
  effectiveToCount = 0,
  weakTo = [],
  effectiveTo = [],
  onClick,
  onClear,
  pokemonName,
}: PokemonSlotProps) {
  const borderColor = side === 'ours' ? 'border-blue-500/60' : 'border-red-500/60'
  const showChips = pokemon && (weakToCount > 0 || effectiveToCount > 0)
  const hasQuadWeak = weakTo.some((detail) => detail.multiplier >= 4)
  const hasQuadEffective = effectiveTo.some((detail) => detail.multiplier >= 4)

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
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    hasQuadWeak
                      ? 'bg-red-500/35 text-red-100 ring-1 ring-red-400/60'
                      : 'bg-red-500/20 text-red-200',
                  ].join(' ')}
                >
                  weak to {weakToCount}
                </span>
              )}
              {effectiveToCount > 0 && (
                <span
                  className={[
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    hasQuadEffective
                      ? 'bg-emerald-500/35 text-emerald-100 ring-1 ring-emerald-400/60'
                      : 'bg-emerald-500/20 text-emerald-200',
                  ].join(' ')}
                >
                  effective to {effectiveToCount}
                </span>
              )}
            </div>
          )}

          {showChips && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end rounded-2xl bg-slate-950/95 p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="space-y-2">
                <MatchupDetailList
                  title="Weak to"
                  details={weakTo}
                  variant="weak"
                  pokemonName={pokemonName}
                />
                <MatchupDetailList
                  title="Effective to"
                  details={effectiveTo}
                  variant="effective"
                  pokemonName={pokemonName}
                />
              </div>
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
              className="absolute right-2 top-2 z-20 rounded-full bg-slate-800/90 px-2 py-0.5 text-xs text-slate-300 opacity-0 transition group-hover:opacity-100"
            >
              clear
            </span>
          )}

          {highlighted && (
            <span className="absolute -right-2 -top-2 z-20 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
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
