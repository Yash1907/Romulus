import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log(`Download request for: ${url}`)

    // Validate URL to prevent SSRF attacks
    const parsedUrl = new URL(url)
    const allowedHosts = ["myrient.erista.me", "archive.org", "zeus.dl.playstation.net"]

    if (!allowedHosts.some((host) => parsedUrl.hostname.includes(host))) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
    }

    // Handle NoPayStation URLs differently - they are direct download links
    if (url.includes("zeus.dl.playstation.net") || (url.startsWith("http") && !url.includes("myrient"))) {
      console.log(`Direct download URL detected: ${url}`)

      // For NoPayStation and other direct download URLs, just proxy the request
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      })

      if (!response.ok) {
        console.error(`Direct download failed: ${response.status} ${response.statusText}`)
        console.error(`Response headers:`, Object.fromEntries(response.headers.entries()))

        // For 403/404 errors on direct downloads, provide more specific error messages
        if (response.status === 403) {
          return NextResponse.json(
            {
              error: "Download forbidden - file may require authentication or be region-locked",
              details: `HTTP ${response.status}: ${response.statusText}`,
            },
            { status: 403 },
          )
        }

        if (response.status === 404) {
          return NextResponse.json(
            {
              error: "File not found - download link may be expired or invalid",
              details: `HTTP ${response.status}: ${response.statusText}`,
            },
            { status: 404 },
          )
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Get content info
      const contentLength = response.headers.get("content-length")
      const contentType = response.headers.get("content-type") || "application/octet-stream"
      const filename = parsedUrl.pathname.split("/").pop() || "download"

      console.log(`Direct download successful: ${filename} (${contentLength} bytes)`)

      // Create response headers
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      })

      if (contentLength) {
        headers.set("Content-Length", contentLength)
      }

      // Stream the response
      return new NextResponse(response.body, {
        status: 200,
        headers,
      })
    }

    // Handle Myrient URLs with redirect following
    console.log(`Myrient download: ${url}`)

    // First, try to get the final URL by following redirects manually
    let finalUrl = url
    let redirectCount = 0
    const maxRedirects = 5

    while (redirectCount < maxRedirects) {
      const headResponse = await fetch(finalUrl, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "manual", // Handle redirects manually
      })

      if (headResponse.status >= 300 && headResponse.status < 400) {
        const location = headResponse.headers.get("location")
        if (location) {
          finalUrl = new URL(location, finalUrl).toString()
          redirectCount++
          console.log(`Redirect ${redirectCount}: ${finalUrl}`)
          continue
        }
      }
      break
    }

    console.log(`Final URL after redirects: ${finalUrl}`)

    // Now download from the final URL
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        Referer: parsedUrl.origin,
      },
    })

    if (!response.ok) {
      console.error(`Download failed: ${response.status} ${response.statusText}`)
      console.error(`Response headers:`, Object.fromEntries(response.headers.entries()))

      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "File not found on server",
            details: `The requested file could not be found. It may have been moved or deleted.`,
          },
          { status: 404 },
        )
      }

      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Get content info
    const contentLength = response.headers.get("content-length")
    const contentType = response.headers.get("content-type") || "application/octet-stream"
    const filename = new URL(finalUrl).pathname.split("/").pop() || "download"

    console.log(`Download successful: ${filename} (${contentLength} bytes)`)

    // Create response headers
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    })

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Download proxy error:", error)
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
