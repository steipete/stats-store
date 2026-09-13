import { type NextRequest, NextResponse } from "next/server";
import { constructAppcastUrl, parseSparkleUserAgent } from "@/lib/appcast";
import { dailyIpHash, mapCpuTypeToArch } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SparkleQueryParams {
  // Sparkle standard parameters
  appName?: string;
  appVersion?: string;
  osVersion?: string;
  cpu64bit?: string;
  ncpu?: string;
  cpuFreqMHz?: string;
  cputype?: string;
  cpusubtype?: string;
  model?: string;
  ramMB?: string;
  lang?: string;
  // Legacy/custom parameters we might still support
  bundleIdentifier?: string;
  bundleShortVersionString?: string;
  bundleVersion?: string;
}

function getIpFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown_ip";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // Extract appcast filename from path (e.g., "appcast.xml" or "appcast-prerelease.xml")
    const resolvedParams = await params;
    const appcastPath = resolvedParams.path.join("/");

    // Parse User-Agent for app identification
    const userAgent = request.headers.get("user-agent");
    const parsedUA = parseSparkleUserAgent(userAgent);

    // Log request details
    console.log("Appcast request received:", {
      parsedUserAgent: parsedUA,
      path: appcastPath,
      queryParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      url: request.url,
      userAgent: userAgent,
    });

    // Parse query parameters sent by Sparkle
    const searchParams = request.nextUrl.searchParams;
    const sparkleParams: SparkleQueryParams = {
      // Standard Sparkle parameters
      appName: searchParams.get("appName") || undefined,
      appVersion: searchParams.get("appVersion") || undefined,
      osVersion: searchParams.get("osVersion") || undefined,
      cpu64bit: searchParams.get("cpu64bit") || undefined,
      ncpu: searchParams.get("ncpu") || undefined,
      cpuFreqMHz: searchParams.get("cpuFreqMHz") || undefined,
      cputype: searchParams.get("cputype") || undefined,
      cpusubtype: searchParams.get("cpusubtype") || undefined,
      model: searchParams.get("model") || undefined,
      ramMB: searchParams.get("ramMB") || undefined,
      lang: searchParams.get("lang") || undefined,
      // Legacy/custom parameters
      bundleIdentifier: searchParams.get("bundleIdentifier") || undefined,
      bundleShortVersionString: searchParams.get("bundleShortVersionString") || undefined,
      bundleVersion: searchParams.get("bundleVersion") || undefined,
    };

    // Check for app identifier - try query params first, then User-Agent
    // Priority: bundleIdentifier > appName (from params) > appName (from User-Agent)
    const appIdentifier =
      sparkleParams.bundleIdentifier || sparkleParams.appName || parsedUA?.appName;
    const appVersion =
      sparkleParams.appVersion ||
      sparkleParams.bundleShortVersionString ||
      sparkleParams.bundleVersion ||
      parsedUA?.appVersion;

    if (!appIdentifier) {
      console.error(
        "Missing app identifier. Received params:",
        sparkleParams,
        "User-Agent:",
        userAgent,
      );
      return NextResponse.json(
        { error: "Missing app identifier in parameters or User-Agent" },
        { status: 400 },
      );
    }

    console.log("App identification:", {
      identifier: appIdentifier,
      source: sparkleParams.bundleIdentifier
        ? "bundleIdentifier"
        : sparkleParams.appName
          ? "appName param"
          : "User-Agent",
      version: appVersion,
    });

    const supabase = createSupabaseServerClient();

    // Look up app and get appcast URL
    // First try to find by bundle identifier, then by app name
    let app: {
      id: string;
      appcast_base_url: string | null;
      bundle_identifier: string | null;
    } | null = null;
    let appError: { message: string } | null = null;

    // If we have a bundle identifier, try that first (more precise)
    if (sparkleParams.bundleIdentifier) {
      const result = await supabase
        .from("apps")
        .select("id, appcast_base_url, bundle_identifier")
        .eq("bundle_identifier", sparkleParams.bundleIdentifier)
        .single();
      app = result.data;
      appError = result.error;
    }

    // If not found and we have an appName from params, try matching by display_name or name
    if ((!app || appError) && sparkleParams.appName) {
      const result = await supabase
        .from("apps")
        .select("id, appcast_base_url, bundle_identifier")
        .or(`display_name.eq.${sparkleParams.appName},name.eq.${sparkleParams.appName}`)
        .single();
      app = result.data;
      appError = result.error;
    }

    // If still not found and we have an appName from User-Agent, try that
    if ((!app || appError) && parsedUA?.appName && parsedUA.appName !== sparkleParams.appName) {
      const result = await supabase
        .from("apps")
        .select("id, appcast_base_url, bundle_identifier")
        .or(`display_name.eq.${parsedUA.appName},name.eq.${parsedUA.appName}`)
        .single();
      app = result.data;
      appError = result.error;
    }

    if (appError || !app) {
      console.error("App not found for identifier:", appIdentifier);
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (!app.appcast_base_url) {
      return NextResponse.json(
        { error: "Appcast URL not configured for this application" },
        { status: 404 },
      );
    }

    // Store telemetry data
    const clientIp = getIpFromRequest(request);
    const ipHash = dailyIpHash(clientIp);

    const reportData = {
      app_id: app.id,
      app_id_source: sparkleParams.bundleIdentifier
        ? "bundleIdentifier"
        : sparkleParams.appName
          ? "appName"
          : "userAgent",
      app_version: appVersion || null,
      core_count: sparkleParams.ncpu ? Number.parseInt(sparkleParams.ncpu, 10) : null,
      cpu_64bit: sparkleParams.cpu64bit ? sparkleParams.cpu64bit === "1" : null,
      cpu_arch: mapCpuTypeToArch(sparkleParams.cputype),
      cpu_freq_mhz: sparkleParams.cpuFreqMHz ? Number.parseInt(sparkleParams.cpuFreqMHz, 10) : null,
      cpu_subtype: sparkleParams.cpusubtype || null,
      cpu_type_raw: sparkleParams.cputype || null,
      ip_hash: ipHash,
      language: sparkleParams.lang || null,
      model_identifier: sparkleParams.model || null,
      os_version: sparkleParams.osVersion || null,
      ram_mb: sparkleParams.ramMB ? Number.parseInt(sparkleParams.ramMB, 10) : null,
    };

    // Insert telemetry data (don't wait for it to complete)
    supabase
      .from("reports")
      .insert(reportData)
      .then(({ error }) => {
        if (error) {
          console.error("Error inserting telemetry:", error);
        }
      });

    // Construct the actual appcast URL
    const actualAppcastUrl = constructAppcastUrl(app.appcast_base_url, appcastPath);

    // Fetch the actual appcast
    const appcastResponse = await fetch(actualAppcastUrl, {
      headers: {
        "User-Agent": "StatsStore/1.0 (Sparkle Proxy)",
      },
    });

    if (!appcastResponse.ok) {
      console.error(`Failed to fetch appcast from ${actualAppcastUrl}: ${appcastResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch appcast" }, { status: 502 });
    }

    const appcastContent = await appcastResponse.text();

    // Prepare headers, passing through relevant ones from upstream
    const responseHeaders = new Headers({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": appcastResponse.headers.get("Content-Type") || "application/xml",
      "X-Stats-Store-Proxied": "true",
    });

    // Pass through additional headers from upstream
    const headersToPassThrough = ["Last-Modified", "ETag"];
    headersToPassThrough.forEach((header) => {
      const value = appcastResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Return the appcast with appropriate headers
    return new NextResponse(appcastContent, {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Appcast proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
