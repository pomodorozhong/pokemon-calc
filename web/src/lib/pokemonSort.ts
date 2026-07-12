import type { Pokemon } from '@/types/pokemon'

export type SortMode = 'codex' | 'meta' | 'name'

export function buildMetaUsageRank(rankings: { name: string; rank: number }[]): Record<string, number> {
  return Object.fromEntries(rankings.map((entry) => [entry.name, entry.rank]))
}

export function sortPokemon(
  list: Pokemon[],
  mode: SortMode,
  metaUsageRank: Record<string, number> = {},
): Pokemon[] {
  const sorted = [...list]

  switch (mode) {
    case 'codex':
      return sorted.sort((a, b) => a.id - b.id)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'meta':
      return sorted.sort((a, b) => {
        const rankA = metaUsageRank[a.name] ?? 999
        const rankB = metaUsageRank[b.name] ?? 999
        if (rankA !== rankB) return rankA - rankB
        return a.id - b.id
      })
    default:
      return sorted
  }
}

export function filterPokemon(
  list: Pokemon[],
  query: string,
  typeFilter: string | null,
  getDisplayName: (name: string) => string,
): Pokemon[] {
  const normalizedQuery = query.trim().toLowerCase()

  return list.filter((mon) => {
    const matchesType = !typeFilter || mon.types.includes(typeFilter)
    const displayName = getDisplayName(mon.name).toLowerCase()
    const matchesQuery =
      !normalizedQuery ||
      mon.name.includes(normalizedQuery) ||
      displayName.includes(normalizedQuery) ||
      String(mon.id).includes(normalizedQuery)

    return matchesType && matchesQuery
  })
}
