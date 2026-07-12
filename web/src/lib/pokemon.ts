import type { MetaUsage, Pokemon, TypeChart, TypeRelations } from '@/types/pokemon'

const BASE = import.meta.env.BASE_URL

export const DATA_BASE = `${BASE}data/champions/reg-mb`
export const SPRITE_BASE = `${BASE}assets/sprites`

export function spriteUrl(pokemonId: number): string {
  return `${SPRITE_BASE}/pokemon/${pokemonId}.png`
}

export function typeSpriteUrl(type: string): string {
  return `${SPRITE_BASE}/types/${type}.png`
}

export async function loadPokemon(): Promise<Pokemon[]> {
  const res = await fetch(`${DATA_BASE}/pokemon.json`)
  if (!res.ok) throw new Error('Failed to load Pokemon data')
  return res.json()
}

export async function loadTypeChart(): Promise<TypeChart> {
  const res = await fetch(`${DATA_BASE}/type-chart.json`)
  if (!res.ok) throw new Error('Failed to load type chart')
  return res.json()
}

export async function loadMetaUsage(): Promise<MetaUsage> {
  const res = await fetch(`${DATA_BASE}/meta-usage.json`)
  if (!res.ok) throw new Error('Failed to load meta usage data')
  return res.json()
}

export async function loadUiStrings(locale: string): Promise<Record<string, string>> {
  const res = await fetch(`${DATA_BASE}/i18n/${locale}/ui.json`)
  if (!res.ok) throw new Error(`Failed to load UI strings for ${locale}`)
  return res.json()
}

export async function loadPokemonNames(locale: string): Promise<Record<string, string>> {
  const res = await fetch(`${DATA_BASE}/i18n/${locale}/pokemon.json`)
  if (!res.ok) throw new Error(`Failed to load Pokemon names for ${locale}`)
  return res.json()
}

export async function loadTypeNames(locale: string): Promise<Record<string, string>> {
  const res = await fetch(`${DATA_BASE}/i18n/${locale}/types.json`)
  if (!res.ok) throw new Error(`Failed to load type names for ${locale}`)
  return res.json()
}

export function getRelation(chart: TypeChart, type: string): TypeRelations {
  return chart.relations[type]
}

export function attackMultiplier(
  chart: TypeChart,
  attackType: string,
  defenderTypes: string[],
): number {
  const relation = getRelation(chart, attackType)
  return defenderTypes.reduce((total, defenderType) => {
    if (relation.no_damage_to.includes(defenderType)) return 0
    if (relation.double_damage_to.includes(defenderType)) return total * 2
    if (relation.half_damage_to.includes(defenderType)) return total * 0.5
    return total
  }, 1)
}

export function offensiveMultiplier(
  chart: TypeChart,
  attackerTypes: string[],
  defenderTypes: string[],
): number {
  return Math.max(
    ...attackerTypes.map((type) => attackMultiplier(chart, type, defenderTypes)),
    0,
  )
}

export function defensiveMultiplier(
  chart: TypeChart,
  defenderTypes: string[],
  attackerTypes: string[],
): number {
  return Math.max(
    ...attackerTypes.map((type) => attackMultiplier(chart, type, defenderTypes)),
    0,
  )
}

export function isSuperEffective(multiplier: number): boolean {
  return multiplier >= 2
}

export function isWeakTo(multiplier: number): boolean {
  return multiplier >= 2
}

export function isNotVeryEffective(multiplier: number): boolean {
  return multiplier > 0 && multiplier < 1
}

export function isImmune(multiplier: number): boolean {
  return multiplier === 0
}

export function uniquePokemon(team: (Pokemon | null)[]): Pokemon[] {
  const seen = new Set<string>()
  const result: Pokemon[] = []
  for (const mon of team) {
    if (!mon || seen.has(mon.name)) continue
    seen.add(mon.name)
    result.push(mon)
  }
  return result
}
