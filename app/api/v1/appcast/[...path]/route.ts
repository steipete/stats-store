import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createHash } from "crypto"

interface SparkleQueryParams {
  bundleIdentifier?: string
  bundleShortVersionString?: string
  bundleVersion?: string
  osVersion?: string
  cputype?: string
  cpusubtype?: string
  model?: string
  ncpu?: string
  lang?: string
  ramMB?: string
}

function mapCpuTypeToArch(cputype?: string): string | undefined {
  if (!cputype) return undefined
  if (cputype === "16777228") return "arm64"
  if (cputype === "16777223") return "x86_64"
  return "unknown"
}

function getIpFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  return "unknown_ip"
}

function constructAppcastUrl(baseUrl: string, appcastPath: string): string {
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, "")

  // Check if the base URL already ends with the appcast filename
  // This handles cases where the full appcast URL is stored in the database
  if (cleanBaseUrl.endsWith(".xml")) {
    // If the base URL already includes the XML file, use it as-is
    // unless the appcast path is different from the default
    if (appcastPath === "appcast.xml" || cleanBaseUrl.endsWith(`/${appcastPath}`)) {
      return cleanBaseUrl.startsWith("http://") || cleanBaseUrl.startsWith("https://")
        ? cleanBaseUrl
        : `https://${cleanBaseUrl}`
    }
    // If requesting a different appcast file, replace the filename
    const baseWithoutFile = cleanBaseUrl.substring(0, cleanBaseUrl.lastIndexOf("/"))
    return `${baseWithoutFile}/${appcastPath}`
  }

  // Handle GitHub URLs - convert to raw.githubusercontent.com
  const githubMatch = cleanBaseUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/)
  if (githubMatch) {
    const [, owner, repo] = githubMatch
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${appcastPath}`
  }

  // For other URLs, append the appcast path
  // If baseUrl already includes protocol, use as-is
  if (cleanBaseUrl.startsWith("http://") || cleanBaseUrl.startsWith("https://")) {
    return `${cleanBaseUrl}/${appcastPath}`
  }

  // Otherwise, add https://
  return `https://${cleanBaseUrl}/${appcastPath}`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    // Extract appcast filename from path (e.g., "appcast.xml" or "appcast-prerelease.xml")
    const resolvedParams = await params
    const appcastPath = resolvedParams.path.join("/")

    // Parse query parameters sent by Sparkle
    const searchParams = request.nextUrl.searchParams
    const sparkleParams: SparkleQueryParams = {
      bundleIdentifier: searchParams.get("bundleIdentifier") || undefined,
      bundleShortVersionString: searchParams.get("bundleShortVersionString") || undefined,
      bundleVersion: searchParams.get("bundleVersion") || undefined,
      osVersion: searchParams.get("osVersion") || undefined,
      cputype: searchParams.get("cputype") || undefined,
      cpusubtype: searchParams.get("cpusubtype") || undefined,
      model: searchParams.get("model") || undefined,
      ncpu: searchParams.get("ncpu") || undefined,
      lang: searchParams.get("lang") || undefined,
      ramMB: searchParams.get("ramMB") || undefined,
    }

    if (!sparkleParams.bundleIdentifier) {
      return NextResponse.json({ error: "Missing bundleIdentifier parameter" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Look up app and get appcast URL
    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id, appcast_base_url")
      .eq("bundle_identifier", sparkleParams.bundleIdentifier)
      .single()

    if (appError || !app) {
      console.error("App not found:", sparkleParams.bundleIdentifier)
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (!app.appcast_base_url) {
      return NextResponse.json({ error: "Appcast URL not configured for this application" }, { status: 404 })
    }

    // Store telemetry data
    const clientIp = getIpFromRequest(request)
    const dailySalt = new Date().toISOString().slice(0, 10)
    const ipHash = createHash("sha256")
      .update(clientIp + dailySalt)
      .digest("hex")

    const reportData = {
      app_id: app.id,
      ip_hash: ipHash,
      app_version: sparkleParams.bundleShortVersionString || sparkleParams.bundleVersion || null,
      os_version: sparkleParams.osVersion || null,
      cpu_arch: mapCpuTypeToArch(sparkleParams.cputype),
      core_count: sparkleParams.ncpu ? Number.parseInt(sparkleParams.ncpu, 10) : null,
      language: sparkleParams.lang || null,
      model_identifier: sparkleParams.model || null,
      ram_mb: sparkleParams.ramMB ? Number.parseInt(sparkleParams.ramMB, 10) : null,
    }

    // Insert telemetry data (don't wait for it to complete)
    supabase
      .from("reports")
      .insert(reportData)
      .then(({ error }) => {
        if (error) {
          console.error("Error inserting telemetry:", error)
        }
      })

    // Construct the actual appcast URL
    const actualAppcastUrl = constructAppcastUrl(app.appcast_base_url, appcastPath)

    // Fetch the actual appcast
    const appcastResponse = await fetch(actualAppcastUrl, {
      headers: {
        "User-Agent": "StatsStore/1.0 (Sparkle Proxy)",
      },
    })

    if (!appcastResponse.ok) {
      console.error(`Failed to fetch appcast from ${actualAppcastUrl}: ${appcastResponse.status}`)
      return NextResponse.json({ error: "Failed to fetch appcast" }, { status: 502 })
    }

    const appcastContent = await appcastResponse.text()

    // Prepare headers, passing through relevant ones from upstream
    const responseHeaders = new Headers({
      "Content-Type": appcastResponse.headers.get("Content-Type") || "application/xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Stats-Store-Proxied": "true",
    })

    // Pass through additional headers from upstream
    const headersToPassThrough = ["Last-Modified", "ETag"]
    headersToPassThrough.forEach(header => {
      const value = appcastResponse.headers.get(header)
      if (value) {
        responseHeaders.set(header, value)
      }
    })

    // Return the appcast with appropriate headers
    return new NextResponse(appcastContent, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Appcast proxy error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
