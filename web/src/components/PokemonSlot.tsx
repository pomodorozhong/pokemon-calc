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
      {highlighted && pokemon && (
        <span className="pointer-events-none absolute right-3 top-0 z-10 -translate-y-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900 shadow-sm">
          top pick
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        className={[
          'group relative flex h-[4.75rem] w-full items-center gap-3 rounded-xl border-2 bg-slate-900/70 px-3 text-left transition',
          borderColor,
          highlighted ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'hover:bg-slate-800/80',
          !pokemon ? 'border-dashed' : 'border-solid',
        ].join(' ')}
      >
        <span className="w-10 shrink-0 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400">
          {label}
        </span>

        {pokemon ? (
          <>
            <img
              src={spriteUrl(pokemon.id)}
              alt={pokemonName(pokemon.name)}
              className="h-12 w-12 shrink-0 rounded-lg bg-slate-800 object-contain"
              loading="lazy"
            />

            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate font-semibold text-white">
                {pokemonName(pokemon.name)}
              </p>
              <div className="mt-0.5 flex min-w-0 gap-1 overflow-hidden">
                {pokemon.types.map((type) => (
                  <img
                    key={type}
                    src={typeSpriteUrl(type)}
                    alt={type}
                    title={type}
                    className="h-4 min-w-0 max-w-[calc(50%-0.125rem)] flex-1 object-contain object-left"
                  />
                ))}
              </div>
            </div>

            <div className="flex h-6 w-36 shrink-0 items-center justify-end gap-1.5 overflow-hidden">
              {showChips && weakToCount > 0 && (
                <span
                  className={[
                    'truncate rounded-full px-2 py-0.5 text-[11px] font-medium',
                    hasQuadWeak
                      ? 'bg-red-500/35 text-red-100 ring-1 ring-red-400/60'
                      : 'bg-red-500/20 text-red-200',
                  ].join(' ')}
                >
                  weak {weakToCount}
                </span>
              )}
              {showChips && effectiveToCount > 0 && (
                <span
                  className={[
                    'truncate rounded-full px-2 py-0.5 text-[11px] font-medium',
                    hasQuadEffective
                      ? 'bg-emerald-500/35 text-emerald-100 ring-1 ring-emerald-400/60'
                      : 'bg-emerald-500/20 text-emerald-200',
                  ].join(' ')}
                >
                  eff. {effectiveToCount}
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
                className="absolute right-2 top-1.5 rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-300 opacity-0 transition group-hover:opacity-100"
              >
                clear
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center gap-2 text-slate-400">
            <span className="text-2xl leading-none">+</span>
            <span className="text-sm">Add Pokemon</span>
          </div>
        )}
      </button>

      {showTooltip && anchorRect && (
        <MatchupTooltip
          anchorRect={anchorRect}
          side={side}
          weakTo={weakTo}
          effectiveTo={effectiveTo}
          pokemonName={pokemonName}
        />
      )}
    </div>
  )
}
