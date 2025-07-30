"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GameCard } from "./game-card"
import type { Game } from "@/lib/types"

interface PaginatedGameGridProps {
  games: Game[]
  itemsPerPage?: number
}

export function PaginatedGameGrid({ games, itemsPerPage = 10 }: PaginatedGameGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [showResults, setShowResults] = useState(false)

  const totalPages = Math.ceil(games.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentGames = games.slice(startIndex, endIndex)

  // Reset to page 1 when games change
  useEffect(() => {
    setCurrentPage(1)
    setShowResults(false)

    // Small delay for smooth transition
    setTimeout(() => {
      setShowResults(true)
    }, 150)
  }, [games])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)

      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push("...")
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...")
        pages.push(totalPages)
      }
    }

    return pages
  }

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
                Showing {startIndex + 1}-{Math.min(endIndex, games.length)} of {games.length} games
              </p>
            </div>
          </div>

          {/* Results counter with animation */}
          <div className="px-4 py-2 themed-bg-tertiary rounded-full border border-themed-border">
            <span className="text-themed-accent font-mono font-bold animate-in zoom-in duration-300">
              {games.length}
            </span>
          </div>
        </div>
      </div>

      {/* Games Grid with staggered animation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {currentGames.map((game, index) => (
          <div
            key={`${game.id}`}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
              animationDelay: `${Math.min(index * 50, 500)}ms`,
              animationFillMode: "both",
            }}
          >
            <GameCard game={game} />
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8 animate-in fade-in duration-500">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <div key={index}>
                {page === "..." ? (
                  <span className="px-3 py-2 text-themed-secondary">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page as number)}
                    className={`min-w-[40px] ${
                      currentPage === page
                        ? "themed-bg-accent text-themed-primary"
                        : "border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary"
                    }`}
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Page info */}
      <div className="text-center text-sm text-themed-secondary animate-in fade-in duration-500">
        Page {currentPage} of {totalPages} • {games.length} total games
      </div>
    </div>
  )
}
