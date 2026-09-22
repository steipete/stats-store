import { type NextRequest, NextResponse } from "next/server";
import { parseGitHubRepository } from "@/lib/github";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GitHubRelease {
  draft: boolean;
  assets: { name: string; browser_download_url: string }[];
}

export async function GET(_request: NextRequest, context: { params: Promise<{ app: string }> }) {
  try {
    const { app: identifier } = await context.params;
    const supabase = createSupabaseServerClient();
    // PostgREST also treats '*' as a LIKE wildcard; an escaped regex keeps names literal.
    const pattern = `^${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
    let app: { appcast_base_url: string | null } | undefined;
    for (const column of ["name", "bundle_identifier"]) {
      const { data, error } = await supabase
        .from("apps")
        .select("appcast_base_url")
        .filter(column, "imatch", pattern)
        .maybeSingle();
      if (error) throw new Error("App lookup failed", { cause: error });
      if (data) {
        app = data;
        break;
      }
    }
    if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

    const repository = app.appcast_base_url && parseGitHubRepository(app.appcast_base_url);
    if (!repository) {
      return NextResponse.json({ error: "Download not available for this app" }, { status: 404 });
    }
    const { owner, repo } = repository;
    const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const options = {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "stats-store-app-downloader",
      },
      next: { revalidate: 300 },
    };
    const response = await fetch(`${releasesUrl}/latest`, options);
    let latest: GitHubRelease | undefined;
    if (response.ok) {
      latest = await response.json();
    } else if (response.status === 404) {
      const fallback = await fetch(releasesUrl, options);
      if (!fallback.ok) throw new Error(`GitHub API responded with ${fallback.status}`);
      const releases: GitHubRelease[] = await fallback.json();
      latest = releases.find((release) => !release.draft);
    } else {
      throw new Error(`GitHub API responded with ${response.status}`);
    }
    if (!latest) return NextResponse.json({ error: "No releases found" }, { status: 404 });
    const dmg = latest.assets.find((asset) => asset.name.toLowerCase().endsWith(".dmg"));
    if (!dmg) {
      return NextResponse.json(
        { error: "No DMG file found in the latest release" },
        { status: 404 },
      );
    }
    return NextResponse.redirect(dmg.browser_download_url);
  } catch (error) {
    console.error("Error fetching app releases:", error);
    return NextResponse.json({ error: "Failed to fetch release information" }, { status: 500 });
  }
}
