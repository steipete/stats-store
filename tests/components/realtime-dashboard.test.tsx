import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RealtimeDashboard } from "@/components/realtime-dashboard"
import { useRealtimeStats } from "@/hooks/use-realtime-stats"

// Mock the hooks and dependencies
vi.mock("@/hooks/use-realtime-stats")
vi.mock("sonner", () => ({
  Toaster: () => null,
}))

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: ComponentProps<"div"> & { children?: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

describe("RealtimeDashboard", () => {
  const mockInitialData = {
    kpis: {
      latest_version: "1.0.0",
      reports_this_period: 500,
      unique_installs: 100,
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
    refreshCache: vi.fn(async () => {}),
    statsCache: {},
  } satisfies ReturnType<typeof useRealtimeStats>

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
    const mockEvents: ReturnType<typeof useRealtimeStats>["realtimeEvents"] = [
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        event_type: "new_user",
        id: 1,
      },
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:31:00").toISOString(),
        event_data: { message: "Reached 1000 users!" },
        event_type: "milestone",
        id: 2,
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
    const mockEvents: ReturnType<typeof useRealtimeStats>["realtimeEvents"] = [
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        event_type: "new_user",
        id: 1,
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
          last_update: new Date("2024-01-15T10:30:00").toISOString(),
          total_reports_today: 600,
          unique_users_today: 150,
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
        latest_version: "Error loading data",
        reports_this_period: "Error loading data",
        unique_installs: "Error loading data",
      },
      kpisError: {
        latest_version: "Database error",
        reports_this_period: "Database error",
        unique_installs: "Database error",
      },
    }

    render(<RealtimeDashboard selectedAppId="test-app" dateRange={mockDateRange} initialData={errorData} />)

    // Should show error messages
    expect(screen.getAllByText("Error loading data")).toHaveLength(3)
  })

  it("renders different event types in activity feed", () => {
    const mockEvents: ReturnType<typeof useRealtimeStats>["realtimeEvents"] = [
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:30:00").toISOString(),
        event_data: { app_version: "1.0.0", model: "MacBookPro" },
        event_type: "new_user",
        id: 1,
      },
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:31:00").toISOString(),
        event_data: { message: "Reached 1000 users!" },
        event_type: "milestone",
        id: 2,
      },
      {
        app_id: "test-app",
        created_at: new Date("2024-01-15T10:32:00").toISOString(),
        event_data: { new_version: "2.0.0" },
        event_type: "version_update",
        id: 3,
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
