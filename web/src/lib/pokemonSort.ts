import type { Pokemon } from '@/types/pokemon'

export type SortMode = 'codex' | 'meta' | 'name'

const META_USAGE_RANK: Record<string, number> = {
  'incineroar': 1,
  'rillaboom': 2,
  'amoonguss': 3,
  'flutter-mane': 4,
  'landorus': 5,
  'gholdengo': 6,
  'urshifu-rapid-strike': 7,
  'urshifu-single-strike': 8,
  'tornadus': 9,
  'kingambit': 10,
  'garchomp': 11,
  'dragapult': 12,
  'palafin-hero': 13,
  'ogerpon-hearthflame': 14,
  'ogerpon-wellspring': 15,
  'ogerpon-cornerstone': 16,
  'ogerpon': 17,
  'archaludon': 18,
  'gouging-fire': 19,
  'raging-bolt': 20,
}

export function sortPokemon(list: Pokemon[], mode: SortMode): Pokemon[] {
  const sorted = [...list]

  switch (mode) {
    case 'codex':
      return sorted.sort((a, b) => a.id - b.id)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'meta':
      return sorted.sort((a, b) => {
        const rankA = META_USAGE_RANK[a.name] ?? 999
        const rankB = META_USAGE_RANK[b.name] ?? 999
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
