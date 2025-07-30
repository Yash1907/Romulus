"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useGameStore } from "@/lib/store"
import filenamesData from "@/assets/data/filenames.json"

interface FilterModalProps {
  open: boolean
  onClose: () => void
}

export function FilterModal({ open, onClose }: FilterModalProps) {
  const { filters, setFilters } = useGameStore()
  const [localFilters, setLocalFilters] = useState(filters)

  const consoles = Object.values(filenamesData).flatMap((manufacturer) => Object.values(manufacturer))
  const regions = ["US", "EU", "JP", "World"]

  const handleApply = () => {
    setFilters(localFilters)
    onClose()
  }

  const handleReset = () => {
    const resetFilters = { consoles: [], regions: [] }
    setLocalFilters(resetFilters)
    setFilters(resetFilters)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="themed-bg-primary border-themed-border text-themed-primary w-[95vw] max-w-md h-[90vh] max-h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-mono text-xl truncate">FILTERS</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 min-h-0">
          {/* Console Filter */}
          <div className="flex flex-col min-h-0">
            <h3 className="font-semibold mb-2 text-themed-secondary flex-shrink-0">
              Consoles ({localFilters.consoles.length} selected)
            </h3>
            <ScrollArea className="flex-1 border border-themed-border rounded p-2 min-h-[120px] max-h-[200px]">
              <div className="space-y-2">
                {consoles.map((console) => (
                  <div key={console} className="flex items-center space-x-2">
                    <Checkbox
                      id={console}
                      checked={localFilters.consoles.includes(console)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setLocalFilters((prev) => ({
                            ...prev,
                            consoles: [...prev.consoles, console],
                          }))
                        } else {
                          setLocalFilters((prev) => ({
                            ...prev,
                            consoles: prev.consoles.filter((c) => c !== console),
                          }))
                        }
                      }}
                      className="flex-shrink-0"
                    />
                    <label htmlFor={console} className="text-sm text-themed-secondary cursor-pointer truncate flex-1">
                      {console}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Region Filter */}
          <div className="flex-shrink-0">
            <h3 className="font-semibold mb-2 text-themed-secondary">
              Regions ({localFilters.regions.length} selected)
            </h3>
            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              {regions.map((region) => (
                <div key={region} className="flex items-center space-x-2">
                  <Checkbox
                    id={region}
                    checked={localFilters.regions.includes(region)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLocalFilters((prev) => ({
                          ...prev,
                          regions: [...prev.regions, region],
                        }))
                      } else {
                        setLocalFilters((prev) => ({
                          ...prev,
                          regions: prev.regions.filter((r) => r !== region),
                        }))
                      }
                    }}
                    className="flex-shrink-0"
                  />
                  <label htmlFor={region} className="text-sm text-themed-secondary cursor-pointer">
                    {region}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 bg-transparent border-themed-border text-themed-secondary hover:text-themed-primary hover:bg-themed-tertiary px-3 py-2 text-sm min-w-0"
          >
            <span className="truncate">Reset</span>
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 themed-bg-secondary hover:bg-themed-secondary text-themed-primary px-3 py-2 text-sm min-w-0"
          >
            <span className="truncate">Apply Filters</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
