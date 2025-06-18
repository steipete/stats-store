import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeStats } from '@/hooks/use-realtime-stats'
import { createBrowserClient } from '@supabase/ssr'
import { RealtimeChannel } from '@supabase/supabase-js'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}))

describe('useRealtimeStats', () => {
  let mockSupabaseClient: any
  let mockChannel: any
  let mockSubscribeCallback: ((status: string) => void) | null = null
  let mockEventHandlers: Record<string, any> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset handlers
    mockSubscribeCallback = null
    mockEventHandlers = {}

    // Create mock channel
    mockChannel = {
      on: vi.fn().mockImplementation((event, config, handler) => {
        const key = `${event}-${config.event || ''}-${config.table || ''}`
        mockEventHandlers[key] = handler
        return mockChannel
      }),
      subscribe: vi.fn().mockImplementation((callback) => {
        mockSubscribeCallback = callback
        // Simulate immediate subscription
        Promise.resolve().then(() => callback('SUBSCRIBED'))
        return mockChannel
      }),
      unsubscribe: vi.fn().mockResolvedValue({}),
    }

    // Create mock Supabase client with default mock
    const createMockQuery = () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [],
        error: null,
      }
      
      // Make order() return a thenable when it's the last in chain
      const originalOrder = query.order
      query.order = vi.fn().mockImplementation(() => {
        // Return self to allow chaining, but also make it thenable
        const result = Object.create(query)
        result.then = (resolve: any) => {
          resolve({ data: query.data, error: query.error })
        }
        return result
      })
      
      // Make eq() also chainable and preserve the query methods
      const originalEq = query.eq
      query.eq = vi.fn().mockImplementation(() => {
        return query
      })
      
      return query
    }
    
    mockSupabaseClient = {
      from: vi.fn().mockImplementation(() => createMockQuery()),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    }

    vi.mocked(createBrowserClient).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useRealtimeStats())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastUpdate).toBe(null)
    expect(result.current.realtimeEvents).toEqual([])
    expect(result.current.statsCache).toEqual({})
  })

  it('establishes realtime connection', async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('all-app-stats')
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('uses app-specific channel when appId provided', async () => {
    // Ensure the mock is properly set up
    expect(mockChannel.subscribe).toBeDefined()
    
    const { result } = renderHook(() => useRealtimeStats({ appId: 'test-app-123' }))

    // Wait for subscription - the callback should be called immediately
    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    // The subscribe callback should set isConnected to true
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    }, { timeout: 2000 })

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('app-stats-test-app-123')
  })

  it('fetches initial stats cache', async () => {
    const mockCacheData = [
      {
        stat_type: 'kpis',
        stat_data: {
          unique_users_today: 100,
          total_reports_today: 500,
          last_update: '2024-01-15T10:00:00Z',
        },
      },
      {
        stat_type: 'os_distribution',
        stat_data: [
          { os_version: '14.0', count: 50 },
          { os_version: '13.0', count: 30 },
        ],
      },
    ]

    // Override the mock for this test
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => 
        Promise.resolve({ data: mockCacheData, error: null })
      ),
      eq: vi.fn().mockReturnThis(),
    }))

    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.statsCache).toEqual({
        kpis: mockCacheData[0].stat_data,
        os_distribution: mockCacheData[1].stat_data,
      })
    }, { timeout: 3000 })
  })

  it('handles new user events', async () => {
    const onNewUser = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onNewUser }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const newUserEvent = {
      id: 1,
      app_id: 'test-app',
      event_type: 'new_user',
      event_data: {
        unique_users_today: 101,
        total_reports_today: 501,
        app_version: '1.0.0',
        model: 'MacBookPro',
      },
      created_at: '2024-01-15T10:30:00Z',
    }

    // Simulate receiving a new user event
    act(() => {
      const handler = mockEventHandlers['postgres_changes-INSERT-realtime_events']
      handler({ new: newUserEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(result.current.realtimeEvents[0]).toEqual(newUserEvent)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
      expect(onNewUser).toHaveBeenCalledWith(newUserEvent)
      expect(result.current.statsCache.kpis).toEqual({
        unique_users_today: 101,
        total_reports_today: 501,
        last_update: expect.any(String),
      })
    })
  })

  it('handles milestone events', async () => {
    const onMilestone = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onMilestone }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const milestoneEvent = {
      id: 2,
      app_id: 'test-app',
      event_type: 'milestone',
      event_data: { message: 'Reached 1000 users!' },
      created_at: '2024-01-15T11:00:00Z',
    }

    act(() => {
      const handler = mockEventHandlers['postgres_changes-INSERT-realtime_events']
      handler({ new: milestoneEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(onMilestone).toHaveBeenCalledWith(milestoneEvent)
    })
  })

  it('handles version update events', async () => {
    const onVersionUpdate = vi.fn()
    const { result } = renderHook(() => useRealtimeStats({ onVersionUpdate }))

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const versionEvent = {
      id: 3,
      app_id: 'test-app',
      event_type: 'version_update',
      event_data: { new_version: '2.0.0' },
      created_at: '2024-01-15T12:00:00Z',
    }

    act(() => {
      const handler = mockEventHandlers['postgres_changes-INSERT-realtime_events']
      handler({ new: versionEvent })
    })

    await waitFor(() => {
      expect(result.current.realtimeEvents).toHaveLength(1)
      expect(onVersionUpdate).toHaveBeenCalledWith(versionEvent)
      expect(result.current.statsCache.latest_version).toEqual({ version: '2.0.0' })
    })
  })

  it('handles report batch events by refetching cache', async () => {
    let fetchCount = 0
    
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        fetchCount++
        return Promise.resolve({ data: [], error: null })
      }),
      eq: vi.fn().mockReturnThis(),
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
      id: 4,
      app_id: 'test-app',
      event_type: 'report_batch',
      event_data: { count: 100 },
      created_at: '2024-01-15T13:00:00Z',
    }

    act(() => {
      const handler = mockEventHandlers['postgres_changes-INSERT-realtime_events']
      if (handler) {
        handler({ new: batchEvent })
      }
    })

    await waitFor(() => {
      // Should have refetched after batch event
      expect(fetchCount).toBe(2)
    }, { timeout: 3000 })
  })

  it('handles stats cache updates', async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    const cacheUpdate = {
      stat_type: 'cpu_distribution',
      stat_data: [
        { cpu_arch: 'arm64', count: 80 },
        { cpu_arch: 'x86_64', count: 20 },
      ],
    }

    act(() => {
      const handler = mockEventHandlers['postgres_changes-UPDATE-stats_cache']
      handler({ new: cacheUpdate })
    })

    await waitFor(() => {
      expect(result.current.statsCache.cpu_distribution).toEqual(cacheUpdate.stat_data)
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })
  })

  it('limits event history to 50 events', async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Add 60 events
    act(() => {
      const handler = mockEventHandlers['postgres_changes-INSERT-realtime_events']
      for (let i = 0; i < 60; i++) {
        handler({
          new: {
            id: i,
            app_id: 'test-app',
            event_type: 'new_user',
            event_data: {},
            created_at: new Date().toISOString(),
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

  it('handles connection closure', async () => {
    const { result } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate connection closed
    act(() => {
      if (mockSubscribeCallback) {
        mockSubscribeCallback('CLOSED')
      }
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useRealtimeStats())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    unmount()

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
    expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('provides refreshCache function', async () => {
    const mockNewData = [
      {
        stat_type: 'kpis',
        stat_data: { unique_users_today: 200, total_reports_today: 1000 },
      },
    ]

    let fetchCount = 0
    
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        fetchCount++
        return Promise.resolve({
          data: fetchCount === 1 ? [] : mockNewData,
          error: null,
        })
      }),
      eq: vi.fn().mockReturnThis(),
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

    await waitFor(() => {
      expect(result.current.statsCache.kpis).toEqual(mockNewData[0].stat_data)
    }, { timeout: 3000 })
  })

  it('filters by appId when not "all"', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: mockEq,
    })

    renderHook(() => useRealtimeStats({ appId: 'specific-app' }))

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('app_id', 'specific-app')
    })
  })

  it('does not filter when appId is "all"', async () => {
    const mockEq = vi.fn()
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: mockOrder,
      eq: mockEq,
    })

    renderHook(() => useRealtimeStats({ appId: 'all' }))

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalled()
      expect(mockEq).not.toHaveBeenCalled()
    })
  })
})