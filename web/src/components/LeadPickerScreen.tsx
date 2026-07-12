import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { dismissTips, readPersistedPrefs } from '@/lib/cookies'
import type { Pokemon, TypeChart } from '@/types/pokemon'
import {
  loadMetaUsage,
  loadPokemon,
  loadPokemonNames,
  loadTypeChart,
  loadTypeNames,
  loadUiStrings,
} from '@/lib/pokemon'
import {
  getDefaultMetaDatasetId,
} from '@/lib/pokemonSort'
import type { MetaDatasetId, MetaUsage } from '@/types/pokemon'
import { analyzeTeam, topRecommendations } from '@/lib/matchup'
import { useI18n } from '@/hooks/useI18n'
import { useTeamStore } from '@/store/teamStore'
import { TeamSidePanel } from '@/components/TeamSidePanel'
import { PokemonPicker } from '@/components/PokemonPicker'

export function LeadPickerScreen() {
  const ourTeam = useTeamStore((s) => s.ourTeam)
  const opponentTeam = useTeamStore((s) => s.opponentTeam)
  const locale = useTeamStore((s) => s.locale)
  const setLocale = useTeamStore((s) => s.setLocale)
  const resetTeams = useTeamStore((s) => s.resetTeams)
  const hydrateOurTeam = useTeamStore((s) => s.hydrateOurTeam)

  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [typeChart, setTypeChart] = useState<TypeChart | null>(null)
  const [ui, setUi] = useState<Record<string, string> | null>(null)
  const [pokemonNames, setPokemonNames] = useState<Record<string, string> | null>(null)
  const [typeNames, setTypeNames] = useState<Record<string, string> | null>(null)
  const [metaUsage, setMetaUsage] = useState<MetaUsage | null>(null)
  const [metaDatasetId, setMetaDatasetId] = useState<MetaDatasetId>('doubles-tournament')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipsVisible, setTipsVisible] = useState(
    () => !readPersistedPrefs()?.tipsDismissed,
  )
  const hasHydratedTeam = useRef(false)

  function hideTips(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    dismissTips()
    setTipsVisible(false)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [mons, chart, metaUsage, uiStrings, names, types] = await Promise.all([
          loadPokemon(),
          loadTypeChart(),
          loadMetaUsage(),
          loadUiStrings(locale),
          loadPokemonNames(locale),
          loadTypeNames(locale),
        ])
        if (cancelled) return
        setPokemon(mons)
        if (!hasHydratedTeam.current) {
          hydrateOurTeam(mons)
          hasHydratedTeam.current = true
        }
        setTypeChart(chart)
        setMetaUsage(metaUsage)
        setMetaDatasetId(getDefaultMetaDatasetId(metaUsage))
        setUi(uiStrings)
        setPokemonNames(names)
        setTypeNames(types)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [locale])

  const { t, pokemonName, typeName } = useI18n(ui, pokemonNames, typeNames)

  const ourSummaries = useMemo(() => {
    if (!typeChart) return new Map()
    return analyzeTeam(typeChart, ourTeam, opponentTeam)
  }, [typeChart, ourTeam, opponentTeam])

  const opponentSummaries = useMemo(() => {
    if (!typeChart) return new Map()
    return analyzeTeam(typeChart, opponentTeam, ourTeam)
  }, [typeChart, opponentTeam, ourTeam])

  const ourRecommendations = useMemo(
    () => topRecommendations(ourSummaries),
    [ourSummaries],
  )

  const opponentRecommendations = useMemo(
    () => topRecommendations(opponentSummaries),
    [opponentSummaries],
  )

  const opponentFilled = opponentTeam.some(Boolean)
  const showAnalysis = ourTeam.some(Boolean) && opponentFilled

  const typeOptions = useMemo(() => {
    if (!typeChart) return []
    return typeChart.types.filter((type) => type !== 'shadow')
  }, [typeChart])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        Loading regulation data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-red-300">
        {error}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            {t('regulation.current', 'Regulation M-B')}
          </p>
          <h1 className="text-3xl font-bold text-white">
            {t('app.title', 'Pokemon Calc')}
          </h1>
          <p className="text-slate-400">
            {t('app.subtitle', 'Pick your leads with type matchups')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400" htmlFor="locale-select">
            {t('settings.language', 'Language')}
          </label>
          <select
            id="locale-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="en">English</option>
            <option value="zh-Hans">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
            <option value="ja">日本語</option>
          </select>
          <button
            type="button"
            onClick={resetTeams}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reset teams
          </button>
        </div>
      </header>

      {tipsVisible ? (
        <div
          role="note"
          className="relative rounded-2xl border border-blue-500/30 border-l-4 border-l-blue-400 bg-blue-950/20 px-4 py-3 pr-12 text-sm text-slate-300"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              💡
            </span>
            <p className="font-semibold text-blue-200">
              {t('tips.title', 'Tip')}
            </p>
          </div>
          <ul className="space-y-1.5 pl-1">
            <li>
              <span className="font-medium text-blue-300">
                {t('tips.beforeMatch.label', 'Before the match')}
              </span>
              {' — '}
              {t('tips.beforeMatch.body', 'build your team on the left.')}
            </li>
            <li>
              <span className="font-medium text-red-300">
                {t('tips.teamPreview.label', 'During team preview')}
              </span>
              {' — '}
              {t(
                'tips.teamPreview.body',
                'add revealed opponent Pokémon on the right.',
              )}
            </li>
          </ul>
          <p className="mt-2 text-slate-400">
            {showAnalysis
              ? t(
                  'tips.analysisActive',
                  'Type matchup chips and top-3 highlights are live on both sides.',
                )
              : t(
                  'tips.analysisHint',
                  'Add opponent Pokémon to unlock weakness and lead recommendation chips.',
                )}
          </p>
          <button
            type="button"
            onClick={hideTips}
            aria-label={t('tips.dismiss', 'Dismiss tip')}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-200"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <TeamSidePanel
          title="Your team"
          subtitle="Bring 6 — pick your best leads"
          side="ours"
          team={ourTeam}
          recommendations={ourRecommendations}
          summaries={ourSummaries}
          pokemonName={pokemonName}
        />

        <div className="hidden w-px bg-slate-700 lg:block" />

        <TeamSidePanel
          title="Opponent"
          subtitle="Fill in as Pokemon are revealed"
          side="opponent"
          team={opponentTeam}
          recommendations={opponentRecommendations}
          summaries={opponentSummaries}
          pokemonName={pokemonName}
        />
      </div>

      <PokemonPicker
        pokemon={pokemon}
        typeOptions={typeOptions}
        metaUsage={metaUsage}
        metaDatasetId={metaDatasetId}
        onMetaDatasetChange={setMetaDatasetId}
        pokemonName={pokemonName}
        typeName={typeName}
      />
    </div>
  )
}
