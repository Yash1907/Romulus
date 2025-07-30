import type { Game } from "./types"

// Remove all mock data - this file now only provides utility functions
// Real data comes from TSV files via TSVManager

export function normalizeLocation(location: string): string {
  const locationMap: Record<string, string> = {
    usa: "US",
    europe: "EU",
    na: "US",
    eu: "EU",
    jpn: "JP",
    japan: "JP",
    world: "World",
  }

  return locationMap[location.toLowerCase()] || location
}

export function normalizeLanguages(languages: string[]): string {
  const recognizedLanguages: Record<string, string> = {
    en: "English",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    sv: "Swedish",
    fi: "Finnish",
    cs: "Czech",
    sl: "Slovenian",
    jp: "Japanese",
  }

  return languages
    .map((lang) => recognizedLanguages[lang.toLowerCase()] || lang)
    .filter(Boolean)
    .join(", ")
}

// TSV parsing function that replicates the Python logic
export function parseTSVData(tsvContent: string, platform: string): Game[] {
  const lines = tsvContent.split("\n")
  const games: Game[] = []

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = line.split("\t")
    if (columns.length >= 8) {
      games.push({
        href: columns[0],
        title: columns[1],
        size: columns[2],
        location: normalizeLocation(columns[3]),
        special: columns[4],
        languages: columns[5],
        archive: columns[6],
        platform: columns[7] || platform,
      })
    }
  }

  return games
}
