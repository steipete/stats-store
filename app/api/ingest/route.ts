import { NextResponse, type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import { createHash } from "crypto"

// Sparkle's cputype is an enum, we can map it to a more readable string.
const CPU_TYPE_MAP: { [key: string]: string } = {
  "16777228": "arm64", // CPU_TYPE_ARM64
  "7": "x86_64", // CPU_TYPE_X86_64
}

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin()
  let reportData
  try {
    reportData = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { bundleIdentifier, ip, appVersion, osVersion, cputype, ncpu, lang, model, ramMB } = reportData

  if (!bundleIdentifier) {
    return NextResponse.json({ error: "bundleIdentifier is required" }, { status: 400 })
  }

  // 1. Validate bundleIdentifier against the 'apps' table
  const { data: app, error: appError } = await supabase
    .from("apps")
    .select("id")
    .eq("bundle_identifier", bundleIdentifier)
    .single()

  if (appError || !app) {
    console.error("Validation Error:", appError?.message)
    return NextResponse.json(
      { error: `Forbidden: App with bundle identifier '${bundleIdentifier}' not found.` },
      { status: 403 },
    )
  }

  // 2. Create a daily-salted hash of the IP address for privacy
  const salt = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  const ipHash = createHash("sha256").update(`${ip}${salt}`).digest("hex")

  // 3. Sanitize and prepare data for insertion
  const newReport = {
    app_id: app.id,
    ip_hash: ipHash,
    app_version: appVersion,
    os_version: osVersion,
    cpu_arch: CPU_TYPE_MAP[cputype] || "unknown",
    core_count: ncpu ? Number.parseInt(ncpu, 10) : null,
    language: lang,
    model_identifier: model,
    ram_mb: ramMB ? Number.parseInt(ramMB, 10) : null,
  }

  // 4. Insert the new report into the 'reports' table
  const { error: insertError } = await supabase.from("reports").insert(newReport)

  if (insertError) {
    console.error("Insert Error:", insertError.message)
    return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
  }

  return NextResponse.json({ message: "Report received" }, { status: 201 })
}
