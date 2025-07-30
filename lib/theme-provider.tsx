"use client"

import type React from "react"
import { createContext, useContext, useEffect } from "react"
import { useSettingsStore } from "./settings-store"

interface ThemeContextType {
  applyTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore()

  const applyTheme = () => {
    const root = document.documentElement

    if (settings.grayscaleMode) {
      // Apply grayscale theme
      root.style.setProperty("--primary-color", "#6b7280")
      root.style.setProperty("--secondary-color", "#4b5563")
      root.style.setProperty("--accent-color", "#9ca3af")
      root.style.setProperty("--bg-primary", "#111827")
      root.style.setProperty("--bg-secondary", "#1f2937")
      root.style.setProperty("--bg-tertiary", "#374151")
      root.style.setProperty("--text-primary", "#f9fafb")
      root.style.setProperty("--text-secondary", "#d1d5db")
      root.style.setProperty("--border-color", "#4b5563")
    } else {
      // Apply custom colors - use only the 4 specified colors
      root.style.setProperty("--primary-color", settings.primaryColor)
      root.style.setProperty("--secondary-color", settings.secondaryColor)
      root.style.setProperty("--accent-color", settings.accentColor)
      root.style.setProperty("--bg-primary", settings.backgroundColor)

      // Generate variations of the specified colors
      const primaryRgb = hexToRgb(settings.primaryColor)
      const secondaryRgb = hexToRgb(settings.secondaryColor)
      const backgroundRgb = hexToRgb(settings.backgroundColor)

      if (primaryRgb && secondaryRgb && backgroundRgb) {
        // Use secondary color for secondary background
        root.style.setProperty("--bg-secondary", settings.secondaryColor)

        // Use primary color for tertiary background
        root.style.setProperty("--bg-tertiary", settings.primaryColor)

        // Text colors - use high contrast
        const bgLuminance = getLuminance(backgroundRgb)
        if (bgLuminance > 0.5) {
          // Light background - use dark text
          root.style.setProperty("--text-primary", "#000000")
          root.style.setProperty("--text-secondary", "#333333")
        } else {
          // Dark background - use light text
          root.style.setProperty("--text-primary", "#ffffff")
          root.style.setProperty("--text-secondary", "#cccccc")
        }
      }

      root.style.setProperty("--border-color", settings.accentColor)
    }
  }

  useEffect(() => {
    applyTheme()
  }, [settings])

  return <ThemeContext.Provider value={{ applyTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}
