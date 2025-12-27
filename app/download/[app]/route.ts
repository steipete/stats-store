import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface GitHubRelease {
  tag_name: string
  prerelease: boolean
  draft: boolean
  assets: {
    name: string
    browser_download_url: string
  }[]
}

export async function GET(_request: NextRequest, context: { params: Promise<{ app: string }> }) {
  const supabase = createSupabaseServerClient()
  const { app } = await context.params
  const appIdentifier = app.toLowerCase()

  try {
    // First try to find app by name (case insensitive)
    let { data: app, error } = await supabase
      .from("apps")
      .select("id, name, bundle_identifier, appcast_base_url")
      .ilike("name", appIdentifier)
      .single()

    // If not found by name, try by bundle identifier
    if (!app) {
      const result = await supabase
        .from("apps")
        .select("id, name, bundle_identifier, appcast_base_url")
        .eq("bundle_identifier", appIdentifier)
        .single()

      app = result.data
      error = result.error
    }

    if (error || !app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 })
    }

    // Check if this app is hosted on GitHub
    if (!app.appcast_base_url || !app.appcast_base_url.includes("github.com")) {
      return NextResponse.json({ error: "Download not available for this app" }, { status: 404 })
    }

    // Extract GitHub owner and repo from URL
    const githubMatch = app.appcast_base_url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!githubMatch) {
      return NextResponse.json({ error: "Invalid GitHub URL format" }, { status: 500 })
    }

    const [, owner, repo] = githubMatch

    // Fetch releases from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "stats-store-app-downloader",
      },
      // Cache for 5 minutes to avoid hitting rate limits
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`)
    }

    const releases: GitHubRelease[] = await response.json()

    // Filter out draft releases
    const publishedReleases = releases.filter((release) => !release.draft)

    // Find the latest stable release
    let targetRelease = publishedReleases.find((release) => !release.prerelease)

    // If no stable release found, use the latest prerelease
    if (!targetRelease && publishedReleases.length > 0) {
      targetRelease = publishedReleases[0]
    }

    if (!targetRelease) {
      return NextResponse.json({ error: "No releases found" }, { status: 404 })
    }

    // Find the DMG asset
    const dmgAsset = targetRelease.assets.find((asset) => asset.name.toLowerCase().endsWith(".dmg"))

    if (!dmgAsset) {
      return NextResponse.json({ error: "No DMG file found in the latest release" }, { status: 404 })
    }

    // Redirect to the DMG download URL
    return NextResponse.redirect(dmgAsset.browser_download_url)
  } catch (error) {
    console.error("Error fetching app releases:", error)
    return NextResponse.json({ error: "Failed to fetch release information" }, { status: 500 })
  }
}
