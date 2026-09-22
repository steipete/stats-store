import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/download/[app]/route";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  filter: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({ from: mocks.from }),
}));

function appAt(url: string) {
  const result = { data: { id: "app-id", appcast_base_url: url }, error: null };
  mocks.single.mockResolvedValue(result);
  mocks.maybeSingle.mockResolvedValue(result);
}
function download(app = "Fixture App") {
  return GET(new NextRequest("http://localhost/download/fixture"), {
    params: Promise.resolve({ app }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  const query = {
    select: vi.fn(() => query),
    ilike: vi.fn(() => query),
    eq: vi.fn(() => query),
    filter: mocks.filter,
    single: mocks.single,
    maybeSingle: mocks.maybeSingle,
  };
  mocks.filter.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  appAt("https://github.com/owner/repo");
  mocks.fetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        draft: false,
        prerelease: false,
        assets: [{ name: "Fixture.dmg", browser_download_url: "https://example.com/Fixture.dmg" }],
      }),
    ),
  );
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("download app and GitHub URL matching", () => {
  it.each([
    "https://notgithub.com/owner/repo",
    "https://example.com/github.com/owner/repo",
    "https://github.com.evil.test/owner/repo",
  ])("rejects non-GitHub origins before fetching %s", async (url) => {
    appAt(url);
    expect((await download()).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("normalizes a clone URL before querying releases", async () => {
    appAt("https://github.com/owner/repo.git?tab=readme");
    expect((await download()).headers.get("location")).toBe("https://example.com/Fixture.dmg");
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/releases/latest",
      expect.any(Object),
    );
  });

  it("finds the stable release beyond the first page of prereleases", async () => {
    const stable = {
      draft: false,
      prerelease: false,
      assets: [{ name: "Stable.dmg", browser_download_url: "https://example.com/Stable.dmg" }],
    };
    const beta = {
      draft: false,
      prerelease: true,
      assets: [{ name: "Beta.dmg", browser_download_url: "https://example.com/Beta.dmg" }],
    };
    mocks.fetch.mockImplementation(async (url: string) =>
      Response.json(url.endsWith("/latest") ? stable : Array.from({ length: 30 }, () => beta)),
    );

    expect((await download()).headers.get("location")).toBe("https://example.com/Stable.dmg");
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it("falls back to the first published prerelease only when no stable release exists", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    mocks.fetch.mockResolvedValueOnce(
      Response.json([
        { draft: true, assets: [] },
        {
          draft: false,
          prerelease: true,
          assets: [{ name: "Beta.dmg", browser_download_url: "https://example.com/Beta.dmg" }],
        },
      ]),
    );
    expect((await download()).headers.get("location")).toBe("https://example.com/Beta.dmg");
    expect(mocks.fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/owner/repo/releases",
      expect.any(Object),
    );
  });

  it.each([403, 429, 500])(
    "does not fall back when the stable lookup fails with %i",
    async (status) => {
      mocks.fetch.mockResolvedValueOnce(new Response(null, { status }));
      expect((await download()).status).toBe(500);
      expect(mocks.fetch).toHaveBeenCalledOnce();
    },
  );

  it("reports a failed prerelease lookup", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect((await download()).status).toBe(500);
  });

  it("returns 404 when neither stable nor prerelease releases exist", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    mocks.fetch.mockResolvedValueOnce(Response.json([]));
    expect((await download()).status).toBe(404);
  });

  it("does not substitute a beta when the stable release has no DMG", async () => {
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ draft: false, prerelease: false, assets: [] }),
    );
    const response = await download();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No DMG file found in the latest release" });
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it("matches names literally, including PostgREST LIKE aliases", async () => {
    expect((await download("Fixture*_%+.[beta]")).status).toBe(307);
    expect(mocks.filter).toHaveBeenCalledWith("name", "imatch", "^Fixture\\*_%\\+\\.\\[beta\\]$");
  });

  it("falls back to a case-insensitive literal bundle identifier", async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: null });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await download("com.Example.App")).status).toBe(307);
    expect(mocks.filter).toHaveBeenLastCalledWith(
      "bundle_identifier",
      "imatch",
      "^com\\.Example\\.App$",
    );
  });

  it("reports database failures instead of claiming the app is missing", async () => {
    const result = { data: null, error: { message: "Database unavailable" } };
    mocks.single.mockResolvedValue(result);
    mocks.maybeSingle.mockResolvedValue(result);
    expect((await download()).status).toBe(500);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
