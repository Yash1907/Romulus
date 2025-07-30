import { type NextRequest, NextResponse } from "next/server"

// Rate limiting state (in production, use Redis or similar)
let lastRequestTime = 0
const MIN_INTERVAL = 250 // 4 requests per second

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < MIN_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL - timeSinceLastRequest))
    }
    lastRequestTime = Date.now()

    const { gameTitle, platform } = await request.json()

    if (!gameTitle) {
      return NextResponse.json({ error: "Game title is required" }, { status: 400 })
    }

    const CLIENT_ID = process.env.NEXT_PUBLIC_IGDB_CLIENT_ID
    // process.env.NEXT_PUBLIC_IGDB_ACCESS_TOKEN = await refreshToken()
    const ACCESS_TOKEN = await refreshToken();

    if (!CLIENT_ID || !ACCESS_TOKEN) {
      console.warn("IGDB API credentials not configured")
      return NextResponse.json({
        imageUrl: `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(gameTitle.slice(0, 15))}`,
      })
    }

    // Enhanced title cleaning for better search results
    const cleanTitle = gameTitle
      // .replace(/\s*$$.*?$$\s*/g, "") // Remove parentheses content
      // .replace(/\s*\[.*?\]\s*/g, "") // Remove bracket content
      // .replace(/\s*-\s*.*$/, "") // Remove everything after dash
      // .replace(/\s*:\s*.*$/, "") // Remove everything after colon
      // .replace(/\s*,\s*The$/i, "") // Remove ", The" suffix
      // .replace(/^The\s+/i, "") // Remove "The " prefix
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()

    // Platform mapping for better IGDB matching
    const platformMap: Record<string, string[]> = {
      NES: ["Nintendo Entertainment System", "NES", "Famicom"],
      SNES: ["Super Nintendo Entertainment System", "SNES", "Super Famicom"],
      GB: ["Game Boy"],
      GBC: ["Game Boy Color"],
      GBA: ["Game Boy Advance"],
      N64: ["Nintendo 64"],
      GameCube: ["Nintendo GameCube", "GameCube"],
      Wii: ["Nintendo Wii", "Wii"],
      NDS: ["Nintendo DS", "DS"],
      "3DS": ["Nintendo 3DS", "3DS"],
      PS1: ["PlayStation", "PSX", "PS1"],
      PS2: ["PlayStation 2", "PS2"],
      PS3: ["PlayStation 3", "PS3"],
      PSP: ["PlayStation Portable", "PSP"],
      PSV: ["PlayStation Vita", "PS Vita", "Vita"],
      Genesis: ["Sega Genesis", "Mega Drive", "Genesis"],
      Master_System: ["Sega Master System", "Master System"],
      Game_Gear: ["Sega Game Gear", "Game Gear"],
      Saturn: ["Sega Saturn", "Saturn"],
      Dreamcast: ["Sega Dreamcast", "Dreamcast"],
    }

    // Get platform keywords for search
    const platformKeywords = platform ? platformMap[platform] || [platform] : []

    // More specific search strategies with stricter matching
    const searchStrategies = [
      // Strategy 1: Exact title match with platform filter
      `fields name, cover.image_id, platforms.name, first_release_date; search "${cleanTitle}"; where cover != null ${platformKeywords.length > 0 ? `& platforms.name ~ *"${platformKeywords[0]}"*` : ""}; limit 3;`,

      // Strategy 2: Exact title without platform filter but with release date preference
      `fields name, cover.image_id, platforms.name, first_release_date; search "${cleanTitle}"; where cover != null; sort first_release_date asc; limit 5;`,

      // Strategy 3: Word-based search with all words required
      `fields name, cover.image_id, platforms.name, first_release_date; where name ~ "${cleanTitle.split(" ").join('" & "')}" & cover != null; limit 5;`,

      // Strategy 4: Fuzzy search as last resort
      `fields name, cover.image_id, platforms.name, first_release_date; where name ~ *"${cleanTitle}"* & cover != null; limit 10;`,
    ]

    let bestMatch = null
    let bestScore = 0

    for (const searchQuery of searchStrategies) {
      try {
        const searchResponse = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": CLIENT_ID,
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "text/plain",
          },
          body: searchQuery,
        })

        if (!searchResponse.ok) {
          if (searchResponse.status === 429) {
            // Rate limited, wait and retry
            await new Promise((resolve) => setTimeout(resolve, 1000))
            continue
          }
          console.warn(`IGDB search failed with status: ${searchResponse.status}`)
          continue
        }

        const games = await searchResponse.json()

        for (const game of games) {
          if (!game.cover?.image_id) continue

          // Calculate match score with stricter criteria
          const score = calculateMatchScore(
            cleanTitle,
            gameTitle,
            game.name,
            platformKeywords,
            game.platforms,
            game.first_release_date,
          )

          if (score > bestScore) {
            bestScore = score
            bestMatch = game
          }
        }

        // If we found a very good match, use it
        if (bestScore >= 0.9) break
      } catch (error) {
        console.warn(`IGDB search strategy failed:`, error)
        continue
      }
    }

    if (bestMatch && bestMatch.cover?.image_id && bestScore >= 0.6) {
      // Increased minimum score threshold
      // Use higher quality image - t_cover_big_2x for better quality
      const imageId = bestMatch.cover.image_id
      const fullUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`

      console.log(`Found match for "${gameTitle}" (${platform}): "${bestMatch.name}" (score: ${bestScore})`)
      return NextResponse.json({ imageUrl: fullUrl, matchedTitle: bestMatch.name, score: bestScore })
    }

    // No good match found, use placeholder
    const placeholder = `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(gameTitle.slice(0, 15))}`
    console.log(`No good match found for "${gameTitle}" (best score: ${bestScore})`)
    return NextResponse.json({ imageUrl: placeholder, matchedTitle: null, score: 0 })
  } catch (error) {
    console.error(`Failed to fetch cover art:`, error)

    // Fallback to placeholder
    const { gameTitle } = await request.json().catch(() => ({ gameTitle: "Game" }))
    const placeholder = `/placeholder.svg?height=400&width=300&text=${encodeURIComponent(gameTitle?.slice(0, 15) || "Game")}`
    return NextResponse.json({ imageUrl: placeholder, error: 'error.message' })
  }
}

async function refreshToken(){
  const url = `https://id.twitch.tv/oauth2/token?client_id=${process.env.NEXT_PUBLIC_IGDB_CLIENT_ID}&client_secret=${process.env.NEXT_CLIENT_SECRET}&grant_type=client_credentials`
  const token = await fetch(url,{
    method:"POST"
  })
  const result = await token.json()
  return result.access_token
}

// Enhanced matching algorithm with stricter criteria
function calculateMatchScore(
  cleanTitle: string,
  originalTitle: string,
  igdbTitle: string,
  platformKeywords: string[],
  igdbPlatforms: any[],
  releaseDate?: number,
): number {
  let score = 0

  // Normalize titles for comparison
  const normalizeForComparison = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()

  // const normalizedClean = normalizeForComparison(cleanTitle)
  const normalizedClean = originalTitle
  const normalizedOriginal = normalizeForComparison(originalTitle)
  const normalizedIgdb = normalizeForComparison(igdbTitle)
  // const normalizedClean = cleanTitle
  // const normalizedOriginal = originalTitle
  // const normalizedIgdb = igdbTitle
  console.log(`clean title: ${normalizedClean}`)
  console.log(`original title: ${normalizedOriginal}`)
  console.log(`igdb title: ${normalizedIgdb}`)
  console.log(`only alpha title: ${originalTitle.replace(/[^a-zA-Z]/g, '').toLowerCase()}`)
  console.log(`only alpha igdb title: ${igdbTitle.replace(/[^a-zA-Z]/g, '').toLowerCase()}`)

  // Exact match gets highest score
  if (originalTitle.replace(/[^a-zA-Z]/g, '').toLowerCase() === igdbTitle.replace(/[^a-zA-Z]/g, '').toLowerCase()) {
    score += 1.0
  } else if (originalTitle.replace(/[^a-zA-Z]/g, '').toLowerCase() === igdbTitle.replace(/[^a-zA-Z]/g, '').toLowerCase()) {
    score += 0.95
  } else {
    // Check for exact word matches (more strict)
    const cleanWords = normalizedClean.split(" ").filter((word) => word.length > 2)
    const igdbWords = normalizedIgdb.split(" ").filter((word) => word.length > 2)

    // All clean words must be present in IGDB title for a good match
    const exactMatches = cleanWords.filter((word) => igdbWords.includes(word))
    // const wordMatchRatio = exactMatches.length / cleanWords.length

    const ratio = (s1:string, s2:string) => [...new Set(s1.toLowerCase().match(/[a-z]/g) || [])].filter(c => (s2.toLowerCase().includes(c))).length / (new Set(s1.toLowerCase().match(/[a-z]/g) || [])).size;
    const wordMatchRatio = ratio(originalTitle.replace(/[^a-zA-Z]/g, '').toLowerCase(),igdbTitle.replace(/[^a-zA-Z]/g, '').toLowerCase())
    if (wordMatchRatio >= 0.8) {
      // At least 80% of words must match exactly
      score += wordMatchRatio * 0.9
      console.log(`greater than 80% ${score}`)
    } else if (wordMatchRatio >= 0.6) {
      // 60-80% match gets lower score
      score += wordMatchRatio * 0.6
      console.log(`greater than 60% ${score}`)
    } else {
      // Partial word matching as fallback
      const partialMatches = cleanWords.filter((word) =>
        igdbWords.some((igdbWord) => igdbWord.includes(word) || word.includes(igdbWord)),
      )
      console.log(`partial words ${score}`)
      score += (partialMatches.length / cleanWords.length) * 0.4
    }

    // Penalty for extra words in IGDB title that aren't in clean title
    const extraWords = igdbWords.filter(
      (word) => !cleanWords.some((cleanWord) => cleanWord.includes(word) || word.includes(cleanWord)),
    )
    // if (extraWords.length > cleanWords.length) {
    //   score *= 0.8 // Reduce score if IGDB title has too many extra words
    //   console.log(`too many words penalty ${score}`)
    // }
    if(originalTitle.replace(/[^a-zA-Z]/g, '').toLowerCase().length > igdbTitle.replace(/[^a-zA-Z]/g, '').toLowerCase().length){
      score *= 0.8
    }
  }

  // Platform matching bonus (more important now)
  // if (platformKeywords.length > 0 && igdbPlatforms) {
  //   const platformNames = igdbPlatforms.map((p) => p.name?.toLowerCase() || "")
  //   const platformMatch = platformKeywords.some((keyword) =>
  //     platformNames.some((name) => name.includes(keyword.toLowerCase())),
  //   )

  //   if (platformMatch) {
  //     score += 0.1 // Increased platform bonus
  //   } else {
  //     score *= 0.7 // Penalty for platform mismatch
  //   }
  //   console.log(`platform match/mismatch ${score}`)
  // }
  console.log(score)
  return Math.min(score, 1.0) // Cap at 1.0
}
