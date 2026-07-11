import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MatchupDetail } from '@/types/pokemon'
import { spriteUrl } from '@/lib/pokemon'

const TOOLTIP_WIDTH = 288
const VIEWPORT_PADDING = 12
const GAP = 10

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
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${titleColor}`}>
        {title}
      </p>
      <ul className="space-y-1.5">
        {details.map((detail) => {
          const isQuad = detail.multiplier >= 4
          const itemColor =
            variant === 'weak'
              ? isQuad
                ? 'bg-red-500/20 ring-1 ring-red-400/50'
                : 'bg-slate-800/80'
              : isQuad
                ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50'
                : 'bg-slate-800/80'

          const multiplierColor =
            variant === 'weak'
              ? isQuad
                ? 'text-red-200'
                : 'text-red-300/90'
              : isQuad
                ? 'text-emerald-200'
                : 'text-emerald-300/90'

          return (
            <li
              key={detail.opponentName}
              className={[
                'flex items-center gap-2.5 rounded-xl px-2 py-1.5',
                itemColor,
              ].join(' ')}
            >
              <img
                src={spriteUrl(detail.opponentId)}
                alt={pokemonName(detail.opponentName)}
                className="h-10 w-10 shrink-0 rounded-lg bg-slate-900 object-contain"
              />
              <span className={`min-w-0 flex-1 truncate text-sm ${isQuad ? 'font-semibold text-white' : 'text-slate-100'}`}>
                {pokemonName(detail.opponentName)}
              </span>
              <span className={`shrink-0 text-sm tabular-nums font-semibold ${multiplierColor}`}>
                {formatMultiplier(detail.multiplier)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface MatchupTooltipProps {
  anchorRect: DOMRect
  weakTo: MatchupDetail[]
  effectiveTo: MatchupDetail[]
  pokemonName: (slug: string) => string
}

export function MatchupTooltip({
  anchorRect,
  weakTo,
  effectiveTo,
  pokemonName,
}: MatchupTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null)
  const [tooltipNode, setTooltipNode] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!tooltipNode) return

    const tooltipRect = tooltipNode.getBoundingClientRect()
    const centerX = anchorRect.left + anchorRect.width / 2
    let left = centerX - TOOLTIP_WIDTH / 2
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING),
    )

    const spaceAbove = anchorRect.top - VIEWPORT_PADDING
    const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_PADDING
    const preferAbove = spaceAbove >= tooltipRect.height + GAP || spaceAbove >= spaceBelow

    let top: number
    let placement: 'above' | 'below'

    if (preferAbove) {
      top = anchorRect.top - tooltipRect.height - GAP
      placement = 'above'
      if (top < VIEWPORT_PADDING) {
        top = anchorRect.bottom + GAP
        placement = 'below'
      }
    } else {
      top = anchorRect.bottom + GAP
      placement = 'below'
      if (top + tooltipRect.height > window.innerHeight - VIEWPORT_PADDING) {
        top = anchorRect.top - tooltipRect.height - GAP
        placement = 'above'
      }
    }

    setPosition({ top, left, placement })
  }, [anchorRect, tooltipNode, weakTo.length, effectiveTo.length])

  const arrowLeft = Math.min(
    Math.max(anchorRect.left + anchorRect.width / 2 - (position?.left ?? 0), 20),
    TOOLTIP_WIDTH - 20,
  )

  return createPortal(
    <div
      ref={setTooltipNode}
      className="pointer-events-none fixed z-[100] w-72 rounded-2xl border border-slate-600 bg-slate-900/98 p-3 shadow-2xl shadow-black/50 backdrop-blur-sm"
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div className="space-y-3">
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

      {position && (
        <span
          aria-hidden
          className={[
            'absolute h-3 w-3 rotate-45 border-slate-600 bg-slate-900/98',
            position.placement === 'above'
              ? '-bottom-1.5 border-b border-r'
              : '-top-1.5 border-l border-t',
          ].join(' ')}
          style={{ left: arrowLeft - 6 }}
        />
      )}
    </div>,
    document.body,
  )
}
