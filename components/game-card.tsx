"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { useIGDBStore } from "@/lib/igdb-store"
import type { Game } from "@/lib/types"

interface GameCardProps {
  game: Game
}

export function GameCard({ game }: GameCardProps) {
  const router = useRouter()
  const { getCoverArt } = useIGDBStore()
  const [coverImage, setCoverImage] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setImageError(false)

    // Pass both title and platform for better IGDB matching
    getCoverArt(game.title, game.id, game.platform)
      .then((imageUrl) => {
        setCoverImage(
          imageUrl || `/placeholder.svg?height=200&width=150&text=${encodeURIComponent(game.title.slice(0, 10))}`,
        )
      })
      .catch(() => {
        setCoverImage(`/placeholder.svg?height=200&width=150&text=${encodeURIComponent(game.title.slice(0, 10))}`)
        setImageError(true)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [game.title, game.platform, getCoverArt])

  // Ensure the game card click handler works with updated game structure
  const handleClick = () => {
    // Create a more robust game ID that handles special characters
    const gameId = game.id
    console.log(`Navigating to game: ${gameId}`)
    router.push(`/game/${encodeURIComponent(gameId)}`)
  }

  // Extract console name from platform (e.g., "Nintendo - Nintendo DS" -> "Nintendo DS")
  const getConsoleName = (platform: string) => {
    const parts = platform.split(" - ")
    return parts.length > 1 ? parts[1] : platform
  }

  return (
    <Card
      className="themed-bg-tertiary border-themed-border hover:bg-themed-secondary hover:border-themed-accent transition-all duration-300 cursor-pointer group hover:shadow-xl hover:shadow-themed-accent/10 hover:-translate-y-1 active:scale-95"
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="relative mb-3 overflow-hidden rounded-lg">
          {isLoading ? (
            <div className="w-full h-32 themed-bg-secondary rounded flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-themed-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="relative">
              <Image
                src={coverImage || "/placeholder.svg"}
                alt={game.title}
                width={150}
                height={200}
                className="w-full h-32 object-cover rounded group-hover:scale-110 transition-transform duration-500 ease-out"
                onError={() => setImageError(true)}
              />
              {/* Overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
            </div>
          )}

          {/* Platform Label - Show console name only */}
          <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-mono border border-themed-border/50 transition-all duration-300 group-hover:bg-themed-accent/90 group-hover:text-themed-primary">
            {getConsoleName(game.platform)}
          </div>

          {/* Region Label */}
          <div className="absolute top-1 right-1 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-mono border border-themed-border/50 transition-all duration-300 group-hover:bg-themed-accent/90 group-hover:text-themed-primary">
            {game.location}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-themed-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded"></div>
        </div>

        <div className="space-y-2">
          {/* Scrollable title with invisible scrollbar */}
          <div className="relative min-h-[2.5rem] overflow-hidden">
            <h3
              className="text-sm font-semibold text-themed-primary group-hover:text-themed-accent transition-colors duration-300 leading-tight overflow-x-auto scrollbar-hide whitespace-nowrap pb-2"
              style={{
                scrollbarWidth: "none" /* Firefox */,
                msOverflowStyle: "none" /* IE and Edge */,
              }}
            >
              {game.title}
            </h3>
            {/* Custom CSS for webkit browsers */}
            <style jsx>{`
              h3::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-themed-secondary font-mono group-hover:text-themed-primary transition-colors duration-300">
              {game.size}
            </div>

            {/* Status indicator - removed blinking animation */}
            <div className="w-2 h-2 rounded-full bg-themed-accent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </div>
        </div>

        {/* Bottom border animation */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-themed-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </CardContent>
    </Card>
  )
}
