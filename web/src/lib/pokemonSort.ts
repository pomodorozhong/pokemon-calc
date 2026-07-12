import type { MetaDatasetId, MetaUsage, Pokemon } from '@/types/pokemon'

export type SortMode = 'codex' | 'meta' | 'name'

export const META_DATASET_ORDER: MetaDatasetId[] = [
  'doubles-tournament',
  'doubles-ladder',
  'singles-tournament',
  'singles-ladder',
]

export function buildMetaUsageRank(rankings: { name: string; rank: number }[]): Record<string, number> {
  return Object.fromEntries(rankings.map((entry) => [entry.name, entry.rank]))
}

export function getAvailableMetaDatasets(metaUsage: MetaUsage) {
  return META_DATASET_ORDER
    .map((id) => metaUsage.datasets[id])
    .filter((dataset) => dataset.available)
}

export function getDefaultMetaDatasetId(metaUsage: MetaUsage): MetaDatasetId {
  const preferred = metaUsage.defaults.doubles
  if (metaUsage.datasets[preferred]?.available) return preferred
  return getAvailableMetaDatasets(metaUsage)[0]?.id ?? preferred
}

export function resolveMetaDatasetId(
  metaUsage: MetaUsage,
  preferred?: MetaDatasetId | null,
): MetaDatasetId {
  if (preferred && metaUsage.datasets[preferred]?.available) return preferred
  return getDefaultMetaDatasetId(metaUsage)
}

export function getMetaUsageRankMap(
  metaUsage: MetaUsage,
  datasetId: MetaDatasetId,
): Record<string, number> {
  const dataset = metaUsage.datasets[datasetId]
  if (!dataset?.available) return {}
  return buildMetaUsageRank(dataset.rankings)
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
