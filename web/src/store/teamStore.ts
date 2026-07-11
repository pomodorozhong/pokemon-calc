import { create } from 'zustand'
import type { Pokemon, SlotTarget, TeamSide } from '@/types/pokemon'
import {
  readPersistedPrefs,
  teamToSlugs,
  writePersistedPrefs,
} from '@/lib/cookies'

const TEAM_SIZE = 6
const persisted = readPersistedPrefs()

function emptyTeam(): (Pokemon | null)[] {
  return Array.from({ length: TEAM_SIZE }, () => null)
}

function persistOurTeamAndLocale(ourTeam: (Pokemon | null)[], locale: string): void {
  writePersistedPrefs({
    locale,
    ourTeam: teamToSlugs(ourTeam),
  })
}

interface TeamState {
  ourTeam: (Pokemon | null)[]
  opponentTeam: (Pokemon | null)[]
  activeSlot: SlotTarget | null
  locale: string
  setLocale: (locale: string) => void
  openPicker: (side: TeamSide, index: number) => void
  closePicker: () => void
  assignPokemon: (pokemon: Pokemon) => void
  clearSlot: (side: TeamSide, index: number) => void
  resetTeams: () => void
  hydrateOurTeam: (pokemon: Pokemon[]) => void
}

export const useTeamStore = create<TeamState>((set, get) => ({
  ourTeam: emptyTeam(),
  opponentTeam: emptyTeam(),
  activeSlot: null,
  locale: persisted?.locale ?? 'en',

  setLocale: (locale) => {
    const { ourTeam } = get()
    persistOurTeamAndLocale(ourTeam, locale)
    set({ locale })
  },

  openPicker: (side, index) => set({ activeSlot: { side, index } }),

  closePicker: () => set({ activeSlot: null }),

  assignPokemon: (pokemon) => {
    const { activeSlot, ourTeam, opponentTeam, locale } = get()
    if (!activeSlot) return

    const team = activeSlot.side === 'ours' ? [...ourTeam] : [...opponentTeam]
    team[activeSlot.index] = pokemon

    if (activeSlot.side === 'ours') {
      persistOurTeamAndLocale(team, locale)
      set({ activeSlot: null, ourTeam: team })
      return
    }

    set({ activeSlot: null, opponentTeam: team })
  },

  clearSlot: (side, index) => {
    const { ourTeam, opponentTeam, locale } = get()
    if (side === 'ours') {
      const team = [...ourTeam]
      team[index] = null
      persistOurTeamAndLocale(team, locale)
      set({ ourTeam: team })
      return
    }

    const team = [...opponentTeam]
    team[index] = null
    set({ opponentTeam: team })
  },

  resetTeams: () => {
    const { locale } = get()
    persistOurTeamAndLocale(emptyTeam(), locale)
    set({
      ourTeam: emptyTeam(),
      opponentTeam: emptyTeam(),
      activeSlot: null,
    })
  },

  hydrateOurTeam: (pokemon) => {
    const prefs = readPersistedPrefs()
    const slugs = prefs?.ourTeam
    if (!slugs?.some(Boolean)) return

    const byName = new Map(pokemon.map((mon) => [mon.name, mon]))
    const hydrated = slugs.map((slug) => (slug ? (byName.get(slug) ?? null) : null))

    if (hydrated.some(Boolean)) {
      set({ ourTeam: hydrated })
    }
  },
}))

export const TEAM_SLOTS = TEAM_SIZE
