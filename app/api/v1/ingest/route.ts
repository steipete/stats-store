import { createHash } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

interface SparkleReportPayload {
  bundleIdentifier: string
  ip?: string
  appVersion?: string
  osVersion?: string
  cputype?: string
  ncpu?: string
  lang?: string
  model?: string
  ramMB?: string
}

function mapCpuTypeToArch(cputype?: string): string | undefined {
  if (!cputype) {
    return undefined
  }
  if (cputype === "16777228") {
    return "arm64"
  }
  if (cputype === "16777223") {
    return "x86_64"
  }
  return "unknown"
}

async function getIp(request: NextRequest): Promise<string> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
  if (ip) {
    return ip
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }
  return "unknown_ip"
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SparkleReportPayload
    const clientIp = payload.ip || (await getIp(request))

    if (!payload.bundleIdentifier) {
      return NextResponse.json({ error: "Missing bundleIdentifier" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id")
      .eq("bundle_identifier", payload.bundleIdentifier)
      .single()

    if (appError) {
      console.error("App validation error:", appError.message, "Bundle ID:", payload.bundleIdentifier)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    if (!app) {
      console.error("App not found:", payload.bundleIdentifier)
      return NextResponse.json({ error: "Unknown bundle identifier" }, { status: 400 })
    }

    const dailySalt = new Date().toISOString().slice(0, 10)
    const ipHash = createHash("sha256")
      .update(clientIp + dailySalt)
      .digest("hex")

    const reportData = {
      app_id: app.id,
      app_version: payload.appVersion || null,
      core_count: payload.ncpu ? Number.parseInt(payload.ncpu, 10) : null,
      cpu_arch: mapCpuTypeToArch(payload.cputype),
      ip_hash: ipHash,
      language: payload.lang || null,
      model_identifier: payload.model || null,
      os_version: payload.osVersion || null,
      ram_mb: payload.ramMB ? Number.parseInt(payload.ramMB, 10) : null,
    }

    const { error: insertError } = await supabase.from("reports").insert(reportData)

    if (insertError) {
      console.error("Error inserting report:", insertError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({ message: "Report received" }, { status: 201 })
  } catch (error) {
    console.error("Ingest API error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
