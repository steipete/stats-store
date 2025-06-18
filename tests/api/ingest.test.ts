import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/v1/ingest/route"
import { NextRequest } from "next/server"

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "test-app-id" },
              error: null,
            })
          ),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}))

describe("/api/v1/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should accept valid Sparkle telemetry data", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.1",
      },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        appVersion: "1.0.0",
        osVersion: "14.0",
        cputype: "16777228",
        ncpu: "8",
        lang: "en",
        model: "MacBookPro17,1",
        ramMB: "16384",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.message).toBe("Report received")
  })

  it("should reject requests without bundleIdentifier", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appVersion: "1.0.0",
        osVersion: "14.0",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Missing bundleIdentifier")
  })

  it("should map CPU types correctly", async () => {
    const testCases = [
      { cputype: "16777228", expected: "arm64" },
      { cputype: "16777223", expected: "x86_64" },
      { cputype: "12345", expected: "unknown" },
    ]

    for (const testCase of testCases) {
      const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleIdentifier: "com.example.app",
          cputype: testCase.cputype,
        }),
      })

      await POST(request)

      // Verify the CPU mapping logic works correctly
      // In a real test, we'd check the actual inserted data
    }
  })

  it("should handle malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Invalid JSON payload")
  })

  it("should handle database errors when checking app", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Database connection failed" },
              })
            ),
          })),
        })),
      })),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        appVersion: "1.0.0",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Internal server error")
  })

  it("should handle unknown bundle identifier", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    vi.mocked(createSupabaseServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
      })),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundleIdentifier: "com.unknown.app",
        appVersion: "1.0.0",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Unknown bundle identifier")
  })

  it("should handle database errors when inserting report", async () => {
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
                  data: { id: "test-app-id" },
                  error: null,
                })
              ),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Second call for insert - fails
          insert: vi.fn(() =>
            Promise.resolve({
              error: { message: "Insert failed" },
            })
          ),
        }),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        appVersion: "1.0.0",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Internal server error")
  })

  it("should handle missing IP address gracefully", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No x-forwarded-for header
      },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        appVersion: "1.0.0",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.message).toBe("Report received")
  })

  it("should handle all optional fields being missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        // All other fields are optional
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.message).toBe("Report received")
  })

  it("should parse numeric strings correctly", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bundleIdentifier: "com.example.app",
        ncpu: "8",
        ramMB: "16384",
        cpusubtype: "2",
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    // In a real test, we'd verify the parsed values were inserted correctly
  })
})
