"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Download } from "./types"
import { DownloadManager } from "./download-manager"
import { useSettingsStore } from "./settings-store"

interface DownloadStore {
  downloads: Download[]
  downloadManager: DownloadManager
  addToQueue: (download: Download) => void
  removeFromQueue: (id: string) => void
  pauseDownload: (id: string) => void
  resumeDownload: (id: string) => void
  cancelDownload: (id: string) => void
  clearCompleted: () => void
  updateProgress: (id: string, progress: number, speed: number, eta: number) => void
  processQueue: () => void
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      downloads: [],
      downloadManager: new DownloadManager(),

      addToQueue: (download) => {
        const { downloads } = get()
        if (!downloads.find((d) => d.id === download.id)) {
          set({ downloads: [...downloads, download] })

          // Process queue to start downloads if slots available
          setTimeout(() => get().processQueue(), 100)
        }
      },

      removeFromQueue: (id) => {
        const { downloadManager } = get()
        downloadManager.cancelDownload(id)

        const { downloads } = get()
        const filtered = downloads.filter((d) => d.id !== id)
        set({ downloads: filtered })

        // Process queue to start next downloads
        setTimeout(() => get().processQueue(), 100)
      },

      pauseDownload: (id) => {
        const { downloadManager } = get()
        downloadManager.pauseDownload(id)

        const { downloads } = get()
        const updated = downloads.map((d) => (d.id === id ? { ...d, status: "paused" as const } : d))
        set({ downloads: updated })
      },

      resumeDownload: (id) => {
        const { downloads } = get()
        const updated = downloads.map((d) => (d.id === id ? { ...d, status: "queued" as const } : d))
        set({ downloads: updated })

        // Process queue to potentially start this download
        setTimeout(() => get().processQueue(), 100)
      },

      cancelDownload: (id) => {
        const { downloadManager } = get()
        downloadManager.cancelDownload(id)

        const { downloads } = get()
        const filtered = downloads.filter((d) => d.id !== id)
        set({ downloads: filtered })

        // Process queue to start next downloads
        setTimeout(() => get().processQueue(), 100)
      },

      clearCompleted: () => {
        const { downloads } = get()
        const filtered = downloads.filter((d) => d.status !== "completed")
        set({ downloads: filtered })
      },

      updateProgress: (id, progress, speed, eta) => {
        const { downloads } = get()
        const updated = downloads.map((d) => (d.id === id ? { ...d, progress, speed, eta } : d))
        set({ downloads: updated })
      },

      processQueue: () => {
        const { downloads, downloadManager } = get()
        const { settings } = useSettingsStore.getState()

        const downloading = downloads.filter((d) => d.status === "downloading")
        const queued = downloads.filter((d) => d.status === "queued")

        const availableSlots = settings.concurrentDownloads - downloading.length

        if (availableSlots > 0 && queued.length > 0) {
          const toStart = queued.slice(0, availableSlots)

          toStart.forEach((download) => {
            // Update status to downloading
            const { downloads: currentDownloads } = get()
            const updated = currentDownloads.map((d) =>
              d.id === download.id ? { ...d, status: "downloading" as const } : d,
            )
            set({ downloads: updated })

            // Start actual download
            downloadManager.startDownload(
              download,
              (progress, speed, eta) => {
                get().updateProgress(download.id, progress, speed, eta)
              },
              () => {
                // Download completed
                const { downloads: completedDownloads } = get()
                const updated = completedDownloads.map((d) =>
                  d.id === download.id
                    ? {
                        ...d,
                        status: "completed" as const,
                        progress: 100,
                        speed: 0,
                        eta: 0,
                      }
                    : d,
                )
                set({ downloads: updated })

                // Show notification
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Download Complete", {
                    body: `${download.game.title} has finished downloading`,
                    icon: "/placeholder.svg?height=64&width=64&text=ROM",
                  })
                }

                // Process queue for next downloads
                get().processQueue()

                // Auto-remove completed downloads after 10 seconds
                setTimeout(() => {
                  const { downloads: autoRemoveDownloads } = get()
                  const filtered = autoRemoveDownloads.filter((d) => d.id !== download.id)
                  set({ downloads: filtered })
                }, 10000)
              },
              (error) => {
                // Download failed
                console.error(`Download failed for ${download.game.title}:`, error)
                const { downloads: failedDownloads } = get()
                const updated = failedDownloads.map((d) =>
                  d.id === download.id ? { ...d, status: "failed" as const } : d,
                )
                set({ downloads: updated })

                // Process queue for next downloads
                get().processQueue()
              },
            )
          })
        }
      },
    }),
    {
      name: "romulus-download-store",
      partialize: (state) => ({
        downloads: state.downloads.filter((d) => d.status !== "completed"),
      }),
    },
  ),
)
