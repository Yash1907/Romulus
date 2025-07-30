"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Settings, Star, Clock, Globe, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/lib/store"
import { useDownloadStore } from "@/lib/download-store"
import { useIGDBStore } from "@/lib/igdb-store"
import Image from "next/image"

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { searchResults } = useGameStore()
  const { addToQueue } = useDownloadStore()
  const { getCoverArt } = useIGDBStore()
  const [coverImage, setCoverImage] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [game, setGame] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // Decode the game ID and find the game
  const gameId = decodeURIComponent(params.id as string)

  useEffect(() => {
    const findGame = async () => {
      // Decode the game ID and extract title and location

      console.log(`Looking for game with id: "${gameId}"`)

      // First try to find in current search results
      let foundGame = searchResults.find((g) => {
        const gameIdFromResult = g.id
        return gameIdFromResult === gameId
      })

      // If not found in search results, search directly in TSV data
      if (!foundGame) {
        try {
          const { TSVManager } = await import("@/lib/tsv-manager")
          const tsvManager = new TSVManager()
          foundGame = await tsvManager.getGame(gameId);
          
        } catch (error) {
          console.error("Error finding game:", error)
        }
      }

      if (foundGame) {
        setGame(foundGame)
        setIsLoading(true)
        getCoverArt(foundGame.title, foundGame.id, foundGame.platform)
          .then((imageUrl) => {
            setCoverImage(
              imageUrl || `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(foundGame.title)}`,
            )
          })
          .catch(() => {
            setCoverImage(`/placeholder.svg?height=400&width=300&text=${encodeURIComponent(foundGame.title)}`)
          })
          .finally(() => {
            setIsLoading(false)
          })
      } else {
        console.warn(`Game not found for ID: ${gameId}`)
        // console.warn(`Searched for title: "${titlePart}", location: "${location}"`)
        setIsLoading(false)
      }
    }

    findGame()
  }, [gameId, searchResults, getCoverArt])

  if (!game) {
    return (
      <div className="min-h-screen themed-bg text-themed-primary flex items-center justify-center">
        <div className="text-center animate-in zoom-in duration-500">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full themed-bg-tertiary flex items-center justify-center">
            <ArrowLeft className="h-8 w-8 text-themed-secondary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
          <p className="text-themed-secondary mb-6">The requested game could not be found in the database.</p>
          <Button
            onClick={() => router.push("/")}
            className="themed-bg-tertiary hover:bg-themed-secondary transition-all duration-300 hover:scale-105 px-4 py-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Back to Home</span>
          </Button>
        </div>
      </div>
    )
  }

  const handleDownload = async () => {
    setIsDownloading(true)

    // Simulate download preparation
    await new Promise((resolve) => setTimeout(resolve, 1000))

    addToQueue({
      id: `${gameId}`,
      game,
      status: "queued",
      progress: 0,
      speed: 0,
      eta: 0,
    })

    setIsDownloading(false)
    router.push("/downloads")
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

        {/* <h1 className="text-xl font-bold font-mono tracking-wider text-themed-primary truncate mx-4">ROMULUS</h1> */}
        <h1
          className="text-xl font-bold tracking-wider text-themed-primary truncate mx-4"
          style={{ fontFamily: "'Bungee Shade', sans-serif" }}
        >
          ROMULUS
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

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Cover */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="relative group animate-in zoom-in duration-700">
                {isLoading ? (
                  <div className="w-full aspect-[3/4] themed-bg-tertiary rounded-xl flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-themed-accent border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl shadow-2xl">
                    <Image
                      src={coverImage || "/placeholder.svg"}
                      alt={game.title}
                      width={400}
                      height={600}
                      className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>

                    {/* Platform Badge */}
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-mono border border-themed-border/50">
                      <span className="truncate">{game.platform.split(" - ")[0]}</span>
                    </div>

                    {/* Region Badge */}
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-mono border border-themed-border/50">
                      {game.location}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Game Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title Section */}
            <div className="animate-in slide-in-from-right-4 duration-700 delay-200">
              <h1 className="text-4xl md:text-5xl font-bold font-mono text-themed-primary mb-4 leading-tight break-words">
                {game.title}
              </h1>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-themed-tertiary text-themed-primary rounded-full text-sm font-medium border border-themed-border truncate">
                  {game.platform}
                </span>
                <span className="px-3 py-1 bg-themed-accent/20 text-themed-accent rounded-full text-sm font-medium border border-themed-accent/30">
                  {game.location}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-right-4 duration-700 delay-400">
              <div className="themed-bg-tertiary p-4 rounded-xl border border-themed-border hover:border-themed-accent transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-5 w-5 text-themed-secondary group-hover:text-themed-accent transition-colors duration-300 flex-shrink-0" />
                  <span className="text-themed-secondary text-sm font-mono">SIZE</span>
                </div>
                <span className="text-xl font-bold text-themed-primary truncate block">{game.size}</span>
              </div>

              <div className="themed-bg-tertiary p-4 rounded-xl border border-themed-border hover:border-themed-accent transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-themed-secondary group-hover:text-themed-accent transition-colors duration-300 flex-shrink-0" />
                  <span className="text-themed-secondary text-sm font-mono">LANGUAGES</span>
                </div>
                <span className="text-lg font-bold text-themed-primary truncate block">{game.languages}</span>
              </div>

              <div className="themed-bg-tertiary p-4 rounded-xl border border-themed-border hover:border-themed-accent transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-themed-secondary group-hover:text-themed-accent transition-colors duration-300 flex-shrink-0" />
                  <span className="text-themed-secondary text-sm font-mono">SPECIAL</span>
                </div>
                <span className="text-lg font-bold text-themed-primary truncate block">{game.special}</span>
              </div>

              <div className="themed-bg-tertiary p-4 rounded-xl border border-themed-border hover:border-themed-accent transition-all duration-300 group">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-themed-secondary group-hover:text-themed-accent transition-colors duration-300 flex-shrink-0" />
                  <span className="text-themed-secondary text-sm font-mono">ARCHIVE</span>
                </div>
                <span className="text-lg font-bold text-themed-primary uppercase truncate block">{game.archive}</span>
              </div>
            </div>

            {/* Download Section */}
            <div className="animate-in slide-in-from-right-4 duration-700 delay-600">
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-6 text-xl font-bold themed-bg-tertiary hover:bg-themed-secondary border border-themed-border text-themed-primary transition-all duration-300 hover:scale-[1.02] active:scale-98 hover:shadow-xl hover:shadow-themed-accent/20 group relative overflow-hidden min-w-0"
              >
                {isDownloading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-themed-primary border-t-transparent rounded-full animate-spin mr-3 flex-shrink-0"></div>
                    <span className="truncate">PREPARING DOWNLOAD...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-6 w-6 mr-3 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                    <span className="truncate">DOWNLOAD GAME</span>
                  </>
                )}

                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Downloads Button - Made rounded square */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => router.push("/downloads")}
          className="themed-bg-tertiary hover:bg-themed-secondary text-themed-primary border border-themed-border shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 rounded-lg w-14 h-14 p-0 group flex-shrink-0"
        >
          <Download className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          <div className="absolute inset-0 rounded-lg bg-themed-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </Button>
      </div>
    </div>
  )
}
