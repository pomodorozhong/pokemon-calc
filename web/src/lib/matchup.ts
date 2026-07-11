import type { MatchupSummary, Pokemon, TypeChart } from '@/types/pokemon'
import {
  defensiveMultiplier,
  isSuperEffective,
  isWeakTo,
  offensiveMultiplier,
  uniquePokemon,
} from '@/lib/pokemon'

export function summarizeMatchup(
  chart: TypeChart,
  mon: Pokemon,
  opponents: Pokemon[],
): MatchupSummary {
  let weakToCount = 0
  let effectiveToCount = 0
  let score = 0
  const weakTo: MatchupSummary['weakTo'] = []
  const effectiveTo: MatchupSummary['effectiveTo'] = []

  for (const opponent of opponents) {
    const offense = offensiveMultiplier(chart, mon.types, opponent.types)
    const defense = defensiveMultiplier(chart, mon.types, opponent.types)

    if (isSuperEffective(offense)) {
      effectiveToCount += 1
      effectiveTo.push({ opponentName: opponent.name, multiplier: offense })
      score += offense >= 4 ? 2 : 1
    } else if (offense > 0 && offense < 1) {
      score -= 0.5
    }

    if (isWeakTo(defense)) {
      weakToCount += 1
      weakTo.push({ opponentName: opponent.name, multiplier: defense })
      score -= defense >= 4 ? 2 : 1
    } else if (defense > 0 && defense < 1) {
      score += 0.5
    }
  }

  return { weakToCount, effectiveToCount, score, weakTo, effectiveTo }
}

export function analyzeTeam(
  chart: TypeChart,
  team: (Pokemon | null)[],
  opponents: (Pokemon | null)[],
): Map<string, MatchupSummary> {
  const filledOpponents = uniquePokemon(opponents)
  const summaries = new Map<string, MatchupSummary>()

  if (filledOpponents.length === 0) return summaries

  for (const mon of team) {
    if (!mon) continue
    summaries.set(mon.name, summarizeMatchup(chart, mon, filledOpponents))
  }

  return summaries
}

export function topRecommendations(
  summaries: Map<string, MatchupSummary>,
  limit = 3,
): Set<string> {
  const ranked = [...summaries.entries()]
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score
      if (b[1].effectiveToCount !== a[1].effectiveToCount) {
        return b[1].effectiveToCount - a[1].effectiveToCount
      }
      return a[1].weakToCount - b[1].weakToCount
    })
    .slice(0, limit)
    .filter(([, summary]) => summary.score > -Infinity)

  return new Set(ranked.map(([name]) => name))
}
