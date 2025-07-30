"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, Filter, RefreshCw, Settings, Download, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginatedGameGrid } from "@/components/paginated-game-grid"
import { FilterModal } from "@/components/filter-modal"
import { useGameStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { searchResults, isLoading, searchTerm, setSearchTerm, filters, refreshTSVs, lastUpdated, refreshProgress } =
    useGameStore()
  const [showFilters, setShowFilters] = useState(false)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Fix uncontrolled input warning for search input
  const [searchInput, setSearchInput] = useState("")

  const [isSearching, setIsSearching] = useState(false)

  const handleSearchSubmit = async () => {
    if (!searchInput.trim() || isSearching) return

    setIsSearching(true)
    await setSearchTerm(searchInput.trim())

    // Activate search mode
    if (!isSearchActive) {
      setIsSearchActive(true)
    }

    setIsSearching(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit()
    }
  }

  const handleClearSearch = () => {
    setSearchInput("")
    setSearchTerm("")
    setIsSearchActive(false)
  }

  const handleRefresh = async () => {
    try {
      await refreshTSVs()
      toast({
        title: "Data Updated",
        description: "Game database has been refreshed successfully!",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Some platforms may have failed to update. Check console for details.",
        duration: 5000,
        variant: "destructive",
      })
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  return (
    
    <div className="min-h-screen themed-bg text-themed-primary overflow-x-hidden">
      {/* Animated Background Elements */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee+Shade&display=swap');
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-themed-accent rounded-full opacity-30"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-themed-accent rounded-full opacity-20 animation-delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-themed-accent rounded-full opacity-25 animation-delay-2000"></div>
        <div className="absolute bottom-40 right-1/3 w-1 h-1 bg-themed-accent rounded-full opacity-15 animation-delay-3000"></div>
      </div>

      {/* Header - Always visible */}
      <header
        className={`flex items-center justify-between p-4 border-b border-themed-border themed-bg-secondary transition-all duration-700 ease-out backdrop-blur-sm ${
          isSearchActive ? "relative shadow-lg" : "fixed top-0 left-0 right-0 z-10 shadow-xl"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
        >
          <RefreshCw
            className={`h-5 w-5 transition-transform duration-500 ${isLoading ? "animate-spin" : "hover:rotate-180"}`}
          />
        </Button>

        {/* <h1
          className={`font-bold font-mono tracking-wider text-themed-primary transition-all duration-700 ease-out ${
            isSearchActive ? "text-2xl" : "text-4xl"
          } hover:text-themed-accent cursor-default truncate mx-4`}
        >
          ROMULUS
        </h1> */}
        <h1
          className={`font-bold tracking-wider text-themed-primary transition-all duration-700 ease-out ${
            isSearchActive ? "text-2xl" : "text-4xl"
          } hover:text-themed-accent cursor-default truncate mx-4`}
          style={{ fontFamily: "'Bungee Shade', sans-serif" }} // Apply the Bungee Shade font here
        >
          ROMULUS
        </h1>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings")}
          className="text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
        >
          <Settings className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />
        </Button>
      </header>

      {/* Main Content */}
      <div className={`transition-all duration-700 ease-out ${isSearchActive ? "pt-0" : "pt-20"}`}>
        {/* Search Section */}
        <div
          className={`flex items-center justify-center transition-all duration-700 ease-out ${
            isSearchActive ? "p-4 themed-bg-secondary shadow-inner" : "min-h-[60vh] px-4"
          }`}
        >
          <div
            className={`w-full max-w-2xl transition-all duration-700 ease-out ${isSearchActive ? "max-w-full" : ""}`}
          >
            <div className="flex gap-2">
              <div className="flex-1 relative group min-w-0">
                <Search
                  className={`rounded-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-themed-secondary transition-all duration-300 ${
                    isSearchFocused ? "text-themed-accent scale-110" : ""
                  } ${isSearchActive ? "h-4 w-4" : "h-5 w-5"} flex-shrink-0`}
                />
                <Input
                  placeholder="Search for games..."
                  value={searchInput || ""} // Ensure never undefined
                  onChange={(e) => setSearchInput(e.target.value || "")} // Ensure never undefined
                  onKeyPress={handleKeyPress}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={`rounded-lg pl-10 pr-20 themed-bg-tertiary border-themed-border text-themed-primary placeholder-themed-secondary focus:border-themed-accent focus:ring-2 focus:ring-themed-accent/20 transition-all duration-500 ease-out hover:border-themed-accent/50 ${
                    isSearchActive ? "h-10" : "h-14 text-lg"
                  } ${isSearchFocused ? "shadow-lg scale-[1.02]" : ""} w-full min-w-0`}
                />

                {/* Search/Clear Button */}
                <div className="rounded-lg absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {searchInput && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="h-8 w-8 p-0 text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-110 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearchSubmit}
                    disabled={!searchInput.trim() || isSearching}
                    className={`rounded-lg h-8 px-3 text-themed-secondary hover:text-themed-primary hover:bg-themed-accent/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 ${
                      searchInput.trim() ? "text-themed-accent" : ""
                    } flex-shrink-0 min-w-0`}
                  >
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-themed-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Animated border effect */}
                <div
                  className={`rounded-lg absolute inset-0 border-2 border-themed-accent opacity-0 transition-opacity duration-300 pointer-events-none ${
                    isSearchFocused ? "opacity-30" : ""
                  }`}
                ></div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(true)}
                className={`rounded-lg themed-bg-secondary border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-500 ease-out hover:scale-110 active:scale-95 hover:border-themed-accent ${
                  isSearchActive ? "h-10 w-10" : "h-14 w-14"
                } flex-shrink-0`}
              >
                <Filter
                  className={`transition-all duration-300 hover:rotate-12 ${isSearchActive ? "h-4 w-4" : "h-5 w-5"}`}
                />
              </Button>
            </div>

            {/* Search Info */}
            {isSearchActive && (
              <div className="mt-4 text-sm text-themed-secondary animate-in slide-in-from-top-2 duration-500">
                {isLoading && refreshProgress ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
                    <span className="animate-pulse truncate">
                      Refreshing {refreshProgress.platform} ({refreshProgress.current}/{refreshProgress.total})
                    </span>
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-300">
                    <div className="w-4 h-4 border-2 border-themed-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span className="animate-pulse">Searching games...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="animate-in fade-in duration-300">
                    <span className="font-semibold text-themed-accent">{searchResults.length}</span> games found for "
                    {searchTerm}"
                    {filters.consoles.length > 0 && <span> • Consoles: {filters.consoles.join(", ")}</span>}
                    {filters.regions.length > 0 && <span> • Regions: {filters.regions.join(", ")}</span>}
                  </div>
                ) : searchTerm.trim() ? (
                  <div className="animate-in fade-in duration-300">
                    <span className="text-themed-accent">No games found for "{searchTerm}"</span>
                    <button
                      onClick={handleClearSearch}
                      className="ml-2 text-themed-secondary hover:text-themed-primary underline transition-colors duration-200"
                    >
                      Clear search
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Initial State Message */}
        {!isSearchActive && !isLoading && (
          <div className="text-center px-4 animate-in fade-in duration-700 delay-300">
            <div className="max-w-md mx-auto">
              <p className="text-themed-secondary text-lg mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-500">
                Welcome to Romulus
              </p>
              <p className="text-themed-secondary text-sm mb-4 animate-in slide-in-from-bottom-4 duration-500 delay-700">
                {lastUpdated
                  ? `Database last updated: ${new Date(lastUpdated).toLocaleString()}`
                  : "Click the refresh button to download game data, then start typing to search"}
              </p>
              {!lastUpdated && (
                <div className="flex items-center justify-center gap-2 text-themed-accent animate-in slide-in-from-bottom-4 duration-500 delay-1000">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">First time setup: Click refresh to download game database</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && refreshProgress && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center animate-in zoom-in duration-500">
              <div className="relative">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-themed-secondary" />
                <div className="absolute inset-0 h-12 w-12 mx-auto border-2 border-themed-accent rounded-full opacity-20"></div>
              </div>
              <p className="text-themed-secondary animate-pulse">
                Refreshing {refreshProgress.platform} ({refreshProgress.current}/{refreshProgress.total})
              </p>
              <p className="text-themed-secondary text-sm mt-1">This may take a few minutes</p>
              <div className="w-64 bg-themed-tertiary rounded-full h-2 mt-4 mx-auto overflow-hidden">
                <div
                  className="bg-themed-accent h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(refreshProgress.current / refreshProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Games Grid with Pagination */}
        {isSearchActive && !isLoading && !isSearching && searchTerm.trim() && (
          <div className="p-4 animate-in slide-in-from-bottom-4 duration-700">
            <PaginatedGameGrid games={searchResults} itemsPerPage={10} />
          </div>
        )}
      </div>

      {/* Floating Action Button - Made rounded square */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => router.push("/downloads")}
          className="themed-bg-tertiary hover:bg-themed-secondary text-themed-primary border border-themed-border shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 rounded-lg w-14 h-14 p-0 group flex-shrink-0"
        >
          <Download className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          <div className="absolute inset-0 rounded-lg bg-themed-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </Button>
      </div>

      <FilterModal open={showFilters} onClose={() => setShowFilters(false)} />
    </div>
  )
}
