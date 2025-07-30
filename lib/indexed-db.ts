// IndexedDB wrapper for storing large TSV data
export class IndexedDBManager {
  private dbName = "RomulusDB"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains("tsvFiles")) {
          const tsvStore = db.createObjectStore("tsvFiles", { keyPath: "id" })
          tsvStore.createIndex("platform", "platform", { unique: false })
          tsvStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        if (!db.objectStoreNames.contains("gameCache")) {
          const gameStore = db.createObjectStore("gameCache", { keyPath: "id" })
          gameStore.createIndex("gameId", "gameId", { unique: true })
        }

        if (!db.objectStoreNames.contains("imageCache")) {
          const imageStore = db.createObjectStore("imageCache", { keyPath: "id" })
          imageStore.createIndex("gameId", "gameId", { unique: true })
        }
      }
    })
  }

  async saveTSVFile(platform: string, content: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tsvFiles"], "readwrite")
      const store = transaction.objectStore("tsvFiles")

      const data = {
        id: platform,
        platform,
        content,
        timestamp: Date.now(),
        size: content.length,
      }

      const request = store.put(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTSVFile(platform: string): Promise<string | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tsvFiles"], "readonly")
      const store = transaction.objectStore("tsvFiles")
      const request = store.get(platform)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.content : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getAllTSVFiles(): Promise<Array<{ platform: string; timestamp: number; size: number }>> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tsvFiles"], "readonly")
      const store = transaction.objectStore("tsvFiles")
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result.map((item: any) => ({
          platform: item.platform,
          timestamp: item.timestamp,
          size: item.size,
        }))
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveImageCache(gameId: string, imageUrl: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["imageCache"], "readwrite")
      const store = transaction.objectStore("imageCache")

      // Calculate approximate size of the image URL and metadata
      const dataSize = imageUrl.length + gameId.length + 50 // extra for metadata

      const data = {
        id: gameId,
        gameId,
        imageUrl,
        timestamp: Date.now(),
        size: dataSize, // Add size field for accurate cache size calculation
      }

      const request = store.put(data)
      request.onsuccess = () => {
        console.log(`Cached image for ${gameId} - ${dataSize} bytes`)
        resolve()
      }
      request.onerror = () => {
        console.error(`Failed to cache image for ${gameId}:`, request.error)
        reject(request.error)
      }
    })
  }

  async getImageCache(gameId: string): Promise<string | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["imageCache"], "readonly")
      const store = transaction.objectStore("imageCache")
      const request = store.get(`${gameId}`)

      request.onsuccess = () => {
        const result = request.result
        // Check if cache is still valid (24 hours)
        if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) {
          console.log(`Cache hit for ${gameId}`)
          resolve(result.imageUrl)
        } else {
          if (result) {
            console.log(`Cache expired for ${gameId}`)
          }
          resolve(null)
        }
      }
      request.onerror = () => {
        console.error(`Failed to get cached image for ${gameId}:`, request.error)
        reject(request.error)
      }
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tsvFiles", "gameCache", "imageCache"], "readwrite")

      const stores = ["tsvFiles", "gameCache", "imageCache"]
      let completed = 0

      stores.forEach((storeName) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          completed++
          if (completed === stores.length) {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    }
    return { used: 0, quota: 0 }
  }

  async getCacheStats(): Promise<{ totalImages: number; cacheSize: number }> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["imageCache"], "readonly")
      const store = transaction.objectStore("imageCache")
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result
        const totalImages = results.length
        // Use the stored size field for accurate calculation
        const cacheSize = results.reduce((size, item) => size + (item.size || item.imageUrl?.length || 0), 0)
        resolve({ totalImages, cacheSize })
      }
      request.onerror = () => reject(request.error)
    })
  }
}
