import type { SupabaseClient } from "@supabase/supabase-js"
import { vi } from "vitest"

interface MockData {
  apps?: unknown[]
  reports?: unknown[]
  daily_counts?: unknown[]
  os_distribution?: unknown[]
  cpu_distribution?: unknown[]
  top_models?: unknown[]
  latest_version?: string
}

export function createMockSupabaseClient(mockData: MockData = {}) {
  const mockFrom = (table: string) => {
    const buildResult = () => {
      const data = mockData[table as keyof MockData] ?? []
      const count = Array.isArray(data) ? data.length : 0
      return { count, data, error: null }
    }

    const query = Promise.resolve(buildResult()) as unknown as Record<string, unknown>

    const chainableMethods = {
      delete: vi.fn(() => query),
      eq: vi.fn(() => query),
      gt: vi.fn(() => query),
      gte: vi.fn(() => query),
      ilike: vi.fn(() => query),
      in: vi.fn(() => query),
      insert: vi.fn(() => query),
      is: vi.fn(() => query),
      like: vi.fn(() => query),
      limit: vi.fn(() => query),
      lt: vi.fn(() => query),
      lte: vi.fn(() => query),
      maybeSingle: vi.fn(() => query),
      neq: vi.fn(() => query),
      order: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn(() => query),
      update: vi.fn(() => query),
    }

    return Object.assign(query, chainableMethods)
  }

  const mockRpc = (functionName: string, _params?: unknown) => {
    let data: unknown

    switch (functionName) {
      case "get_daily_report_counts": {
        data = mockData.daily_counts ?? []
        break
      }
      case "get_os_version_distribution": {
        data = mockData.os_distribution ?? []
        break
      }
      case "get_cpu_architecture_distribution": {
        data = mockData.cpu_distribution ?? []
        break
      }
      case "get_top_models": {
        data = mockData.top_models ?? []
        break
      }
      case "get_latest_app_version": {
        data = mockData.latest_version ?? "N/A"
        break
      }
      default: {
        data = null
      }
    }

    return Promise.resolve({ data, error: undefined }) as unknown as Record<string, unknown>
  }

  const mockClient: Partial<SupabaseClient> = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    } as unknown as SupabaseClient["auth"],
    from: vi.fn().mockImplementation(mockFrom),
    rpc: vi.fn().mockImplementation(mockRpc),
  }

  return mockClient as SupabaseClient
}

export function createMockSupabaseWithError(error: unknown) {
  const buildErrorQuery = () => {
    const query = Promise.resolve({ data: undefined, error }) as unknown as Record<string, unknown>
    const chainableMethods = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      select: vi.fn(() => query),
    }
    return Object.assign(query, chainableMethods)
  }

  const mockClient: Partial<SupabaseClient> = {
    from: vi.fn().mockImplementation(buildErrorQuery),
    rpc: vi
      .fn()
      .mockImplementation(() => Promise.resolve({ data: undefined, error }) as unknown as Record<string, unknown>),
  }

  return mockClient as SupabaseClient
}
