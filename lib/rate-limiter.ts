// Rate limiter for IGDB API calls
export class RateLimiter {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequest = 0
  private minInterval = 250 // 4 requests per second max

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.process()
    })
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequest

      if (timeSinceLastRequest < this.minInterval) {
        await new Promise((resolve) => setTimeout(resolve, this.minInterval - timeSinceLastRequest))
      }

      const fn = this.queue.shift()
      if (fn) {
        this.lastRequest = Date.now()
        await fn()
      }
    }

    this.processing = false
  }

  getQueueLength(): number {
    return this.queue.length
  }
}
