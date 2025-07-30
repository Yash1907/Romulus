"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { GameCard } from "./game-card"
import type { Game } from "@/lib/types"

interface LazyGameGridProps {
  games: Game[]
  itemsPerPage?: number
  maxPages?: number
}

// Add search result entrance animation with page limit
export function LazyGameGrid({ games, itemsPerPage = 20, maxPages = 10 }: LazyGameGridProps) {
  const [visibleGames, setVisibleGames] = useState<Game[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Calculate max items based on page limit
  const maxItems = maxPages * itemsPerPage
  const limitedGames = games.slice(0, maxItems)

  // Load initial games with animation delay
  useEffect(() => {
    setShowResults(false)
    setVisibleGames([])

    // Small delay for smooth transition
    setTimeout(() => {
      setVisibleGames(limitedGames.slice(0, itemsPerPage))
      setCurrentPage(1)
      setShowResults(true)
    }, 150)
  }, [games, itemsPerPage, maxItems])

  // Load more games function
  const loadMoreGames = useCallback(() => {
    if (isLoading || currentPage >= maxPages) return

    setIsLoading(true)

    // Simulate loading delay for smooth UX
    setTimeout(() => {
      const nextPage = currentPage + 1
      const startIndex = (nextPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const newGames = limitedGames.slice(startIndex, endIndex)

      if (newGames.length > 0) {
        setVisibleGames((prev) => [...prev, ...newGames])
        setCurrentPage(nextPage)
      }

      setIsLoading(false)
    }, 300)
  }, [limitedGames, currentPage, itemsPerPage, isLoading, maxPages])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (
          target.isIntersecting &&
          !isLoading &&
          visibleGames.length < limitedGames.length &&
          currentPage < maxPages
        ) {
          loadMoreGames()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMoreGames, isLoading, visibleGames.length, limitedGames.length, currentPage, maxPages])

  if (games.length === 0) {
    return (
      <div className="text-center py-16 animate-in zoom-in duration-500">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full themed-bg-tertiary flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-themed-secondary text-lg mb-2">No games found</p>
          <p className="text-themed-secondary text-sm">Try adjusting your search terms or filters</p>
        </div>
      </div>
    )
  }

  const isAtLimit = games.length > maxItems
  const showingCount = Math.min(visibleGames.length, limitedGames.length)

  return (
    <div
      className={`space-y-6 transition-all duration-500 ${showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {/* Search Results Header */}
      <div className="animate-in slide-in-from-top-2 duration-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-themed-accent rounded-full"></div>
            <div>
              <h2 className="text-xl font-bold text-themed-primary">Search Results</h2>
              <p className="text-sm text-themed-secondary">
                Showing {showingCount} of {limitedGames.length} games
                {isAtLimit && (
                  <span className="text-themed-accent ml-1">
                    (limited to {maxPages} pages, {games.length} total found)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Results counter with animation */}
          <div className="px-4 py-2 themed-bg-tertiary rounded-full border border-themed-border">
            <span className="text-themed-accent font-mono font-bold animate-in zoom-in duration-300">
              {limitedGames.length}
            </span>
          </div>
        </div>

        {/* Page limit warning */}
        {isAtLimit && (
          <div className="mb-4 p-3 themed-bg-secondary border border-themed-accent/30 rounded-lg animate-in fade-in duration-500">
            <p className="text-sm text-themed-accent">
              ⚠️ Results limited to {maxPages} pages ({maxItems} games) for performance. Try refining your search for
              more specific results.
            </p>
          </div>
        )}
      </div>

      {/* Games Grid with staggered animation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {visibleGames.map((game, index) => (
          <div
            key={`${game.title}-${game.location}-${index}`}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              animationDelay: `${Math.min(index * 50, 1000)}ms`,
              animationFillMode: "both",
            }}
          >
            <GameCard game={game} />
          </div>
        ))}
      </div>

      {/* Loading indicator and infinite scroll trigger */}
      {visibleGames.length < limitedGames.length && currentPage < maxPages && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-3 text-themed-secondary animate-in fade-in duration-300">
              <div className="w-6 h-6 border-2 border-themed-accent border-t-transparent rounded-full animate-spin"></div>
              <span className="animate-pulse">Loading more games...</span>
            </div>
          ) : (
            <div
              className="text-themed-secondary text-sm hover:text-themed-primary transition-colors duration-200 cursor-pointer"
              onClick={loadMoreGames}
            >
              Scroll down or click to load more games ({showingCount} of {limitedGames.length})
            </div>
          )}
        </div>
      )}

      {/* End indicator with celebration */}
      {(visibleGames.length >= limitedGames.length || currentPage >= maxPages) &&
        limitedGames.length > itemsPerPage && (
          <div className="text-center py-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-center gap-2 text-themed-secondary text-sm">
              <span>🎉</span>
              <span>
                {currentPage >= maxPages
                  ? `Reached page limit (${maxPages} pages)`
                  : `All ${limitedGames.length} games loaded`}
              </span>
              <span>🎉</span>
            </div>
          </div>
        )}
    </div>
  )
}
