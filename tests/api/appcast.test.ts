import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/v1/appcast/[...path]/route"
import { NextRequest } from "next/server"

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "test-app-id",
                appcast_base_url: "https://github.com/owner/repo",
              },
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}))

describe("/api/v1/appcast/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should proxy appcast and capture telemetry", async () => {
    const mockAppcastXML = '<?xml version="1.0"?><rss><channel><item></item></channel></rss>'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockAppcastXML,
    } as Response)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app&bundleShortVersionString=1.0.0&osVersion=14.0&cputype=16777228",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const content = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/xml")
    expect(content).toBe(mockAppcastXML)
  })

  it("should convert GitHub URLs to raw.githubusercontent.com", async () => {
    const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => mockAppcastXML,
    } as Response)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast-prerelease.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["appcast-prerelease.xml"] }) })

    expect(global.fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/owner/repo/refs/heads/main/appcast-prerelease.xml",
      expect.any(Object)
    )
  })

  it("should handle direct domain URLs", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a direct domain URL
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: "test-app-id",
                  appcast_base_url: "https://example.com/updates",
                },
                error: null,
              })
            ),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })),
    } as any)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/sparkle.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["sparkle.xml"] }) })

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/updates/sparkle.xml", expect.any(Object))
  })

  it("should handle URLs that already include .xml filename", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a URL with .xml already included
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: "test-app-id",
                  appcast_base_url: "https://example.com/updates/appcast.xml",
                },
                error: null,
              })
            ),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })),
    } as any)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

    // Should not duplicate .xml
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/updates/appcast.xml", expect.any(Object))
  })

  it("should replace XML filename when requesting different appcast file", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a URL with .xml already included
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: "test-app-id",
                  appcast_base_url: "https://example.com/updates/appcast.xml",
                },
                error: null,
              })
            ),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })),
    } as any)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast-beta.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["appcast-beta.xml"] }) })

    // Should replace the filename
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/updates/appcast-beta.xml", expect.any(Object))
  })

  it("should reject requests without bundleIdentifier", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/appcast/appcast.xml", { method: "GET" })

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Missing bundleIdentifier parameter")
  })

  it("should return 404 for unknown apps", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Not found" },
              })
            ),
          })),
        })),
      })),
    } as any)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.unknown.app",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Application not found")
  })

  it("should handle appcast fetch failures", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.error).toBe("Failed to fetch appcast")
  })
})
