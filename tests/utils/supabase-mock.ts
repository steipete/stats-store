import { vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

interface MockData {
  apps?: any[]
  reports?: any[]
  daily_counts?: any[]
  os_distribution?: any[]
  cpu_distribution?: any[]
  top_models?: any[]
  latest_version?: string
}

export function createMockSupabaseClient(mockData: MockData = {}) {
  const mockFrom = (table: string) => {
    const chainableMethods = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => {
        const data = mockData[table as keyof MockData] || []
        const count = Array.isArray(data) ? data.length : 0
        resolve({ data, error: null, count })
      }),
    }

    // Override the promise-like behavior
    return {
      ...chainableMethods,
      then: (resolve: any) => {
        const data = mockData[table as keyof MockData] || []
        const count = Array.isArray(data) ? data.length : 0
        resolve({ data, error: null, count })
        return Promise.resolve({ data, error: null, count })
      },
    }
  }

  const mockRpc = (functionName: string, params?: any) => ({
    then: (resolve: any) => {
      let data = null

      switch (functionName) {
        case "get_daily_report_counts":
          data = mockData.daily_counts || []
          break
        case "get_os_version_distribution":
          data = mockData.os_distribution || []
          break
        case "get_cpu_architecture_distribution":
          data = mockData.cpu_distribution || []
          break
        case "get_top_models":
          data = mockData.top_models || []
          break
        case "get_latest_app_version":
          data = mockData.latest_version || "N/A"
          break
        default:
          data = null
      }

      resolve({ data, error: null })
      return Promise.resolve({ data, error: null })
    },
  })

  const mockClient: Partial<SupabaseClient> = {
    from: vi.fn().mockImplementation(mockFrom),
    rpc: vi.fn().mockImplementation(mockRpc),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    } as any,
  }

  return mockClient as SupabaseClient
}

export function createMockSupabaseWithError(error: any) {
  const mockClient: Partial<SupabaseClient> = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: null, error })),
    }),
    rpc: vi.fn().mockReturnValue({
      then: vi.fn((resolve) => resolve({ data: null, error })),
    }),
  }

  return mockClient as SupabaseClient
}
