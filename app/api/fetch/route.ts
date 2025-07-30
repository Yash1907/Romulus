import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL to prevent SSRF attacks
    const parsedUrl = new URL(url)
    const allowedHosts = ["myrient.erista.me", "nopaystation.com", "api.igdb.com", "images.igdb.com"]

    if (!allowedHosts.some((host) => parsedUrl.hostname.includes(host))) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
    }

    // Default headers to mimic a real browser
    const defaultHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    }

    // Merge with provided options
    const fetchOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const data = await response.json()
      return NextResponse.json({ data, contentType })
    } else if (contentType.includes("text/") || contentType.includes("application/xml")) {
      const text = await response.text()
      return NextResponse.json({ data: text, contentType })
    } else {
      // For binary data, convert to base64
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      return NextResponse.json({ data: base64, contentType, encoding: "base64" })
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
