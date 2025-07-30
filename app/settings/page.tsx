"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Palette, Database, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useSettingsStore } from "@/lib/settings-store"
import { useGameStore } from "@/lib/store"
import { useIGDBStore } from "@/lib/igdb-store"
import { useToast } from "@/hooks/use-toast"
import filenamesData from "@/assets/data/filenames.json"

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { settings, updateSettings } = useSettingsStore()
  const gameStore = useGameStore()
  const { clearCache, getCacheSize } = useIGDBStore()

  // Fix uncontrolled input warnings by providing default values
  const [localSettings, setLocalSettings] = useState({
    ...settings,
    // Ensure all fields have default values to prevent uncontrolled inputs
    primaryColor: settings.primaryColor || "#3b82f6",
    secondaryColor: settings.secondaryColor || "#1e40af",
    accentColor: settings.accentColor || "#60a5fa",
    backgroundColor: settings.backgroundColor || "#111827",
    concurrentDownloads: settings.concurrentDownloads || 2,
    downloadPaths: settings.downloadPaths || {},
    grayscaleMode: settings.grayscaleMode ?? true,
  })

  const [availableTSVs, setAvailableTSVs] = useState<Array<{ filename: string; timestamp: number | null }>>([])
  const [cacheStats, setCacheStats] = useState<{ totalImages: number; cacheSize: number }>({
    totalImages: 0,
    cacheSize: 0,
  })

  // Auto-save functionality - update settings whenever localSettings changes
  useEffect(() => {
    updateSettings(localSettings)
  }, [localSettings, updateSettings])

  // Load TSV info on mount
  useEffect(() => {
    const loadTSVInfo = async () => {
      try {
        const tsvs = await gameStore.getAvailableTSVs()
        setAvailableTSVs(tsvs)

        // Load cache stats
        const stats = await getCacheSize()
        setCacheStats(stats)
      } catch (error) {
        console.error("Error loading TSV info:", error)
      }
    }
    loadTSVInfo()
  }, [gameStore, getCacheSize])

  const handleSave = () => {
    updateSettings(localSettings)
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully!",
      duration: 3000,
    })
  }

  const handleClearCache = async () => {
    await clearCache()
    setCacheStats({ totalImages: 0, cacheSize: 0 })
    toast({
      title: "Cache Cleared",
      description: "IGDB image cache has been cleared",
      duration: 3000,
    })
  }

  const consoles = Object.values(filenamesData).flatMap((manufacturer) =>
    Object.entries(manufacturer).map(([fullName, shortName]) => ({
      fullName,
      shortName,
    })),
  )

  return (
    <div className="min-h-screen themed-bg text-themed-primary">
      {/* Header */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee+Shade&display=swap');
      `}</style>
      <header className="themed-bg-secondary flex items-center justify-between p-4 border-b border-themed-border backdrop-blur-sm sticky top-0 z-10">
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
          SETTINGS
        </h1>

        <Button
          onClick={handleSave}
          className="themed-bg-tertiary hover:bg-themed-secondary text-themed-primary border border-themed-border transition-all duration-300 hover:scale-105 flex-shrink-0 px-3 py-2 text-sm"
        >
          <span className="truncate">Save</span>
        </Button>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Download Settings */}
        <div className="space-y-6 themed-bg-primary p-6 rounded-lg border border-themed-border animate-in slide-in-from-top-4 duration-500">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-themed-primary">
            <Download className="h-6 w-6 flex-shrink-0" />
            <span className="truncate">Download Settings</span>
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-themed-secondary font-mono">
                Concurrent Downloads: {localSettings.concurrentDownloads}
              </Label>
              <Slider
                value={[localSettings.concurrentDownloads]}
                onValueChange={([value]) => setLocalSettings((prev) => ({ ...prev, concurrentDownloads: value }))}
                max={5}
                min={1}
                step={1}
                className="w-full mt-2 themed-bg rounded-lg themed-accent"
              />
              <p className="text-sm text-themed-secondary mt-1">Number of games that can download simultaneously</p>
            </div>
          </div>
        </div>

        {/* Download Paths */}
        <div className="space-y-6 themed-bg-primary p-6 rounded-lg border border-themed-border animate-in slide-in-from-top-4 duration-500 delay-100">
          <h2 className="text-2xl font-bold text-themed-primary">Download Paths</h2>
          <p className="text-themed-secondary text-sm">Set custom download locations for each console</p>

          <div className="grid gap-4 max-h-96 overflow-y-auto">
            {consoles.map(({ fullName, shortName }) => (
              <div key={shortName} className="space-y-2">
                <Label className="text-sm text-themed-secondary font-mono truncate block">
                  {fullName} ({shortName})
                </Label>
                <Input
                  value={localSettings.downloadPaths[shortName] || `/downloads/${shortName.replace(/\s+/g, "_")}/`}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      downloadPaths: {
                        ...prev.downloadPaths,
                        [shortName]: e.target.value,
                      },
                    }))
                  }
                  className="themed-bg-tertiary border-themed-border text-themed-primary focus:border-themed-accent w-full min-w-0"
                  placeholder={`/downloads/${shortName.replace(/\s+/g, "_")}/`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="space-y-6 themed-bg-primary p-6 rounded-lg border border-themed-border animate-in slide-in-from-top-4 duration-500 delay-200">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-themed-primary">
            <Palette className="h-6 w-6 flex-shrink-0" />
            <span className="truncate">Theme Settings</span>
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <Label className="text-themed-secondary font-mono">Grayscale Mode</Label>
                <p className="text-sm text-themed-secondary">Use only grayscale colors (except game images)</p>
              </div>
              <Switch
                checked={localSettings.grayscaleMode}
                onCheckedChange={(checked) => setLocalSettings((prev) => ({ ...prev, grayscaleMode: checked }))}
                className="flex-shrink-0"
              />
            </div>

            {!localSettings.grayscaleMode && (
              <div className="space-y-6 pl-6 border-l-2 border-themed-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-themed-secondary">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localSettings.primaryColor}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-12 p-1 themed-bg-tertiary border-0 cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={localSettings.primaryColor || "#3b82f6"}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 themed-bg-tertiary border-themed-border text-themed-primary focus:border-themed-accent min-w-0"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-themed-secondary">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localSettings.secondaryColor}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-12 p-1 themed-bg-tertiary border-0 cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={localSettings.secondaryColor || "#1e40af"}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 themed-bg-tertiary border-themed-border text-themed-primary focus:border-themed-accent min-w-0"
                        placeholder="#1e40af"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-themed-secondary">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localSettings.accentColor}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, accentColor: e.target.value }))}
                        className="w-16 h-12 p-1 themed-bg-tertiary border-0 cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={localSettings.accentColor || "#60a5fa"}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, accentColor: e.target.value }))}
                        className="flex-1 themed-bg-tertiary border-themed-border text-themed-primary focus:border-themed-accent min-w-0"
                        placeholder="#60a5fa"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-themed-secondary">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={localSettings.backgroundColor}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-16 h-12 p-1 themed-bg-tertiary border-0 cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={localSettings.backgroundColor || "#111827"}
                        onChange={(e) => setLocalSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="flex-1 themed-bg-tertiary text-themed-primary border-themed-border focus:border-themed-accent min-w-0"
                        placeholder="#111827"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Presets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-themed-secondary">Theme Presets</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#ecb97e",
                    secondaryColor: "#d07f62",
                    accentColor: "#8c3f27",
                    backgroundColor: "#ffd6a7",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🍫 Caramel</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#f9c8d2",
                    secondaryColor: "#fbbcc8",
                    accentColor: "#f1a7c9",
                    backgroundColor: "#fdf1f6",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🌸 Sakura</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#f2a6e8",
                    secondaryColor: "#d392cd",
                    accentColor: "#7c5a79",
                    backgroundColor: "#ffc2f7",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🧛 Dracula</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#f6fde7",
                    secondaryColor: "#b2fb98",
                    accentColor: "#343300",
                    backgroundColor: "#e1e6d9",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🍏 Green Apple</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#fde7e7",
                    secondaryColor: "#fb9898",
                    accentColor: "#343300",
                    backgroundColor: "#ebc7c7",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🍎 Red Apple</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#fcfdb4",
                    secondaryColor: "#ffe68a",
                    accentColor: "#433f3a",
                    backgroundColor: "#fcffcc",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">🐝 Bumblebee</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#ffffff",
                    secondaryColor: "#e3e9f4",
                    accentColor: "#021431",
                    backgroundColor: "#cdcdcd",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">⚪ Classic</span>
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    primaryColor: "#1b1718",
                    secondaryColor: "#2f1b05",
                    accentColor: "#c59f61",
                    backgroundColor: "#0b0809",
                    grayscaleMode: false,
                  }))
                }
                className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary transition-all duration-300 hover:scale-105 p-2 text-sm min-w-0"
              >
                <span className="truncate">⚫ Classic</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="space-y-6 themed-bg-primary p-6 rounded-lg border border-themed-border animate-in slide-in-from-top-4 duration-500 delay-300">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-themed-primary">
            <Database className="h-6 w-6 flex-shrink-0" />
            <span className="truncate">Database Info</span>
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-themed-secondary font-mono">Available TSV Files</Label>
              <p className="text-sm text-themed-secondary mb-2">
                {availableTSVs.filter((tsv) => tsv.timestamp).length} of {availableTSVs.length} platforms cached
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableTSVs.map((tsv) => (
                  <div key={tsv.filename} className="flex justify-between text-sm gap-2">
                    <span className="text-themed-secondary truncate flex-1">{tsv.filename}</span>
                    <span className="text-themed-secondary flex-shrink-0">
                      {tsv.timestamp ? new Date(tsv.timestamp).toLocaleDateString() : "Not cached"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-themed-secondary font-mono">IGDB Image Cache</Label>
              <p className="text-sm text-themed-secondary">
                {cacheStats.totalImages} images cached ({(cacheStats.cacheSize / 1024 / 1024).toFixed(2)} MB)
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={handleClearCache}
                  className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary bg-transparent transition-all duration-300 hover:scale-105 flex-shrink-0 px-3 py-2 text-sm"
                >
                  <span className="truncate">Clear Image Cache</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const stats = await getCacheSize()
                    setCacheStats(stats)
                  }}
                  className="border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary bg-transparent transition-all duration-300 hover:scale-105 flex-shrink-0 px-3 py-2 text-sm"
                >
                  <span className="truncate">Refresh Stats</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Downloads Button - Made rounded square */}
      <div className="fixed bottom-4 right-4">
        <Button
          onClick={() => router.push("/downloads")}
          className="themed-bg-tertiary hover:bg-themed-secondary text-themed-primary border border-themed-border shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 rounded-lg w-14 h-14 p-0 group flex-shrink-0"
        >
          <Download className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
        </Button>
      </div>
    </div>
  )
}
