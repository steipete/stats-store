import { type NextRequest, NextResponse } from "next/server";
import { parseIngestPayload } from "@/lib/ingest";
import { dailyIpHash, getRequestIp } from "@/lib/telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const parsed = parseIngestPayload(await request.json());
    if (parsed.data === null) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { bundleIdentifier, ip, report } = parsed.data;
    const supabase = createSupabaseServerClient();
    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id")
      .eq("bundle_identifier", bundleIdentifier)
      .maybeSingle();

    if (appError) {
      console.error("App validation error:", appError.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    if (!app) {
      return NextResponse.json({ error: "Unknown bundle identifier" }, { status: 400 });
    }

    const { error: insertError } = await supabase.from("reports").insert({
      ...report,
      app_id: app.id,
      ip_hash: dailyIpHash(ip || getRequestIp(request)),
    });
    if (insertError) {
      console.error("Error inserting report:", insertError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ message: "Report received" }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    console.error("Ingest API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
