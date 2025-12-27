import { createBrowserClient } from "@supabase/ssr"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"

// Mock Supabase
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}))

describe("useRealtimeStats", () => {
  let mockSupabaseClient: Record<string, unknown>
  let mockChannel: Record<string, unknown>
  let mockSubscribeCallback: ((status: string) => void) | null
  let mockEventHandlers: Record<string, (payload: { new: unknown }) => void> = {}

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset handlers
    mockSubscribeCallback = undefined
    mockEventHandlers = {}

    // Create mock channel
    mockChannel = {
      on: vi.fn().mockImplementation((event, config, handler) => {
        const key = `${event}-${config.event || ""}-${config.table || ""}`
        mockEventHandlers[key] = handler
        return mockChannel
      }),
      subscribe: vi.fn().mockImplementation((callback) => {
        mockSubscribeCallback = callback
        // Simulate immediate subscription
        void Promise.resolve().then(() => callback("SUBSCRIBED"))
        return mockChannel
      }),
      unsubscribe: vi.fn().mockResolvedValue({}),
    }

    // Create mock Supabase client with default mock
    const createMockQuery = () => {
      const query = Promise.resolve({ data: [], error: undefined }) as unknown as Record<string, unknown>
      const chainableMethods = {
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
      }
      return Object.assign(query, chainableMethods)
    }

    mockSupabaseClient = {
      channel: vi.fn().mockReturnValue(mockChannel),
      from: vi.fn().mockImplementation(createMockQuery),
      removeChannel: vi.fn(),
    } as unknown as Record<string, unknown>

    vi.mocked(createBrowserClient).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("initializes with default state", () => {
    const { result } = renderHook(() => useRealtimeStats())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastUpdate).toBe(undefined)
    expect(result.current.realtimeEvents).toEqual([])
    expect(result.current.statsCache).toEqual({})
  })

  it("establishes realtime connection", async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith("all-app-stats")
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it("uses app-specific channel when appId provided", async () => {
    // Ensure the mock is properly set up
    expect(mockChannel.subscribe).toBeDefined()

    const { result } = renderHook(() => useRealtimeStats({ appId: "test-app-123" }))

    // Wait for subscription - the callback should be called immediately
    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    // The subscribe callback should set isConnected to true
    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith("app-stats-test-app-123")
  })

  it("fetches initial stats cache", async () => {
    const mockCacheData = [
      {
        stat_data: {
          unique_users_today: 100,
          total_reports_today: 500,
          last_update: "2024-01-15T10:00:00Z",
        },
        stat_type: "kpis",
      },
      {
        stat_data: [
          { os_version: "14.0", count: 50 },
          { os_version: "13.0", count: 30 },
        ],
        stat_type: "os_distribution",
      },
    ]

    // Override the mock for this test
    mockSupabaseClient.from.mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: mockCacheData, error: null })),
      select: vi.fn().mockReturnThis(),
    }))

    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(
      () => {
        expect(result.current.statsCache).toEqual({
          kpis: mockCacheData[0].stat_data,
          os_distribution: mockCacheData[1].stat_data,
        })
      },
      { timeout: 3000 }
    )
  })

  it("handles new user events", async () => {
    const onNewUser = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onNewUser }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const newUserEvent = {
      app_id: "test-app",
      created_at: "2024-01-15T10:30:00Z",
      event_data: {
        unique_users_today: 101,
        total_reports_today: 501,
        app_version: "1.0.0",
        model: "MacBookPro",
      },
      event_type: "new_user",
      id: 1,
    }

    // Simulate receiving a new user event
    act(() => {
      const handler = mockEventHandlers["postgres_changes-INSERT-realtime_events"]
      handler({ new: newUserEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(result.current.realtimeEvents[0]).toEqual(newUserEvent)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
      expect(onNewUser).toHaveBeenCalledWith(newUserEvent)
      expect(result.current.statsCache.kpis).toEqual({
        last_update: expect.any(String),
        total_reports_today: 501,
        unique_users_today: 101,
      })
    })
  })

  it("handles milestone events", async () => {
    const onMilestone = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onMilestone }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const milestoneEvent = {
      app_id: "test-app",
      created_at: "2024-01-15T11:00:00Z",
      event_data: { message: "Reached 1000 users!" },
      event_type: "milestone",
      id: 2,
    }

    act(() => {
      const handler = mockEventHandlers["postgres_changes-INSERT-realtime_events"]
      handler({ new: milestoneEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(onMilestone).toHaveBeenCalledWith(milestoneEvent)
    })
  })

  it("handles version update events", async () => {
    const onVersionUpdate = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onVersionUpdate }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const versionEvent = {
      app_id: "test-app",
      created_at: "2024-01-15T12:00:00Z",
      event_data: { new_version: "2.0.0" },
      event_type: "version_update",
      id: 3,
    }

    act(() => {
      const handler = mockEventHandlers["postgres_changes-INSERT-realtime_events"]
      handler({ new: versionEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(onVersionUpdate).toHaveBeenCalledWith(versionEvent)
      expect(result.current.statsCache.latest_version).toEqual({ version: "2.0.0" })
    })
  })

  it("handles report batch events by refetching cache", async () => {
    let fetchCount = 0

    mockSupabaseClient.from.mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        fetchCount++
        return Promise.resolve({ data: [], error: null })
      }),
      select: vi.fn().mockReturnThis(),
    }))

    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Initial fetch should have happened
    await waitFor(() => {
      expect(fetchCount).toBe(1)
    })

    const batchEvent = {
      app_id: "test-app",
      created_at: "2024-01-15T13:00:00Z",
      event_data: { count: 100 },
      event_type: "report_batch",
      id: 4,
    }

    act(() => {
      const handler = mockEventHandlers["postgres_changes-INSERT-realtime_events"]
      if (handler) {
        handler({ new: batchEvent })
      }
    })

    await waitFor(
      () => {
        // Should have refetched after batch event
        expect(fetchCount).toBe(2)
      },
      { timeout: 3000 }
    )
  })

  it("handles stats cache updates", async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const cacheUpdate = {
      stat_data: [
        { cpu_arch: "arm64", count: 80 },
        { cpu_arch: "x86_64", count: 20 },
      ],
      stat_type: "cpu_distribution",
    }

    act(() => {
      const handler = mockEventHandlers["postgres_changes-UPDATE-stats_cache"]
      handler({ new: cacheUpdate })
    })

    await waitFor(() => {
      expect(result.current.statsCache.cpu_distribution).toEqual(cacheUpdate.stat_data)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })
  })

  it("limits event history to 50 events", async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Add 60 events
    act(() => {
      const handler = mockEventHandlers["postgres_changes-INSERT-realtime_events"]
      for (let i = 0; i < 60; i++) {
        handler({
          new: {
            app_id: "test-app",
            created_at: new Date().toISOString(),
            event_data: {},
            event_type: "new_user",
            id: i,
          },
        })
      }
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(50)
      // Most recent event should be first
      expect(result.current.realtimeEvents[0].id).toBe(59)
    })
  })

  it("handles connection closure", async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate connection closed
    act(() => {
      if (mockSubscribeCallback) {
        mockSubscribeCallback("CLOSED")
      }
    })

    expect(result.current.isConnected).toBe(false)
  })

  it("cleans up on unmount", async () => {
    const { result, unmount } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    unmount()

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
    expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it("provides refreshCache function", async () => {
    const mockNewData = [
      {
        stat_data: { unique_users_today: 200, total_reports_today: 1000 },
        stat_type: "kpis",
      },
    ]

    let fetchCount = 0

    mockSupabaseClient.from.mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        fetchCount++
        return Promise.resolve({
          data: fetchCount === 1 ? [] : mockNewData,
          error: null,
        })
      }),
      select: vi.fn().mockReturnThis(),
    }))

    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Initial cache should be empty after first fetch
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(0)
    })

    // Manually refresh cache
    await act(async () => {
      await result.current.refreshCache()
    })

    await waitFor(
      () => {
        expect(result.current.statsCache.kpis).toEqual(mockNewData[0].stat_data)
      },
      { timeout: 3000 }
    )
  })

  it('filters by appId when not "all"', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: undefined })
    mockSupabaseClient.from.mockReturnValue({
      eq: mockEq,
      order: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
    })

    renderHook(() => useRealtimeStats({ appId: "specific-app" }))

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith("app_id", "specific-app")
    })
  })

  it('does not filter when appId is "all"', async () => {
    const mockEq = vi.fn()
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: undefined })
    mockSupabaseClient.from.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      select: vi.fn().mockReturnThis(),
    })

    renderHook(() => useRealtimeStats({ appId: "all" }))

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalled()
      expect(mockEq).not.toHaveBeenCalled()
    })
  })
})
