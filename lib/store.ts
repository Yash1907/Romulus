import { create } from "zustand"
import type { Game } from "./types"
import { TSVManager } from "./tsv-manager"

interface GameStore {
  searchResults: Game[]
  isLoading: boolean
  searchTerm: string
  filters: {
    consoles: string[]
    regions: string[]
  }
  lastUpdated: Date | null
  refreshProgress: {
    platform: string
    current: number
    total: number
  } | null

  setSearchTerm: (term: string) => Promise<void>
  setFilters: (filters: { consoles: string[]; regions: string[] }) => Promise<void>
  refreshTSVs: () => Promise<void>
  getTSVInfo: () => Promise<{ platform: string; gameCount: number; size: string }[]>
  getAvailableTSVs: () => Promise<Array<{ filename: string; timestamp: number | null }>>
  clearCache: () => Promise<void>
}

const tsvManager = new TSVManager()

// Platform configuration matching your Python script
const PLATFORMS = [
  {
    name: "Nintendo - Game Boy",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy/"],
  },
  {
    name: "Nintendo - Game Boy Color",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Color/"],
  },
  {
    name: "Nintendo - Game Boy Advance",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Game%20Boy%20Advance/"],
  },
  {
    name: "Nintendo - Nintendo DS",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DS%20(Decrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DS%20(Encrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DSi%20(Decrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20DSi%20(Encrypted)/",
    ],
  },
  {
    name: "Nintendo - Nintendo 3DS",
    urls: [
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%203DS%20(Decrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%203DS%20(Encrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20New%20Nintendo%203DS%20(Decrypted)/",
      "https://myrient.erista.me/files/No-Intro/Nintendo%20-%20New%20Nintendo%203DS%20(Encrypted)/",
    ],
  },
  {
    name: "Sony - PlayStation Portable",
    urls: ["https://nopaystation.com/tsv/PSP_GAMES.tsv"],
  },
  {
    name: "Sony - PlayStation 3",
    urls: ["https://nopaystation.com/tsv/PS3_GAMES.tsv"],
  },
  {
    name: "Sega - Mega Drive - Genesis",
    urls: ["https://myrient.erista.me/files/No-Intro/Sega%20-%20Mega%20Drive%20-%20Genesis/"],
  },
  {
    name: "Nintendo - Nintendo Entertainment System",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Nintendo%20Entertainment%20System%20(Headered)/"],
  },
  {
    name: "Nintendo - Super Nintendo Entertainment System",
    urls: ["https://myrient.erista.me/files/No-Intro/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System/"],
  },
]

export const useGameStore = create<GameStore>((set, get) => ({
  searchResults: [],
  isLoading: false,
  searchTerm: "",
  filters: {
    consoles: [],
    regions: [],
  },
  lastUpdated: null,
  refreshProgress: null,

  setSearchTerm: async (term: string) => {
    set({ searchTerm: term })

    if (term.trim()) {
      const { filters } = get()
      const results = await tsvManager.searchGames(term, filters)
      set({ searchResults: results })
    } else {
      set({ searchResults: [] })
    }
  },

  setFilters: async (filters: { consoles: string[]; regions: string[] }) => {
    set({ filters })

    const { searchTerm } = get()
    if (searchTerm.trim()) {
      const results = await tsvManager.searchGames(searchTerm, filters)
      set({ searchResults: results })
    }
  },

  refreshTSVs: async () => {
    set({ isLoading: true, refreshProgress: null })

    try {
      await tsvManager.scrapeTSVFiles(PLATFORMS, (platform, current, total) => {
        set({ refreshProgress: { platform, current, total } })
      })

      const lastUpdated = await tsvManager.getLastUpdated()
      set({
        lastUpdated,
        refreshProgress: null,
      })

      // Refresh search results if there's an active search
      const { searchTerm, filters } = get()
      if (searchTerm.trim()) {
        const results = await tsvManager.searchGames(searchTerm, filters)
        set({ searchResults: results })
      }
    } catch (error) {
      console.error("Failed to refresh TSVs:", error)
      throw error
    } finally {
      set({ isLoading: false, refreshProgress: null })
    }
  },

  getTSVInfo: async () => {
    return await tsvManager.getTSVInfo()
  },

  getAvailableTSVs: async () => {
    return await tsvManager.getAvailableTSVs()
  },

  clearCache: async () => {
    await tsvManager.clearCache()
    set({
      searchResults: [],
      lastUpdated: null,
      searchTerm: "",
      filters: { consoles: [], regions: [] },
    })
  },
}))
