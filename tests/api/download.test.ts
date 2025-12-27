import { describe, expect, it, vi } from "vitest"
import { GET } from "../../app/download/[app]/route"

const createSupabaseServerClient = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => createSupabaseServerClient(),
}))

function makeSupabaseMock(singleResults: Array<{ data: unknown; error: unknown }>) {
  const single = vi.fn(async () => singleResults.shift() ?? { data: null, error: null })
  const builder = {
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single,
  }
  return {
    from: vi.fn(() => builder),
  }
}

describe("app/download/[app] route", () => {
  it("returns 404 when app not found", async () => {
    createSupabaseServerClient.mockReturnValue(
      makeSupabaseMock([
        { data: null, error: null },
        { data: null, error: null },
      ])
    )

    const res = await GET(new Request("http://localhost/download/test"), { params: Promise.resolve({ app: "test" }) })
    expect(res.status).toBe(404)
  })

  it("returns 404 when app isn't hosted on GitHub", async () => {
    createSupabaseServerClient.mockReturnValue(
      makeSupabaseMock([
        {
          data: { appcast_base_url: "https://example.com/appcast.xml", bundle_identifier: "x", id: "1", name: "App" },
          error: null,
        },
      ])
    )

    const res = await GET(new Request("http://localhost/download/app"), { params: Promise.resolve({ app: "app" }) })
    expect(res.status).toBe(404)
  })

  it("redirects to latest DMG asset", async () => {
    createSupabaseServerClient.mockReturnValue(
      makeSupabaseMock([
        {
          data: { appcast_base_url: "https://github.com/owner/repo", bundle_identifier: "x", id: "1", name: "App" },
          error: null,
        },
      ])
    )

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          assets: [{ browser_download_url: "https://example.com/app.dmg", name: "app.dmg" }],
          draft: false,
          prerelease: false,
          tag_name: "v1.0.0",
        },
      ],
    }))
    vi.stubGlobal("fetch", fetchMock)

    const res = await GET(new Request("http://localhost/download/app"), { params: Promise.resolve({ app: "app" }) })
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get("location")).toBe("https://example.com/app.dmg")
  })
})
