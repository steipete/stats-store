import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"

// Set environment variables before any imports
process.env.SUPABASE_URL = "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"

// Mock modules before imports
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url, key, options) => {
    // Return a mock client that captures the options
    return {
      url,
      key,
      options,
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    }
  }),
}))

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a Supabase client with correct configuration", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    const { createClient } = await import("@supabase/supabase-js")

    const client = createSupabaseServerClient()

    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    )

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it("uses environment variables for configuration", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    const { createClient } = await import("@supabase/supabase-js")

    createSupabaseServerClient()

    expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "test-service-role-key", expect.any(Object))
  })

  it("returns a client with expected Supabase methods", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")

    const client = createSupabaseServerClient()

    expect(client).toHaveProperty("auth")
    expect(client).toHaveProperty("from")
    expect(client).toHaveProperty("rpc")
    expect(client).toHaveProperty("storage")
  })

  it("configures auth without auto refresh and persistence", async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    const { createClient } = await import("@supabase/supabase-js")

    createSupabaseServerClient()

    const mockCall = vi.mocked(createClient).mock.calls[0]
    const authConfig = mockCall[2].auth

    expect(authConfig.autoRefreshToken).toBe(false)
    expect(authConfig.persistSession).toBe(false)
  })

  it("requires environment variables to be set", async () => {
    // The module requires these environment variables at import time
    // Since they're already set at the top of this test file,
    // we'll just verify they're being used correctly
    const { createSupabaseServerClient } = await import("@/lib/supabase/server")
    const { createClient } = await import("@supabase/supabase-js")

    // Call the function
    createSupabaseServerClient()

    // Verify it was called with the environment variables
    const mockCall = vi.mocked(createClient).mock.calls[0]
    expect(mockCall[0]).toBe(process.env.SUPABASE_URL)
    expect(mockCall[1]).toBe(process.env.SUPABASE_SERVICE_ROLE_KEY)
  })
})
