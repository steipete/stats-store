import type { SupabaseClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/v1/appcast/[...path]/route"

// Mock fetch
global.fetch = vi.fn()

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
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
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
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
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
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
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a direct domain URL
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
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
      })),
    } as unknown as SupabaseClient)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/sparkle.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["sparkle.xml"] }) })

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/updates/sparkle.xml", expect.any(Object))
  })

  it("should handle URLs that already include .xml filename", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a URL with .xml already included
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
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
      })),
    } as unknown as SupabaseClient)

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
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    // Mock Supabase to return a URL with .xml already included
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
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
      })),
    } as unknown as SupabaseClient)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast-beta.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["appcast-beta.xml"] }) })

    // Should replace the filename
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/updates/appcast-beta.xml", expect.any(Object))
  })

  it("should parse app identification from User-Agent when no params provided", async () => {
    const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => mockAppcastXML,
    } as Response)

    // Mock Supabase to find app by name
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: "Not found" } })),
          })),
          or: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: "test-app-id",
                  appcast_base_url: "https://example.com/appcast.xml",
                  bundle_identifier: "com.example.app",
                },
                error: null,
              })
            ),
          })),
        })),
      })),
    } as unknown as SupabaseClient)

    const request = new NextRequest("http://localhost:3000/api/v1/appcast/appcast.xml", {
      headers: {
        "User-Agent": "MyApp/2.1.3 Sparkle/2.0.0",
      },
      method: "GET",
    })

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(mockAppcastXML)
  })

  it("should reject requests without any app identification", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/appcast/appcast.xml", {
      method: "GET",
      // No User-Agent header
    })

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Missing app identifier in parameters or User-Agent")
  })

  it("should return 404 for unknown apps", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: undefined,
                error: { message: "Not found" },
              })
            ),
          })),
        })),
      })),
    } as unknown as SupabaseClient)

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

  it("should handle network errors during appcast fetch", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"))

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Internal server error")
  })

  it("should handle apps with no appcast URL configured", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: {
                  appcast_base_url: null,
                  id: "test-app-id", // No URL configured
                },
                error: undefined,
              })
            ),
          })),
        })),
      })),
    } as unknown as SupabaseClient)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error).toBe("Appcast URL not configured for this application")
  })

  it("should handle database errors when recording telemetry", async () => {
    const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => mockAppcastXML,
    } as Response)

    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi
        .fn()
        .mockReturnValueOnce({
          // First call for app check - succeeds
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    appcast_base_url: "https://example.com/appcast.xml",
                    id: "test-app-id",
                  },
                  error: undefined,
                })
              ),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Second call for telemetry insert - fails
          insert: vi.fn(() =>
            Promise.resolve({
              error: { message: "Insert failed" },
            })
          ),
        }),
    } as unknown as SupabaseClient)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app&bundleShortVersionString=1.0.0",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

    // Should still return the appcast even if telemetry fails
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(mockAppcastXML)
  })

  it("should handle multiple path segments correctly", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      headers: new Headers({
        "Content-Type": "application/xml",
      }),
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/updates/stable/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    await GET(request, { params: Promise.resolve({ path: ["updates", "stable", "appcast.xml"] }) })

    expect(global.fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/owner/repo/refs/heads/main/updates/stable/appcast.xml",
      expect.any(Object)
    )
  })

  it("should pass through HTTP headers from upstream", async () => {
    const mockHeaders = new Headers({
      "Content-Type": "application/xml",
      ETag: '"123456"',
      "Last-Modified": "Wed, 01 Jan 2024 00:00:00 GMT",
    })

    vi.mocked(global.fetch).mockResolvedValueOnce({
      headers: mockHeaders,
      ok: true,
      text: async () => "<xml></xml>",
    } as Response)

    const request = new NextRequest(
      "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.example.app",
      { method: "GET" }
    )

    const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

    expect(response.headers.get("Content-Type")).toBe("application/xml")
    expect(response.headers.get("Last-Modified")).toBe("Wed, 01 Jan 2024 00:00:00 GMT")
    expect(response.headers.get("ETag")).toBe('"123456"')
  })

  describe("User-Agent parsing", () => {
    it("should handle various User-Agent formats", async () => {
      const testCases = [
        {
          expectedApp: "MyApp",
          expectedVersion: "2.1.3",
          userAgent: "MyApp/2.1.3 Sparkle/2.0.0",
        },
        {
          expectedApp: "Another App",
          expectedVersion: "1.0.0-beta",
          userAgent: "Another App/1.0.0-beta Sparkle/2.1.0",
        },
        {
          expectedApp: "SimpleApp",
          expectedVersion: "1.0",
          userAgent: "SimpleApp/1.0",
        },
      ]

      for (const testCase of testCases) {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          headers: new Headers({ "Content-Type": "application/xml" }),
          ok: true,
          text: async () => "<xml></xml>",
        } as Response)

        const { createSupabaseServerClient } = await import("@/lib/supabase/server")
        vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
          from: vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ error: null })),
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: "test-app-id",
                      appcast_base_url: "https://example.com/appcast.xml",
                    },
                    error: null,
                  })
                ),
              })),
            })),
          })),
        } as unknown as SupabaseClient)

        const request = new NextRequest("http://localhost:3000/api/v1/appcast/appcast.xml", {
          headers: {
            "User-Agent": testCase.userAgent,
          },
          method: "GET",
        })

        const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

        expect(response.status).toBe(200)
      }
    })
  })

  describe("Sparkle parameters", () => {
    it("should handle standard Sparkle parameters with appName", async () => {
      const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        headers: new Headers({ "Content-Type": "application/xml" }),
        ok: true,
        text: async () => mockAppcastXML,
      } as Response)

      // Mock Supabase with proper or() support
      const { createSupabaseServerClient } = await import("@/lib/supabase/server")
      vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: "Not found" } })),
            })),
            or: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: "test-app-id",
                    appcast_base_url: "https://example.com/appcast.xml",
                    bundle_identifier: "com.example.myapp",
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      } as unknown as SupabaseClient)

      const request = new NextRequest(
        "http://localhost:3000/api/v1/appcast/appcast.xml?" +
          "appName=MyApp&appVersion=123&osVersion=14.0&cpu64bit=1&" +
          "cputype=16777228&cpusubtype=2&model=MacBookPro17,1&ncpu=8&" +
          "cpuFreqMHz=2400&lang=en&ramMB=16384",
        {
          headers: { "User-Agent": "MyApp/2.1.3 Sparkle/2.0.0" },
          method: "GET",
        }
      )

      const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

      expect(response.status).toBe(200)
    })

    it("should prioritize bundleIdentifier over appName over User-Agent", async () => {
      const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        headers: new Headers({ "Content-Type": "application/xml" }),
        ok: true,
        text: async () => mockAppcastXML,
      } as Response)

      const { createSupabaseServerClient } = await import("@/lib/supabase/server")
      const fromMock = vi.fn()

      // Mock will be called with bundleIdentifier first (priority)
      fromMock
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    appcast_base_url: "https://example.com/appcast.xml",
                    bundle_identifier: "com.priority.app",
                    id: "test-app-id",
                  },
                  error: undefined,
                })
              ),
            })),
          })),
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => Promise.resolve({ error: undefined })),
        })

      vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
        from: fromMock,
      } as unknown as SupabaseClient)

      const request = new NextRequest(
        "http://localhost:3000/api/v1/appcast/appcast.xml?bundleIdentifier=com.priority.app&appName=DifferentName",
        {
          headers: { "User-Agent": "YetAnotherName/1.0 Sparkle/2.0.0" },
          method: "GET",
        }
      )

      const response = await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

      expect(response.status).toBe(200)
      // Verify it used bundleIdentifier (first call to from())
      expect(fromMock).toHaveBeenCalledTimes(2)
    })
  })

  describe("Telemetry recording", () => {
    it("should record telemetry with new Sparkle fields", async () => {
      const mockAppcastXML = '<?xml version="1.0"?><rss></rss>'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        headers: new Headers({ "Content-Type": "application/xml" }),
        ok: true,
        text: async () => mockAppcastXML,
      } as Response)

      let capturedInsertData: unknown

      const { createSupabaseServerClient } = await import("@/lib/supabase/server")
      vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValueOnce({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      appcast_base_url: "https://example.com/appcast.xml",
                      id: "test-app-id",
                    },
                    error: undefined,
                  })
                ),
              })),
            })),
          })
          .mockReturnValueOnce({
            insert: vi.fn((data: unknown) => {
              capturedInsertData = data
              return Promise.resolve({ error: undefined })
            }),
          }),
      } as unknown as SupabaseClient)

      const request = new NextRequest(
        "http://localhost:3000/api/v1/appcast/appcast.xml?" +
          "bundleIdentifier=com.example.app&appVersion=123&osVersion=14.0&" +
          "cpu64bit=1&cpuFreqMHz=2400&cputype=16777228&cpusubtype=2",
        { method: "GET" }
      )

      await GET(request, { params: Promise.resolve({ path: ["appcast.xml"] }) })

      // Wait for async telemetry insert
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(capturedInsertData).toMatchObject({
        app_id_source: "bundleIdentifier",
        app_version: "123",
        cpu_64bit: true,
        cpu_freq_mhz: 2400,
        cpu_subtype: "2",
        cpu_type_raw: "16777228",
        os_version: "14.0",
      })
    })
  })
})
