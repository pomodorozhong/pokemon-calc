import { useRef, useState } from 'react'
import type { MatchupDetail, Pokemon } from '@/types/pokemon'
import { spriteUrl, typeSpriteUrl } from '@/lib/pokemon'
import { MatchupTooltip } from '@/components/MatchupTooltip'

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
  const slotRef = useRef<HTMLDivElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const borderColor = side === 'ours' ? 'border-blue-500/60' : 'border-red-500/60'
  const showChips = pokemon && (weakToCount > 0 || effectiveToCount > 0)
  const hasQuadWeak = weakTo.some((detail) => detail.multiplier >= 4)
  const hasQuadEffective = effectiveTo.some((detail) => detail.multiplier >= 4)

  function handleMouseEnter() {
    if (!showChips || !slotRef.current) return
    setAnchorRect(slotRef.current.getBoundingClientRect())
    setShowTooltip(true)
  }

  function handleMouseLeave() {
    setShowTooltip(false)
    setAnchorRect(null)
  }

  return (
    <div
      ref={slotRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={onClick}
        className={[
          'group relative flex h-40 w-full flex-col overflow-hidden rounded-2xl border-2 bg-slate-900/70 p-3 text-left transition',
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
            <div className="flex min-h-0 items-start gap-3">
              <img
                src={spriteUrl(pokemon.id)}
                alt={pokemonName(pokemon.name)}
                className="h-16 w-16 shrink-0 rounded-xl bg-slate-800 object-contain"
                loading="lazy"
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate font-semibold text-white">
                  {pokemonName(pokemon.name)}
                </p>
                <div className="mt-1 flex min-w-0 gap-1 overflow-hidden">
                  {pokemon.types.map((type) => (
                    <img
                      key={type}
                      src={typeSpriteUrl(type)}
                      alt={type}
                      title={type}
                      className="h-5 min-w-0 max-w-[calc(50%-0.125rem)] flex-1 object-contain object-left"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex h-6 shrink-0 items-center gap-1.5 overflow-hidden">
              {showChips && weakToCount > 0 && (
                <span
                  className={[
                    'truncate rounded-full px-2 py-0.5 text-xs font-medium',
                    hasQuadWeak
                      ? 'bg-red-500/35 text-red-100 ring-1 ring-red-400/60'
                      : 'bg-red-500/20 text-red-200',
                  ].join(' ')}
                >
                  weak to {weakToCount}
                </span>
              )}
              {showChips && effectiveToCount > 0 && (
                <span
                  className={[
                    'truncate rounded-full px-2 py-0.5 text-xs font-medium',
                    hasQuadEffective
                      ? 'bg-emerald-500/35 text-emerald-100 ring-1 ring-emerald-400/60'
                      : 'bg-emerald-500/20 text-emerald-200',
                  ].join(' ')}
                >
                  effective to {effectiveToCount}
                </span>
              )}
            </div>

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

      {showTooltip && anchorRect && (
        <MatchupTooltip
          anchorRect={anchorRect}
          weakTo={weakTo}
          effectiveTo={effectiveTo}
          pokemonName={pokemonName}
        />
      )}
    </div>
  )
}
