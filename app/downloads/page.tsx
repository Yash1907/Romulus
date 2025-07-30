"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Pause, Play, Trash2, Settings, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useDownloadStore } from "@/lib/download-store"
import { useIGDBStore } from "@/lib/igdb-store"
import Image from "next/image"

export default function DownloadsPage() {
  const router = useRouter()
  const { downloads, removeFromQueue, pauseDownload, resumeDownload, clearCompleted } = useDownloadStore()
  const { getCoverArt } = useIGDBStore()
  const [filter, setFilter] = useState<"all" | "downloading" | "completed" | "paused">("all")
  const [gameImages, setGameImages] = useState<Record<string, string>>({})

  // Load cover art for all games in downloads
  useEffect(() => {
    const loadCoverArt = async () => {
      const imagePromises = downloads.map(async (download) => {
        const gameKey = `${download.game.title}-${download.game.platform}`

        if (!gameImages[gameKey]) {
          try {
            const imageUrl = await getCoverArt(download.game.title, download.game.id, download.game.platform)
            return {
              key: gameKey,
              url:
                imageUrl ||
                `/placeholder.svg?height=80&width=64&text=${encodeURIComponent(download.game.title.slice(0, 3))}`,
            }
          } catch (error) {
            return {
              key: gameKey,
              url: `/placeholder.svg?height=80&width=64&text=${encodeURIComponent(download.game.title.slice(0, 3))}`,
            }
          }
        }
        return null
      })

      const results = await Promise.all(imagePromises)
      const newImages: Record<string, string> = {}

      results.forEach((result) => {
        if (result) {
          newImages[result.key] = result.url
        }
      })

      if (Object.keys(newImages).length > 0) {
        setGameImages((prev) => ({ ...prev, ...newImages }))
      }
    }

    if (downloads.length > 0) {
      loadCoverArt()
    }
  }, [downloads, getCoverArt, gameImages])

  const filteredDownloads = downloads.filter((download) => {
    switch (filter) {
      case "downloading":
        return download.status === "downloading"
      case "completed":
        return download.status === "completed"
      case "paused":
        return download.status === "paused"
      default:
        return true
    }
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "downloading":
        return <Download className="h-5 w-5 text-themed-accent animate-bounce" />
      case "paused":
        return <Pause className="h-5 w-5 text-yellow-500" />
      case "error":
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-themed-secondary" />
    }
  }
  const formatBytes = (bytes: number, decimals: number = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  const formatSpeed = (speed: number) => {
    return `${formatBytes(speed)}/s`
  }

  const formatETA = (eta: number) => {
    if (eta === 0) return "Unknown"
    const minutes = Math.floor(eta / 60)
    const seconds = eta % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen themed-bg text-themed-primary">
      {/* Header */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee+Shade&display=swap');
      `}</style>
      <header className="flex items-center justify-between p-4 border-b border-themed-border themed-bg-secondary backdrop-blur-sm sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <h1
          className="text-xl font-bold tracking-wider text-themed-primary truncate mx-4"
          style={{ fontFamily: "'Bungee Shade', sans-serif" }}
        >
          DOWNLOADS
        </h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings")}
          className="text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 animate-in slide-in-from-top-4 duration-500">
          {[
            { key: "all", label: "All", count: downloads.length },
            {
              key: "downloading",
              label: "Downloading",
              count: downloads.filter((d) => d.status === "downloading").length,
            },
            { key: "completed", label: "Completed", count: downloads.filter((d) => d.status === "completed").length },
            { key: "paused", label: "Paused", count: downloads.filter((d) => d.status === "paused").length },
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key as any)}
              className={`transition-all duration-300 hover:scale-105 flex-shrink-0 px-3 py-2 text-sm min-w-0 ${
                filter === key
                  ? "themed-bg-secondary border border-themed-border text-themed-primary hover:text-themed-primary hover:bg-themed-tertiary"
                  : "themed-bg-primary border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary"
              }`}
            >
              <span className="truncate">
                {label}{" "}
                {count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-themed-accent/20 text-themed-accent rounded-full text-xs">
                    {count}
                  </span>
                )}
              </span>
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        {downloads.length > 0 && (
          <div className="flex gap-2 mb-6 animate-in slide-in-from-top-4 duration-500 delay-100">
            <Button
              variant="outline"
              onClick={clearCompleted}
              disabled={!downloads.some((d) => d.status === "completed")}
              className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 disabled:hover:scale-100 flex-shrink-0 px-3 py-2 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Clear Completed</span>
            </Button>
          </div>
        )}

        {/* Downloads List */}
        <div className="space-y-4">
          {filteredDownloads.length === 0 ? (
            <div className="text-center py-16 animate-in zoom-in duration-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full themed-bg-tertiary flex items-center justify-center">
                <Download className="h-8 w-8 text-themed-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Downloads</h3>
              <p className="text-themed-secondary mb-6">
                {filter === "all"
                  ? "Your download queue is empty. Start by searching for games!"
                  : `No ${filter} downloads found.`}
              </p>
              <Button
                onClick={() => router.push("/")}
                className="themed-bg-tertiary hover:bg-themed-secondary transition-all duration-300 hover:scale-105 px-4 py-2 text-sm"
              >
                <span className="truncate">Browse Games</span>
              </Button>
            </div>
          ) : (
            filteredDownloads.map((download, index) => {
              const gameKey = `${download.game.title}-${download.game.platform}`
              const imageUrl =
                gameImages[gameKey] ||
                `/placeholder.svg?height=80&width=64&text=${encodeURIComponent(download.game.title.slice(0, 3))}`

              return (
                <div
                  key={download.id}
                  className="themed-bg-tertiary border border-themed-border rounded-xl p-4 hover:border-themed-accent transition-all duration-300 hover:shadow-lg animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Game Image */}
                    <div className="w-16 h-20 flex-shrink-0">
                      <Image
                        src={imageUrl || "/placeholder.svg"}
                        alt={download.game.title}
                        width={64}
                        height={80}
                        className="w-full h-full object-cover rounded border border-themed-border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/placeholder.svg?height=80&width=64&text=${encodeURIComponent(download.game.title.slice(0, 3))}`
                        }}
                      />
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">{getStatusIcon(download.status)}</div>

                    {/* Game Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-themed-primary truncate mb-1">{download.game.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-themed-secondary mb-3">
                        <span className="px-2 py-1 bg-themed-secondary rounded text-xs truncate">
                          {download.game.platform}
                        </span>
                        <span className="px-2 py-1 bg-themed-secondary rounded text-xs">{download.game.location}</span>
                        <span className="px-2 py-1 bg-themed-secondary rounded text-xs">{download.game.size}</span>
                      </div>

                      {/* Progress Bar */}
                      {download.status !== "completed" &&
                        download.status !== "error" &&
                        download.status !== "failed" && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-themed-secondary mb-1">
                              <span>{download.progress.toFixed(1)}%</span>
                              <span>{formatSpeed(download.speed)}</span>
                            </div>
                            <Progress value={download.progress} className="h-2 bg-themed-secondary" />
                            {download.eta > 0 && (
                              <div className="text-xs text-themed-secondary mt-1">ETA: {formatETA(download.eta)}</div>
                            )}
                          </div>
                        )}

                      {/* Status Message */}
                      <div className="text-sm text-themed-secondary">
                        {download.status === "completed" && "Download completed successfully"}
                        {download.status === "downloading" && "Downloading..."}
                        {download.status === "paused" && "Download paused"}
                        {download.status === "queued" && "Waiting in queue"}
                        {(download.status === "failed" || download.status === "error") && "Download failed"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      {download.status === "downloading" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseDownload(download.id)}
                          className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 p-2"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}

                      {download.status === "paused" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resumeDownload(download.id)}
                          className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 p-2"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromQueue(download.id)}
                        className="border-themed-border text-themed-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 hover:scale-110 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
