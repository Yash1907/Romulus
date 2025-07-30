import type { Game } from "./types"
import he from 'he'

interface ScrapedGame {
  href: string
  title: string
  size: string
  location: string
  special: string
  languages: string
  archive: string
  platform: string
}

export class TSVScraper {
  // Regex patterns matching Python implementation exactly
  private locationPattern = /\((USA|Europe|Japan|NA|EU|JPN|World)(?:, (USA|Europe|Japan|NA|EU|JPN|World))*\)/gi;
  private specialPattern = /Beta|Aftermarket|Unl|Proto|Emulator Version|Demo|DLC|Hardware Version/gi;
  private languagesPattern = /\((En|Fr|De|Es|It|Sv|Fi|Cs|Sl)(?:, (En|Fr|De|Es|It|Sv|Fi|Cs|Sl))*\)/gi;
  private fileFormatPattern = /\.(\w+)$/;




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

  async scrapeFromMyrient(url: string, platformShortName: string): Promise<Game[]> {
    try {
      console.log(`Scraping ${platformShortName} from ${url}`)

      // Use CORS-safe fetch
      const response = await fetch("/api/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error}`)
      }

      const result = await response.json()
      if (!result.data) {
        throw new Error("No HTML data received")
      }

      return this.parseHTMLFromMyrient(result.data, url, platformShortName)
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error)
      return []
    }
  }

  async downloadFromNopaystation(url: string, platformShortName: string): Promise<Game[]> {
    try {
      console.log(`Downloading TSV from ${url}`)

      // Use CORS-safe fetch
      const response = await fetch("/api/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error}`)
      }
      const result = await response.json()
      if (!result.data || typeof result.data !== "string") {
        throw new Error("No TSV data received or invalid format")
      }

      console.log(`TSV content length: ${result.data.length} characters`)

      if (result.data.length < 100) {
        console.warn("TSV content seems too short, might be empty or error page")
        return []
      }

      return this.parseTSVFromNopaystation(atob(result.data), platformShortName)
    } catch (error) {
      console.error(`Failed to download TSV from ${url}:`, error)
      return []
    }
  }

  private parseHTMLFromMyrient(html: string, baseUrl: string, platformShortName: string): Game[] {
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
      console.log(`Found ${rows.length} rows to process`)
      let j = 0;
      for (const row of rows) {
        const tds = row.children
        if (tds.length < 2) continue

        const linkTd = tds[0]
        const sizeTd = tds[1]

        const aTag = linkTd.children[0]
        if (!aTag) continue

        let href = aTag.getAttribute("href")
        if (!href) continue
        href = href.split('/')[href.split('/').length-1]

        let title = aTag.innerHTML?.trim() || ""
        const size = sizeTd.innerHTML?.trim().toLowerCase() || ""

        // Extract locations
        const locationMatches = Array.from(title.matchAll(this.locationPattern))
        let location = "MISSING"
        if (locationMatches.length > 0) {
          const locations = locationMatches
            .map((match) => match[0].replace(/[()]/g, '').toLowerCase()) // Clean and normalize location matches
            .map((loc) => this.locationMap[loc] || loc) // Map using the location map
            .filter(Boolean)

          // Join locations with commas
          location = locations.length > 1 ? locations.join(", ") : locations[0] || "MISSING"
        }


        // Extract languages
        const languageMatches = Array.from(title.matchAll(this.languagesPattern))
        let languages = ""
        if (languageMatches.length > 0) {
          const recognizedLangs = languageMatches
            .map((match) => match[1] ? this.recognizedLanguages[match[1].toLowerCase()] : "") // Ensure match[1] exists
            .filter(Boolean)
          languages = recognizedLangs.join(", ")
        }

        // Default language logic matching Python exactly
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
          else {
            languages = "MISSING"
          }
        }

        // Extract special terms
        const specialMatches = Array.from(title.matchAll(this.specialPattern))
        let special = specialMatches.length > 0 ? specialMatches.map((m) => m[1]).join(", ") : "No"

        // Clean title step by step like Python
        title = title.replace(this.specialPattern, "").trim() // Remove special terms
        title = title.replace(this.locationPattern, "").trim() // Remove location patterns
        title = title.replace(/\(.*?\)/g, "").trim() // Remove all remaining parentheses content

        // Extract archive format
        const fileExtensionMatch = title.match(this.fileFormatPattern)
        let archive = ""
        if (fileExtensionMatch) {
          archive = fileExtensionMatch[1].toUpperCase()
          title = title.replace(this.fileFormatPattern, "").trim()
        }

        // Handle "Unl" -> "Unlicensed" replacement
        if (special.includes("Unl")) {
          special = special.replace("Unl", "Unlicensed")
        }

        // Handle "The" suffix like Python
        if (title.includes(", The")) {
          title = "The " + title.replace(', The','')
        }

        title = title.trim()
        title = he.decode(title)

        j++;

        // Skip beta versions like Python
        if (!specialMatches.some((m) => m[1] === "Beta" || m[1] === "Proto" || m[1] === "DLC") && !href.toLowerCase().includes('demo')) {
          if(location==='EU' && !languages.includes('English')) continue;
          games.push({
            href: baseUrl + href,
            title,
            size,
            location,
            special,
            languages,
            archive,
            platform: platformShortName, // Use the short name from filenames.json
            id:`${platformShortName}_${j}`
          })
        }
      }

      console.log(`Parsed ${games.length} games from ${baseUrl}`)
    } catch (error) {
      console.error("Error parsing HTML:", error)
    }

    // console.log(games);
    return games
}

  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private parseTSVFromNopaystation(tsvContent: string, platformShortName: string): Game[] {
    const games: Game[] = []
    const lines = tsvContent.split("\n")
    console.log(`Processing TSV with ${lines.length} lines`)

    if (lines.length < 2) {
      console.warn("TSV has less than 2 lines, likely empty or invalid")
      return games
    }

    // Check if first line looks like a header
    const firstLine = lines[0].trim()
    const hasHeader = firstLine.toLowerCase().includes("title") || firstLine.toLowerCase().includes("name")
    const startIndex = hasHeader ? 1 : 0

    console.log(`TSV header detected: ${hasHeader}, starting from line ${startIndex}`)

    // Process data lines
    let j = 0;
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const columns = line.split("\t")

      // NoPayStation TSV format typically has many columns
      // We need to map them correctly based on the actual format
      if (columns.length >= 3) {
        // Common NoPayStation format: Title, Region, URL, Size, etc.
        var title = columns[2] || ""
        var region = columns[1] || ""
        var downloadUrl = columns[3] || ""
        var size = this.formatBytes(parseInt(columns[8])) || ""
        if(platformShortName === 'PSP'){
          title = columns[3] || ""
          region = columns[1] || ""
          downloadUrl = columns[4] || ""
          size = this.formatBytes(parseInt(columns[9])) || ""
        }
        title = he.decode(title)
        // Skip empty or invalid entries
        if (!title || !downloadUrl) continue
        // Map region to our format
        let location = "MISSING"
        const regionLower = region.toLowerCase()
        if (regionLower.includes("us") || regionLower.includes("usa")) {
          location = "US"
        } else if (regionLower.includes("eu") || regionLower.includes("europe")) {
          location = "EU"
        } else if (regionLower.includes("jp") || regionLower.includes("japan")) {
          location = "JP"
        } else if (regionLower.includes("world")) {
          location = "World"
        }

        // Set default language based on region
        let languages = "English"
        if (location === "JP") {
          languages = "Japanese"
        } else if (location === "EU") {
          languages = "English"
        }
        j++;
        if(!isNaN(parseInt(columns[8])) || !(location === "MISSING"))
          games.push({
            href: downloadUrl,
            title: title.trim(),
            size: size || "Unknown",
            location,
            special: "No",
            languages,
            archive: "PKG", // NoPayStation typically uses PKG format
            platform: platformShortName,
            id: `${platformShortName}_${j}`
          })
      }
    }

    console.log(`Parsed ${games.length} games from NoPayStation TSV`)
    console.log(games)
    return games
  }

  async scrapeAllPlatforms(onProgress?: (platform: string, current: number, total: number) => void): Promise<Game[]> {
    const linksData = await import("@/assets/data/links.json")
    const filenamesData = await import("@/assets/data/filenames.json")

    const allGames: Game[] = []
    let currentPlatform = 0
    const totalPlatforms = Object.values(linksData.default).reduce(
      (total, platforms) => total + Object.keys(platforms).length,
      0,
    )

    for (const [manufacturer, platforms] of Object.entries(linksData.default)) {
      for (const [platformName, linkData] of Object.entries(platforms)) {
        currentPlatform++
        const platformShortName = (filenamesData.default as any)[manufacturer]?.[platformName]

        if (!platformShortName) {
          console.warn(`No short name found for ${manufacturer} - ${platformName}`)
          continue
        }

        if (onProgress) {
          onProgress(platformName, currentPlatform, totalPlatforms)
        }

        try {
          if (Array.isArray(linkData)) {
            // Handle multiple URLs (like Nintendo DS with encrypted/decrypted)
            const platformGames: Game[] = []

            for (const url of linkData) {
              let games: Game[] = []

              if (url.includes("nopaystation")) {
                console.log(url);
                games = await this.downloadFromNopaystation(url, platformShortName)
              } else {
                games = await this.scrapeFromMyrient(url, platformShortName)
              }

              platformGames.push(...games)
            }

            // Deduplicate games by title and location, preferring decrypted versions
            const deduplicatedGames = this.deduplicateGames(platformGames)
            allGames.push(...deduplicatedGames)
          } else {
            // Single URL
            let games: Game[] = []

            if (linkData.includes("nopaystation")) {
              console.log(linkData)
              games = await this.downloadFromNopaystation(linkData, platformShortName)
            } else {
              games = await this.scrapeFromMyrient(linkData, platformShortName)
            }

            allGames.push(...games)
          }

          // Add small delay to avoid overwhelming servers
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to process ${platformName}:`, error)
        }
      }
    }

    console.log(`Total games scraped: ${allGames.length}`)
    return allGames
  }

  private deduplicateGames(games: Game[]): Game[] {
    const gameMap = new Map<string, Game>()

    // Sort games by priority (decrypted > encrypted, newer > older)
    const sortedGames = games.sort((a, b) => {
      const aPriority = this.getGamePriority(a)
      const bPriority = this.getGamePriority(b)
      return aPriority - bPriority
    })

    for (const game of sortedGames) {
      const key = `${game.title.toLowerCase()}|${game.location.toLowerCase()}`
      if (!gameMap.has(key)) {
        gameMap.set(key, game)
      }
    }
    return Array.from(gameMap.values())
  }

  private getGamePriority(game: Game): number {
    const href = game.href.toLowerCase()

    // Priority based on URL patterns (lower number = higher priority)
    if (href.includes("new") && href.includes("decrypted")) return 0
    if (href.includes("new") && href.includes("encrypted")) return 1
    if (href.includes("dsi") && href.includes("decrypted")) return 2
    if (href.includes("dsi") && href.includes("encrypted")) return 3
    if (href.includes("decrypted")) return 4
    if (href.includes("encrypted")) return 5

    return 6 // Default priority
  }
}
