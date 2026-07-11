import { create } from 'zustand'
import type { Pokemon, SlotTarget, TeamSide } from '@/types/pokemon'

const TEAM_SIZE = 6

function emptyTeam(): (Pokemon | null)[] {
  return Array.from({ length: TEAM_SIZE }, () => null)
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
}

export const useTeamStore = create<TeamState>((set, get) => ({
  ourTeam: emptyTeam(),
  opponentTeam: emptyTeam(),
  activeSlot: null,
  locale: 'en',

  setLocale: (locale) => set({ locale }),

  openPicker: (side, index) => set({ activeSlot: { side, index } }),

  closePicker: () => set({ activeSlot: null }),

  assignPokemon: (pokemon) => {
    const { activeSlot, ourTeam, opponentTeam } = get()
    if (!activeSlot) return

    const team = activeSlot.side === 'ours' ? [...ourTeam] : [...opponentTeam]
    team[activeSlot.index] = pokemon

    set({
      activeSlot: null,
      ...(activeSlot.side === 'ours'
        ? { ourTeam: team }
        : { opponentTeam: team }),
    })
  },

  clearSlot: (side, index) => {
    const { ourTeam, opponentTeam } = get()
    if (side === 'ours') {
      const team = [...ourTeam]
      team[index] = null
      set({ ourTeam: team })
      return
    }

    const team = [...opponentTeam]
    team[index] = null
    set({ opponentTeam: team })
  },

  resetTeams: () =>
    set({
      ourTeam: emptyTeam(),
      opponentTeam: emptyTeam(),
      activeSlot: null,
    }),
}))

export const TEAM_SLOTS = TEAM_SIZE
