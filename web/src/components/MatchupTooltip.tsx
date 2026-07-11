import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MatchupDetail } from '@/types/pokemon'
import { spriteUrl } from '@/lib/pokemon'

const TOOLTIP_WIDTH = 288
const VIEWPORT_PADDING = 12
const GAP = 10

type TooltipPlacement = 'left' | 'right' | 'above' | 'below'

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
  side: 'ours' | 'opponent'
  weakTo: MatchupDetail[]
  effectiveTo: MatchupDetail[]
  pokemonName: (slug: string) => string
}

function fitsHorizontally(left: number, width: number): boolean {
  return left >= VIEWPORT_PADDING && left + width <= window.innerWidth - VIEWPORT_PADDING
}

function fitsVertically(top: number, height: number): boolean {
  return top >= VIEWPORT_PADDING && top + height <= window.innerHeight - VIEWPORT_PADDING
}

export function MatchupTooltip({
  anchorRect,
  side,
  weakTo,
  effectiveTo,
  pokemonName,
}: MatchupTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; placement: TooltipPlacement } | null>(null)
  const [tooltipNode, setTooltipNode] = useState<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!tooltipNode) return

    const tooltipRect = tooltipNode.getBoundingClientRect()
    const preferredHorizontal: TooltipPlacement = side === 'ours' ? 'right' : 'left'
    const fallbackHorizontal: TooltipPlacement = side === 'ours' ? 'left' : 'right'

    const centerY = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2
    const clampedCenterY = Math.max(
      VIEWPORT_PADDING,
      Math.min(centerY, window.innerHeight - tooltipRect.height - VIEWPORT_PADDING),
    )

    const rightLeft = anchorRect.right + GAP
    const leftLeft = anchorRect.left - TOOLTIP_WIDTH - GAP
    const centerX = anchorRect.left + anchorRect.width / 2 - TOOLTIP_WIDTH / 2

    let top = clampedCenterY
    let left = side === 'ours' ? rightLeft : leftLeft
    let placement: TooltipPlacement = preferredHorizontal

    if (preferredHorizontal === 'right' && fitsHorizontally(rightLeft, TOOLTIP_WIDTH)) {
      left = rightLeft
      placement = 'right'
    } else if (preferredHorizontal === 'left' && fitsHorizontally(leftLeft, TOOLTIP_WIDTH)) {
      left = leftLeft
      placement = 'left'
    } else if (fallbackHorizontal === 'right' && fitsHorizontally(rightLeft, TOOLTIP_WIDTH)) {
      left = rightLeft
      placement = 'right'
    } else if (fallbackHorizontal === 'left' && fitsHorizontally(leftLeft, TOOLTIP_WIDTH)) {
      left = leftLeft
      placement = 'left'
    } else {
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(centerX, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING),
      )

      const belowTop = anchorRect.bottom + GAP
      const aboveTop = anchorRect.top - tooltipRect.height - GAP

      if (fitsVertically(belowTop, tooltipRect.height)) {
        top = belowTop
        placement = 'below'
      } else if (fitsVertically(aboveTop, tooltipRect.height)) {
        top = aboveTop
        placement = 'above'
      } else {
        top = clampedCenterY
        placement = preferredHorizontal
      }
    }

    setPosition({ top, left, placement })
  }, [anchorRect, side, tooltipNode, weakTo.length, effectiveTo.length])

  const arrowStyle = (() => {
    if (!position) return undefined

    if (position.placement === 'right') {
      return { top: anchorRect.top + anchorRect.height / 2 - position.top - 6 }
    }
    if (position.placement === 'left') {
      return { top: anchorRect.top + anchorRect.height / 2 - position.top - 6 }
    }
    return {
      left: Math.min(
        Math.max(anchorRect.left + anchorRect.width / 2 - position.left, 20),
        TOOLTIP_WIDTH - 20,
      ) - 6,
    }
  })()

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
            position.placement === 'right' && '-left-1.5 border-b border-l',
            position.placement === 'left' && '-right-1.5 border-r border-t',
            position.placement === 'above' && '-bottom-1.5 border-b border-r',
            position.placement === 'below' && '-top-1.5 border-l border-t',
          ]
            .filter(Boolean)
            .join(' ')}
          style={arrowStyle}
        />
      )}
    </div>,
    document.body,
  )
}
