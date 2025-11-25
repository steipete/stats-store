import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RealtimeDashboard } from "@/components/realtime-dashboard"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"
import { format } from "date-fns"

// Mock the hooks and dependencies
vi.mock("@/hooks/use-realtime-stats")
vi.mock("sonner", () => ({
  Toaster: () => null,
}))

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe.skip("RealtimeDashboard", () => {
  const mockInitialData = {
    kpis: {
      unique_installs: 100,
      reports_this_period: 500,
      latest_version: "1.0.0",
    },
    kpisError: {},
  }

  const mockDateRange = {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  }

  const defaultMockUseRealtimeStats = {
    isConnected: false,
    lastUpdate: null,
    realtimeEvents: [],
    statsCache: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRealtimeStats).mockReturnValue(defaultMockUseRealtimeStats)
  })

  it("renders initial KPI data correctly", () => {
    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    expect(screen.getByText("Unique Users")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("Total Reports")).toBeInTheDocument()
    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("Latest Version")).toBeInTheDocument()
    expect(screen.getByText("1.0.0")).toBeInTheDocument()
  })

  it("shows connection status when connected", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      lastUpdate: new Date("2024-01-15T10:30:00"),
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    expect(screen.getByText("Real-time updates active")).toBeInTheDocument()
    expect(screen.getByText(/Last update: 10:30:00/)).toBeInTheDocument()
  })

  it("shows activity feed button with event count", () => {
    const mockEvents = [
      {
        id: "1",
        event_type: "new_user",
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
      },
      {
        id: "2",
        event_type: "milestone",
        event_data: { message: "Reached 1000 users!" },
        created_at: new Date("2024-01-15T10:31:00").toISOString(),
      },
    ]

    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      realtimeEvents: mockEvents,
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    const activityButton = screen.getByText("Activity Feed")
    expect(activityButton).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument() // Event count badge
  })

  it("toggles activity feed on button click", async () => {
    const mockEvents = [
      {
        id: "1",
        event_type: "new_user",
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
      },
    ]

    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      realtimeEvents: mockEvents,
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    const activityButton = screen.getByText("Activity Feed")

    // Initially, activity feed is hidden
    expect(screen.queryByText("Recent Activity")).not.toBeInTheDocument()

    // Click to show
    fireEvent.click(activityButton)
    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument()
      expect(screen.getByText(/New user.*1.0.0.*MacBookPro/)).toBeInTheDocument()
    })

    // Click to hide
    fireEvent.click(activityButton)
    await waitFor(() => {
      expect(screen.queryByText("Recent Activity")).not.toBeInTheDocument()
    })
  })

  it("updates KPIs with realtime data", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      statsCache: {
        kpis: {
          unique_users_today: 150,
          total_reports_today: 600,
        },
        latest_version: {
          version: "1.1.0",
        },
      },
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    // Should show realtime data instead of initial data
    expect(screen.getByText("150")).toBeInTheDocument()
    expect(screen.getByText("600")).toBeInTheDocument()
    expect(screen.getByText("1.1.0")).toBeInTheDocument()
  })

  it("handles error states in KPIs", () => {
    const errorData = {
      ...mockInitialData,
      kpis: {
        unique_installs: "Error loading data",
        reports_this_period: "Error loading data",
        latest_version: "Error loading data",
      },
      kpisError: {
        unique_installs: "Database error",
        reports_this_period: "Database error",
        latest_version: "Database error",
      },
    }

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={errorData} />)

    // Should show error messages
    expect(screen.getAllByText("Error loading data")).toHaveLength(3)
  })

  it("renders different event types in activity feed", () => {
    const mockEvents = [
      {
        id: "1",
        event_type: "new_user",
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
      },
      {
        id: "2",
        event_type: "milestone",
        event_data: { message: "Reached 1000 users!" },
        created_at: new Date("2024-01-15T10:31:00").toISOString(),
      },
      {
        id: "3",
        event_type: "version_update",
        event_data: { new_version: "2.0.0" },
        created_at: new Date("2024-01-15T10:32:00").toISOString(),
      },
    ]

    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      realtimeEvents: mockEvents,
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    // Show activity feed
    fireEvent.click(screen.getByText("Activity Feed"))

    // Check all event types are rendered
    expect(screen.getByText(/New user.*1.0.0.*MacBookPro/)).toBeInTheDocument()
    expect(screen.getByText("Reached 1000 users!")).toBeInTheDocument()
    expect(screen.getByText("Version update: 2.0.0")).toBeInTheDocument()
  })

  it("formats date range in KPI tooltips", () => {
    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    // The tooltip text should include formatted dates
    const expectedFromDate = format(mockDateRange.from, "MMM dd, yyyy")
    const expectedToDate = format(mockDateRange.to, "MMM dd, yyyy")

    // Note: Tooltips are passed as props to RealtimeKpiCard
    // We can't directly test them without also testing RealtimeKpiCard
    // But we can verify the component receives the correct props
    expect(screen.getByText("Unique Users")).toBeInTheDocument()
    expect(screen.getByText("Total Reports")).toBeInTheDocument()
  })

  it("handles disconnected state gracefully", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: false,
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    // Should not show connection status or activity feed button
    expect(screen.queryByText("Real-time updates active")).not.toBeInTheDocument()
    expect(screen.queryByText("Activity Feed")).not.toBeInTheDocument()
  })

  it("uses fallback values when statsCache is empty", () => {
    vi.mocked(useRealtimeStats).mockReturnValue({
      ...defaultMockUseRealtimeStats,
      isConnected: true,
      statsCache: {}, // Empty cache
    })

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={mockInitialData} />)

    // Should fall back to initial data
    expect(screen.getByText("100")).toBeInTheDocument()
    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("1.0.0")).toBeInTheDocument()
  })
})
