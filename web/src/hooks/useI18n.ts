import { useMemo } from 'react'
import { useTeamStore } from '@/store/teamStore'

type Dictionary = Record<string, string>

export function useI18n(ui: Dictionary | null, pokemonNames: Dictionary | null, typeNames: Dictionary | null) {
  const locale = useTeamStore((s) => s.locale)

  return useMemo(() => {
    const t = (key: string, fallback?: string) => ui?.[key] ?? fallback ?? key

    const pokemonName = (slug: string) =>
      pokemonNames?.[slug] ?? slug.replace(/-/g, ' ')

    const typeName = (slug: string) =>
      typeNames?.[slug] ?? slug.replace(/-/g, ' ')

    return { locale, t, pokemonName, typeName }
  }, [locale, ui, pokemonNames, typeNames])
}
