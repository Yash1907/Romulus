import type { Game } from "./types"
import { IndexedDBManager } from "./indexed-db"
import { TSVScraper } from "./tsv-scraper"
import { platform } from "os"

export class TSVManager {
  private dbManager = new IndexedDBManager()
  private scraper = new TSVScraper()
  private initialized = false

  // Regex patterns matching your Python script exactly
  private locationPattern = /$$USA|Europe|Japan|NA|EU|JPN|World$$/gi
  private specialPattern = /$$Beta|Aftermarket|Unl|Emulator Version|Demo|DLC|Hardware Version$$/gi
  private languagesPattern = /$$En|Fr|De|Es|It|Sv|Fi|Cs|Sl$$/gi
  private fileFormatPattern = /\.(\w+)$/

  private locationMap: Record<string, string> = {
    usa: "US",
    europe: "EU",
    na: "US",
    eu: "EU",
    jpn: "JP",
    japan: "JP",
    world: "World",
  }

  private recognizedLanguages: Record<string, string> = {
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

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.dbManager.init()
      this.initialized = true
    }
  }

  // CORS-safe fetch using our API route
  private async corsafeFetch(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch("/api/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, options }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  }

  // Save TSV file using IndexedDB
  private async saveTSVFile(filename: string, content: string): Promise<void> {
    await this.ensureInitialized()
    await this.dbManager.saveTSVFile(filename, content)
  }

  // Load TSV file from IndexedDB
  private async loadTSVFile(filename: string): Promise<string | null> {
    await this.ensureInitialized()
    return await this.dbManager.getTSVFile(filename)
  }

  // Generate TSV content from games array
  private generateTSVContent(games: Game[]): string {
    const header = "href\ttitle\tsize\tlocation\tspecial\tlanguages\tarchive\tplatform"
    const rows = games.map((game) =>
      [game.href, game.title, game.size, game.location, game.special, game.languages, game.archive, game.platform].join(
        "\t",
      ),
    )
    return [header, ...rows].join("\n")
  }

  // Save games to IndexedDB as TSV content
  private async saveGamesAsTSV(platform: string, games: Game[]): Promise<void> {
    await this.ensureInitialized()

    // Convert games to TSV format
    const header = "href\ttitle\tsize\tlocation\tspecial\tlanguages\tarchive\tplatform"
    const rows = games.map((game) =>
      [game.href, game.title, game.size, game.location, game.special, game.languages, game.archive, game.platform].join(
        "\t",
      ),
    )
    const tsvContent = [header, ...rows].join("\n")

    await this.dbManager.saveTSVFile(platform, tsvContent)
    console.log(`Saved ${games.length} games for platform ${platform}`)
  }

  // Load games from IndexedDB TSV content
  private async loadGamesFromTSV(platform: string): Promise<Game[]> {
    await this.ensureInitialized()
    const tsvContent = await this.dbManager.getTSVFile(platform)

    if (!tsvContent) return []

    return this.parseTSVContent(tsvContent)
  }

  // Parse TSV content to games array
  private parseTSVContent(content: string): Game[] {
    const lines = content.split("\n")
    const games: Game[] = []

    if (lines.length < 2) return games

    // Skip header row
    let j = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const columns = line.split("\t")
      if (columns.length >= 8) {
        j++;
        games.push({
          href: columns[0] || "",
          title: columns[1] || "",
          size: columns[2] || "",
          location: columns[3] || "",
          special: columns[4] || "No",
          languages: columns[5] || "",
          archive: columns[6] || "",
          platform: columns[7] || "",
          id: `${columns[7]}_${j}`
        })
      }
    }

    return games
  }

  // Scrape and save TSV file for NoPayStation or other platforms
  async scrapeAndSaveTSV(url: string, platform: string, filename: string): Promise<void> {
    try {
      console.log(`Scraping ${platform} from ${url}`)

      if (url.includes("nopaystation")) {
        // Fetch TSV directly for NoPayStation using CORS-safe fetch
        try {
          const result = await this.corsafeFetch(url)
          if (result.data && result.contentType.includes("text/")) {
            await this.saveTSVFile(filename, result.data)
            return
          }
        } catch (error) {
          console.error(`CORS-safe fetch failed for ${url}:`, error)
          throw error
        }
      }

      // Use CORS-safe fetch for HTML scraping
      const result = await this.corsafeFetch(url)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error("No data received from server")
      }

      // Parse HTML and convert to TSV using Python-like logic
      const games = this.parseHTMLLikePython(result.data, url, platform)
      const tsvContent = this.generateTSVContent(games)
      await this.saveTSVFile(filename, tsvContent)

      console.log(`Saved TSV for ${platform} (${filename}) - ${games.length} games`)
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error)
      throw error
    }
  }

  // Parse HTML using logic that matches your Python script exactly
  private parseHTMLLikePython(html: string, baseUrl: string, platform: string): Game[] {
    const games: Game[] = []

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")

      const tbody = doc.querySelector("tbody")
      if (!tbody) {
        console.warn("No tbody found in HTML")
        return games
      }

      const rows = Array.from(tbody.querySelectorAll("tr")).slice(1) // Skip header row
      let j = 0;
      for (const row of rows) {
        const tds = row.querySelectorAll("td")
        if (tds.length < 2) continue

        const linkTd = tds[0]
        const sizeTd = tds[1]

        const aTag = linkTd.querySelector("a")
        if (!aTag) continue

        const href = aTag.getAttribute("href")
        if (!href) continue

        let title = aTag.textContent?.trim() || ""
        const size = sizeTd.textContent?.trim() || ""

        // Extract location using exact Python logic
        const locationMatches = Array.from(title.matchAll(this.locationPattern))
        let location = "MISSING"
        if (locationMatches.length > 0) {
          const locations = locationMatches
            .map((match) => this.locationMap[match[1].toLowerCase()] || match[1])
            .filter(Boolean)
          location = locations.includes("World") ? "World" : locations.join(", ")
        }

        // Extract languages using exact Python logic
        const languageMatches = Array.from(title.matchAll(this.languagesPattern))
        let languages = ""
        if (languageMatches.length > 0) {
          const recognizedLangs = languageMatches
            .map((match) => this.recognizedLanguages[match[1].toLowerCase()])
            .filter(Boolean)
          languages = recognizedLangs.join(", ")
        }

        // Default language logic matching Python
        if (languages === "") {
          if (location.includes("JP")) {
            languages = "Japanese"
          }
          if (location.includes("EU") || location.includes("US")) {
            if (languages !== "") {
              languages += ", English"
            } else {
              languages = "English"
            }
          }
          if (location === "MISSING") {
            languages = "MISSING"
          }
        }

        // Extract special terms
        const specialMatches = Array.from(title.matchAll(this.specialPattern))
        const special = specialMatches.length > 0 ? specialMatches.map((m) => m[1]).join(", ") : "No"

        // Clean title step by step like Python
        title = title.replace(this.specialPattern, "").trim()
        title = title.replace(this.locationPattern, "").trim()
        title = title.replace(/$$.*$$/g, "").trim()

        // Extract archive format
        const fileExtensionMatch = title.match(this.fileFormatPattern)
        let archive = ""
        if (fileExtensionMatch) {
          archive = fileExtensionMatch[1].toUpperCase()
        }

        // Determine platform from URL or passed platform
        const platformType = platform || "N/A"
        j++;
        if (!specialMatches.some((m) => m[1] === "Beta" || m[1] === "Proto" || m[1] === "DLC") && !href.toLowerCase().includes('demo')) {
          games.push({
            href: baseUrl + href,
            title,
            size,
            location,
            special,
            languages,
            archive,
            platform: platformType,
            id:`${platformType}_${j}`
          })
        }
      }
    } catch (error) {
      console.error("Error parsing HTML:", error)
    }
    return games
  }

  // Example of scraping multiple sites
  async scrapeTSVFiles(
    platforms: Array<{ name: string; urls: string[] }>,
    onProgress?: (platform: string, current: number, total: number) => void,
  ): Promise<void> {
    try {
      const allGames = await this.scraper.scrapeAllPlatforms(onProgress)

      // Group games by platform
      const gamesByPlatform = new Map<string, Game[]>()

      for (const game of allGames) {
        if (!gamesByPlatform.has(game.platform)) {
          gamesByPlatform.set(game.platform, [])
        }
        gamesByPlatform.get(game.platform)!.push(game)
      }

      // Save each platform's games
      for (const [platform, games] of gamesByPlatform) {
        await this.saveGamesAsTSV(platform, games)
      }

      console.log(`Scraping complete! Processed ${gamesByPlatform.size} platforms with ${allGames.length} total games`)
    } catch (error) {
      console.error("Failed to scrape TSV files:", error)
      throw error
    }
  }
  async getGame(id: string){
    const platform = id.split('_')[0];
    await this.ensureInitialized();
    const allGamesForPlatform = await this.loadGamesFromTSV(platform)
    for(let i = 0; i < allGamesForPlatform.length; i++){
      if(allGamesForPlatform[i].id === id){
        return allGamesForPlatform[i];
      }
    }
  }
  // Search games across all platforms
  async searchGames(searchTerm: string, filters?: { consoles: string[]; regions: string[] }): Promise<Game[]> {
    await this.ensureInitialized()

    const allTSVs = await this.dbManager.getAllTSVFiles()
    const allGames: Game[] = []

    // Load games from all platforms
    for (const tsvInfo of allTSVs) {
      const games = await this.loadGamesFromTSV(tsvInfo.platform)
      allGames.push(...games)
    }

    // Enhanced search: match ALL words in the search term
    let filteredGames = allGames
    if (searchTerm.trim()) {
      const searchWords = searchTerm.toLowerCase().trim().split(/\s+/)
      filteredGames = allGames.filter((game) => {
        const gameTitle = game.title.toLowerCase()
        // Check if ALL search words are present in the game title
        return searchWords.every((word) => gameTitle.includes(word))
      })
    }

    // Apply console filters
    if (filters?.consoles && filters.consoles.length > 0) {
      filteredGames = filteredGames.filter((game) => filters.consoles.includes(game.platform))
    }

    // Apply region filters
    if (filters?.regions && filters.regions.length > 0) {
      filteredGames = filteredGames.filter((game) => filters.regions.includes(game.location))
    }

    console.log(`Search "${searchTerm}" returned ${filteredGames.length} results`)
    return filteredGames
  }

  // Get TSV information
  async getTSVInfo(): Promise<{ platform: string; gameCount: number; size: string }[]> {
    await this.ensureInitialized()
    const allTSVs = await this.dbManager.getAllTSVFiles()

    const info = []
    for (const tsvInfo of allTSVs) {
      const games = await this.loadGamesFromTSV(tsvInfo.platform)
      info.push({
        platform: tsvInfo.platform,
        gameCount: games.length,
        size: `${(tsvInfo.size / 1024 / 1024).toFixed(2)} MB`,
      })
    }

    return info
  }

  // Get available TSVs
  async getAvailableTSVs(): Promise<Array<{ filename: string; timestamp: number | null }>> {
    await this.ensureInitialized()
    const allTSVs = await this.dbManager.getAllTSVFiles()

    return allTSVs.map((tsv) => ({
      filename: tsv.platform,
      timestamp: tsv.timestamp,
    }))
  }

  // Get last updated timestamp
  async getLastUpdated(): Promise<Date | null> {
    await this.ensureInitialized()
    const allTSVs = await this.dbManager.getAllTSVFiles()

    if (allTSVs.length === 0) return null

    const latestTimestamp = Math.max(...allTSVs.map((tsv) => tsv.timestamp))
    return new Date(latestTimestamp)
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    await this.ensureInitialized()
    await this.dbManager.clearAll()
  }
}
