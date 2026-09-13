import { after, type NextRequest, NextResponse } from "next/server";
import { constructAppcastUrl, parseSparkleUserAgent } from "@/lib/appcast";
import {
  createReportIdentity,
  getRequestIp,
  mapCpuTypeToArch,
  parseTelemetryInteger,
} from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const queryKeys = [
  "appName",
  "appVersion",
  "osVersion",
  "cpu64bit",
  "ncpu",
  "cpuFreqMHz",
  "cputype",
  "cpusubtype",
  "model",
  "ramMB",
  "lang",
  "bundleIdentifier",
  "bundleShortVersionString",
  "bundleVersion",
] as const;
type SparkleQueryParams = Partial<Record<(typeof queryKeys)[number], string>>;
type AppIdSource = "bundleIdentifier" | "appName" | "userAgent";

function quoteFilterValue(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const appcastPath = (await params).path.join("/");
    const parsedUA = parseSparkleUserAgent(request.headers.get("user-agent"));
    const sparkleParams = Object.fromEntries(
      queryKeys.map((key) => [key, request.nextUrl.searchParams.get(key) || undefined]),
    ) as SparkleQueryParams;
    const appVersion =
      sparkleParams.appVersion ||
      sparkleParams.bundleShortVersionString ||
      sparkleParams.bundleVersion ||
      parsedUA?.appVersion;
    const candidates: { source: AppIdSource; value: string | undefined }[] = [
      { source: "bundleIdentifier", value: sparkleParams.bundleIdentifier },
      { source: "appName", value: sparkleParams.appName },
      {
        source: "userAgent",
        value: parsedUA?.appName === sparkleParams.appName ? undefined : parsedUA?.appName,
      },
    ];
    if (!candidates.some((candidate) => candidate.value)) {
      return NextResponse.json(
        { error: "Missing app identifier in parameters or User-Agent" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    let app: { id: string; appcast_base_url: string | null; source: AppIdSource } | undefined;
    for (const { source, value } of candidates) {
      if (!value) continue;
      const query = supabase.from("apps").select("id, appcast_base_url, bundle_identifier");
      const { data, error } = await (
        source === "bundleIdentifier"
          ? query.eq("bundle_identifier", value)
          : query.or(
              `display_name.eq.${quoteFilterValue(value)},name.eq.${quoteFilterValue(value)}`,
            )
      ).maybeSingle();
      if (error) {
        console.error("Appcast registry lookup failed:", error.message);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
      if (data) {
        app = { ...data, source };
        break;
      }
    }
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (!app.appcast_base_url) {
      return NextResponse.json(
        { error: "Appcast URL not configured for this application" },
        { status: 404 },
      );
    }

    const reportData = {
      app_id: app.id,
      app_id_source: app.source,
      app_version: appVersion || null,
      core_count: parseTelemetryInteger(sparkleParams.ncpu),
      cpu_64bit:
        sparkleParams.cpu64bit === "1" ? true : sparkleParams.cpu64bit === "0" ? false : null,
      cpu_arch: mapCpuTypeToArch(sparkleParams.cputype),
      cpu_freq_mhz: parseTelemetryInteger(sparkleParams.cpuFreqMHz),
      cpu_subtype: sparkleParams.cpusubtype || null,
      cpu_type_raw: sparkleParams.cputype || null,
      ...createReportIdentity(getRequestIp(request)),
      language: sparkleParams.lang || null,
      model_identifier: sparkleParams.model || null,
      os_version: sparkleParams.osVersion || null,
      ram_mb: parseTelemetryInteger(sparkleParams.ramMB),
    };

    // Keep the serverless invocation alive for telemetry without delaying Sparkle's feed.
    after(async () => {
      try {
        const { error } = await supabase.from("reports").insert(reportData);
        if (error) console.error("Error inserting telemetry:", error.message);
      } catch (error) {
        console.error("Telemetry transport failed:", error);
      }
    });

    const appcastResponse = await fetch(constructAppcastUrl(app.appcast_base_url, appcastPath), {
      headers: { "User-Agent": "StatsStore/1.0 (Sparkle Proxy)" },
    });
    if (!appcastResponse.ok) {
      console.error("Upstream appcast failed:", appcastResponse.status);
      return NextResponse.json({ error: "Failed to fetch appcast" }, { status: 502 });
    }

    const responseHeaders = new Headers({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": appcastResponse.headers.get("Content-Type") || "application/xml",
      "X-Stats-Store-Proxied": "true",
    });
    for (const header of ["Last-Modified", "ETag"]) {
      const value = appcastResponse.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }
    return new NextResponse(await appcastResponse.text(), {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Appcast proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
