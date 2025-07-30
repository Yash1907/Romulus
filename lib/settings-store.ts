"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Settings } from "./types"

interface SettingsStore {
  settings: Settings
  updateSettings: (settings: Settings) => void
}

const defaultSettings: Settings = {
  concurrentDownloads: 2,
  downloadPaths: {},
  grayscaleMode: true,
  primaryColor: "#3b82f6",
  secondaryColor: "#1e40af",
  accentColor: "#60a5fa",
  backgroundColor: "#111827", // Added background color
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (settings) => set({ settings }),
    }),
    {
      name: "romulus-settings-store",
    },
  ),
)
