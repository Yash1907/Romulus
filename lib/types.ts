export interface Game {
  href: string
  title: string
  size: string
  location: string
  special: string
  languages: string
  archive: string
  platform: string
  file_name?: string
  id: string
}

export interface Download {
  id: string
  game: Game
  status: "queued" | "downloading" | "paused" | "completed" | "failed"
  progress: number
  speed: number
  eta: number
}

export interface Filters {
  consoles: string[]
  regions: string[]
}

export interface Settings {
  concurrentDownloads: number
  downloadPaths: Record<string, string>
  grayscaleMode: boolean
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string // Added background color parameter
}
