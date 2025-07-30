import type { Download } from "./types"
import JSZip from "jszip"

export class DownloadManager {
  private activeDownloads = new Map<string, AbortController>()
  private downloadCallbacks = new Map<string, (progress: number, speed: number, eta: number) => void>()

  async startDownload(
    download: Download,
    onProgress: (progress: number, speed: number, eta: number) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    const controller = new AbortController()
    this.activeDownloads.set(download.id, controller)
    this.downloadCallbacks.set(download.id, onProgress)

    try {
      console.log(`Starting download: ${download.game.title}`)
      console.log(download.game.href)
      // Use our CORS-safe download proxy
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: download.game.href }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Download failed: ${response.status} - ${errorData.details || response.statusText}`)
      }

      const contentLength = response.headers.get("content-length")
      const total = contentLength ? Number.parseInt(contentLength, 10) : 0

      if (!response.body) {
        throw new Error("Response body is null")
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let receivedLength = 0
      const startTime = Date.now()
      let lastProgressTime = startTime

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        const currentTime = Date.now()
        const elapsedTime = (currentTime - startTime) / 1000
        const timeSinceLastProgress = (currentTime - lastProgressTime) / 1000

        // Update progress every 100ms
        if (timeSinceLastProgress >= 0.1) {
          const progress = total > 0 ? (receivedLength / total) * 100 : 0
          const speed = receivedLength / elapsedTime // bytes per second
          const eta = total > 0 && speed > 0 ? (total - receivedLength) / speed : 0

          onProgress(progress, speed, eta)
          lastProgressTime = currentTime
        }
      }

      // Combine chunks into final blob
      const blob = new Blob(chunks)
      console.log(`Download completed: ${download.game.title} (${blob.size} bytes)`)

      // Handle ZIP extraction if needed
      if (download.game.archive.toLowerCase() === "zip") {
        console.log(`Extracting ZIP: ${download.game.title}`)
        await this.handleZipFile(blob, download.game.title)
      } else {
        // Save non-ZIP file directly
        await this.saveFile(download.game.title, blob, download.game.archive)
      }

      this.activeDownloads.delete(download.id)
      this.downloadCallbacks.delete(download.id)
      onComplete()
    } catch (error) {
      this.activeDownloads.delete(download.id)
      this.downloadCallbacks.delete(download.id)

      if (error instanceof Error && error.name === "AbortError") {
        console.log("Download was cancelled")
      } else {
        console.error(`Download failed for ${download.game.title}:`, error)
        onError(error as Error)
      }
    }
  }

  pauseDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(downloadId)
    }
  }

  cancelDownload(downloadId: string): void {
    const controller = this.activeDownloads.get(downloadId)
    if (controller) {
      controller.abort()
      this.activeDownloads.delete(downloadId)
      this.downloadCallbacks.delete(downloadId)
    }
  }

  private async handleZipFile(zipBlob: Blob, gameName: string): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window !== "undefined") {
        // Browser: Extract and download individual files
        await this.extractAndDownloadZip(zipBlob, gameName)
      } else {
        // Non-web platform: Save extracted files to file system
        await this.extractZipToFileSystem(zipBlob, gameName)
      }
    } catch (error) {
      console.error(`Failed to handle ZIP for ${gameName}:`, error)
      // Fallback: download the original ZIP file
      await this.saveFile(gameName, zipBlob, "zip")
      throw error
    }
  }

  private async extractAndDownloadZip(zipBlob: Blob, gameName: string): Promise<void> {
    const zip = new JSZip()
    const zipData = await zip.loadAsync(zipBlob)

    const files = Object.keys(zipData.files)
    console.log(`ZIP contains ${files.length} files:`, files)

    // Find the main ROM file (usually the largest file or specific extensions)
    const romExtensions = [".nes", ".smc", ".sfc", ".gb", ".gbc", ".gba", ".nds", ".3ds", ".iso", ".rom", ".bin"]
    let mainFile = null
    let largestFile = null
    let largestSize = 0

    for (const filename of files) {
      const file = zipData.files[filename]
      if (!file.dir) {
        // Check if it's a ROM file by extension
        const hasRomExtension = romExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
        if (hasRomExtension) {
          mainFile = { filename, file }
          break
        }

        // Track largest file as fallback
        const fileData = await file.async("uint8array")
        if (fileData.length > largestSize) {
          largestSize = fileData.length
          largestFile = { filename, file }
        }
      }
    }

    // Use ROM file if found, otherwise use largest file
    const targetFile = mainFile || largestFile

    if (targetFile) {
      console.log(`Extracting main file: ${targetFile.filename}`)
      const fileData = await targetFile.file.async("blob")
      const extension = targetFile.filename.split(".").pop() || "rom"
      await this.saveFile(gameName, fileData, extension)
    } else {
      throw new Error("No suitable files found in ZIP")
    }
  }

  private async extractZipToFileSystem(zipBlob: Blob, gameName: string): Promise<void> {
    // This would be implemented for non-web platforms (Electron, React Native, etc.)
    // For now, we'll use the same browser logic
    await this.extractAndDownloadZip(zipBlob, gameName)
  }

  private async saveFile(filename: string, blob: Blob, extension: string): Promise<void> {
    // In a browser environment, we can trigger a download
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.${extension}`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`File saved: ${filename}.${extension} (${blob.size} bytes)`)
  }
}
