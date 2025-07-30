import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Romulus - Retro Game Manager",
  description: "A retro-styled ROM management application"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <link rel="manifest" href="/manifest.json" />
      {/* Apple touch icons */}
      <link rel="apple-touch-icon" sizes="180x180" href="/180.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/152.png" />
      <link rel="apple-touch-icon" sizes="120x120" href="/120.png" />
      <link rel="apple-touch-icon" sizes="76x76" href="/76.png" />
      
      {/* Startup (splash) screen background color */}
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Romulus" />
      <meta name="theme-color" content="#808080" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
