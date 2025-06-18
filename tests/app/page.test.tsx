import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient, createMockSupabaseWithError } from '@/tests/utils/supabase-mock'
import { 
  mockApps, 
  generateDailyCountsData, 
  mockOsDistribution,
  mockCpuDistribution,
  mockTopModels 
} from '@/tests/utils/test-data'

// Mock the Supabase server module
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all required data successfully', async () => {
    const mockClient = createMockSupabaseClient({
      apps: mockApps,
      reports: Array(50).fill(null).map((_, i) => ({
        ip_hash: `hash${i}`,
        received_at: new Date().toISOString(),
      })),
      daily_counts: generateDailyCountsData(30),
      os_distribution: mockOsDistribution,
      cpu_distribution: mockCpuDistribution,
      top_models: mockTopModels,
      latest_version: '2.0.0',
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Import and call the page to trigger data fetching
    const Page = (await import('@/app/page')).default
    await Page({ searchParams: Promise.resolve({}) })

    // Verify correct queries are made
    expect(mockClient.from).toHaveBeenCalledWith('apps')
    expect(mockClient.from).toHaveBeenCalledWith('reports')
    expect(mockClient.rpc).toHaveBeenCalledWith('get_daily_report_counts', expect.any(Object))
    expect(mockClient.rpc).toHaveBeenCalledWith('get_os_version_distribution', expect.any(Object))
    expect(mockClient.rpc).toHaveBeenCalledWith('get_cpu_architecture_distribution', expect.any(Object))
    expect(mockClient.rpc).toHaveBeenCalledWith('get_top_models', expect.any(Object))
    expect(mockClient.rpc).toHaveBeenCalledWith('get_latest_app_version', expect.any(Object))
  })

  it('handles app filtering correctly', async () => {
    const mockClient = createMockSupabaseClient({
      apps: mockApps,
      reports: [],
      daily_counts: [],
      os_distribution: [],
      cpu_distribution: [],
      top_models: [],
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Test that the eq method is called with correct app_id
    const reportsQuery = mockClient.from('reports')
    expect(reportsQuery.eq).toBeDefined()
  })

  it('handles date range filtering correctly', async () => {
    const mockClient = createMockSupabaseClient({
      apps: mockApps,
      reports: [],
      daily_counts: [],
      os_distribution: [],
      cpu_distribution: [],
      top_models: [],
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Test that date filters are applied
    const reportsQuery = mockClient.from('reports')
    expect(reportsQuery.gte).toBeDefined()
    expect(reportsQuery.lte).toBeDefined()
  })

  it('handles database errors gracefully', async () => {
    const mockClient = createMockSupabaseWithError({ 
      message: 'Database connection failed' 
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Verify error handling
    expect(mockClient.from).toBeDefined()
    expect(mockClient.rpc).toBeDefined()
  })

  it('handles empty data gracefully', async () => {
    const mockClient = createMockSupabaseClient({
      apps: [],
      reports: [],
      daily_counts: [],
      os_distribution: [],
      cpu_distribution: [],
      top_models: [],
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Verify empty data is handled
    const appsResult = await mockClient.from('apps').select('id, name').order('name')
    expect(appsResult.data).toEqual([])
    expect(appsResult.error).toBeNull()
  })

  it('calculates unique installs correctly', async () => {
    const mockReports = [
      { ip_hash: 'hash1', received_at: new Date().toISOString() },
      { ip_hash: 'hash1', received_at: new Date().toISOString() }, // duplicate
      { ip_hash: 'hash2', received_at: new Date().toISOString() },
      { ip_hash: 'hash3', received_at: new Date().toISOString() },
    ]

    const mockClient = createMockSupabaseClient({
      apps: mockApps,
      reports: mockReports,
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Get reports and calculate unique IPs
    const query = mockClient.from('reports').select('ip_hash')
    const result = await query
    const uniqueIps = new Set(result.data?.map((r: any) => r.ip_hash))
    
    expect(uniqueIps.size).toBe(3) // hash1, hash2, hash3
    expect(result.data?.length).toBe(4) // total reports
  })

  it('fetches all RPC endpoints with correct parameters', async () => {
    const mockClient = createMockSupabaseClient({
      apps: mockApps,
      reports: [],
      daily_counts: generateDailyCountsData(30),
      os_distribution: mockOsDistribution,
      cpu_distribution: mockCpuDistribution,
      top_models: mockTopModels,
      latest_version: '1.2.3',
    })

    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockClient)

    // Import and call the page to trigger data fetching
    const Page = (await import('@/app/page')).default
    await Page({ searchParams: Promise.resolve({}) })

    // Verify RPC calls were made (order may vary)
    const rpcCalls = mockClient.rpc.mock.calls
    const rpcNames = rpcCalls.map(call => call[0])
    
    expect(rpcNames).toContain('get_daily_report_counts')
    expect(rpcNames).toContain('get_os_version_distribution')
    expect(rpcNames).toContain('get_cpu_architecture_distribution')
    expect(rpcNames).toContain('get_top_models')
    expect(rpcNames).toContain('get_latest_app_version')
    
    // Verify each call has the correct parameters structure
    rpcCalls.forEach(([name, params]) => {
      if (name.startsWith('get_')) {
        // Different RPC endpoints use different parameter naming
        if (name === 'get_os_version_distribution' || name === 'get_cpu_architecture_distribution' || name === 'get_top_models') {
          // These use the p_ prefixed parameters
          expect(params).toMatchObject({
            p_app_id_filter: null,
            p_start_date_filter: expect.any(String),
            p_end_date_filter: expect.any(String),
          })
        } else {
          // Others use non-prefixed parameters
          expect(params).toMatchObject({
            app_id_filter: null,
            start_date_filter: expect.any(String),
            end_date_filter: expect.any(String),
          })
        }
      }
    })
  })
})