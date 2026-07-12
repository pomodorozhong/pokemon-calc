export interface PokemonAbility {
  name: string
  is_hidden: boolean
  slot: number
}

export interface PokemonStats {
  hp: number
  attack: number
  defense: number
  'special-attack': number
  'special-defense': number
  speed: number
}

export interface PokemonSprites {
  official_artwork: string
  front_default: string
}

export interface PokemonRegulation {
  legal: boolean
  is_mega: boolean
  mega_new_in_mb: boolean
}

export interface Pokemon {
  id: number
  name: string
  types: string[]
  abilities: PokemonAbility[]
  stats: PokemonStats
  sprites: PokemonSprites
  regulation: PokemonRegulation
}

export interface TypeRelations {
  double_damage_to: string[]
  half_damage_to: string[]
  no_damage_to: string[]
  double_damage_from: string[]
  half_damage_from: string[]
  no_damage_from: string[]
}

export interface TypeChart {
  types: string[]
  relations: Record<string, TypeRelations>
}

export type TeamSide = 'ours' | 'opponent'

export interface SlotTarget {
  side: TeamSide
  index: number
}

export interface MatchupDetail {
  opponentName: string
  opponentId: number
  multiplier: number
}

export interface MatchupSummary {
  weakToCount: number
  effectiveToCount: number
  score: number
  weakTo: MatchupDetail[]
  effectiveTo: MatchupDetail[]
}

export interface MetaUsageRanking {
  rank: number
  name: string
  count: number
  usage_pct: number
}

export type MetaDatasetId =
  | 'doubles-tournament'
  | 'doubles-ladder'
  | 'singles-tournament'
  | 'singles-ladder'

export interface MetaUsageDataset {
  id: MetaDatasetId
  label: string
  battle_type: 'doubles' | 'singles'
  source_type: 'tournament' | 'ladder'
  available: boolean
  reason?: string
  usage_metric?: 'team_rate' | 'battle_rate' | 'rank_rate'
  teams_tracked?: number
  tournaments?: number
  battles_tracked?: number
  pokemon_tracked?: number
  source?: {
    name: string
    url: string
    description?: string
    format_code?: string
    game?: string
    format?: string
  }
  rankings: MetaUsageRanking[]
}

export interface MetaUsage {
  regulation: string
  generated_at: string
  defaults: {
    doubles: MetaDatasetId
    singles: MetaDatasetId
  }
  datasets: Record<MetaDatasetId, MetaUsageDataset>
}
