"use client"

import { create } from "zustand"
import { IGDBApi } from "./igdb-api"

interface IGDBStore {
  api: IGDBApi
  getCoverArt: (gameTitle: string, gameId: string, platform?: string) => Promise<string | null>
  clearCache: () => Promise<void>
  getCacheSize: () => Promise<{ totalImages: number; cacheSize: number }>
  getQueueLength: () => number
}

export const useIGDBStore = create<IGDBStore>()((set, get) => ({
  api: new IGDBApi(),

  getCoverArt: async (gameTitle: string, gameId: string, platform?: string) => {
    const { api } = get()
    return await api.getCoverArt(gameTitle, gameId, platform)
  },

  clearCache: async () => {
    const { api } = get()
    await api.clearCache()
  },

  getCacheSize: async () => {
    const { api } = get()
    return await api.getCacheSize()
  },

  getQueueLength: () => {
    const { api } = get()
    return api.getQueueLength()
  },
}))
