import { RateLimiter } from "./rate-limiter"
import { IndexedDBManager } from "./indexed-db"

export class IGDBApi {
  private rateLimiter = new RateLimiter()
  private dbManager = new IndexedDBManager()
  private initialized = false

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.dbManager.init()
      this.initialized = true
    }
  }

  // Ensure IGDB API works with updated game structure
  async getCoverArt(gameTitle: string, gameId: string, platform?: string): Promise<string | null> {
    await this.ensureInitialized()
    const cleanedTitle = gameTitle
      .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
    try {
      const cachedImage = await this.dbManager.getImageCache(gameId)
      if (cachedImage) {
        return cachedImage
      }
    } catch (error) {
      console.warn(`Cache lookup failed for ${gameId}:`, error)
    }

    try {
      // Use rate limiter to prevent 429 errors
      const result = await this.rateLimiter.add(async () => {
        console.log(`Fetching cover art for "${gameId}"`)

        const response = await fetch("/api/igdb", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameTitle: cleanedTitle, platform }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        return await response.json()
      })

      const imageUrl = result.imageUrl

      // Cache the result in IndexedDB (even if it's a placeholder)
      if (imageUrl) {
        try {
          await this.dbManager.saveImageCache(gameId, imageUrl)
        } catch (cacheError) {
          console.warn(`Failed to cache image for ${cleanedTitle}:`, cacheError)
        }
      }

      // Log successful matches for debugging
      if (result.matchedTitle && result.score > 0.5) {
        console.log(`IGDB match: "${cleanedTitle}" -> "${result.matchedTitle}" (score: ${result.score})`)
      }

      return imageUrl
    } catch (error) {
      console.error(`Failed to fetch cover art for "${cleanedTitle}":`, error)

      // Fallback to placeholder
      const placeholder = `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(cleanedTitle.slice(0, 15))}`

      // Cache the placeholder to avoid repeated failures
      try {
        await this.dbManager.saveImageCache(gameId, placeholder)
      } catch (cacheError) {
        console.warn(`Failed to cache placeholder for ${cleanedTitle}:`, cacheError)
      }

      return placeholder
    }
  }

  // Clear cache (useful for testing or memory management)
  async clearCache(): Promise<void> {
    await this.ensureInitialized()
    await this.dbManager.clearAll()
  }

  // Get cache size
  async getCacheSize(): Promise<{ totalImages: number; cacheSize: number }> {
    await this.ensureInitialized()
    return await this.dbManager.getCacheStats()
  }

  getQueueLength(): number {
    return this.rateLimiter.getQueueLength()
  }
}
