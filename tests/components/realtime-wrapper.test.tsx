import { render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, it, vi } from "vitest"
import { RealtimeWrapper } from "../../components/realtime-wrapper"

vi.mock("../../components/realtime-dashboard", () => ({
  RealtimeDashboard: ({ onStatusChange }: { onStatusChange?: (s: unknown) => void }) => {
    useEffect(() => {
      onStatusChange?.({ isConnected: true, lastUpdate: new Date("2024-01-15T10:30:00"), realtimeEventsCount: 5 })
    }, [onStatusChange])
    return <div data-testid="realtime-dashboard" />
  },
}))

vi.mock("../../components/realtime-status-footer", () => ({
  RealtimeStatusFooter: ({
    isConnected,
    realtimeEventsCount,
  }: {
    isConnected: boolean
    realtimeEventsCount: number
  }) => <div data-testid="realtime-footer">{`${String(isConnected)}:${String(realtimeEventsCount)}`}</div>,
}))

describe("RealtimeWrapper", () => {
  it("wires dashboard status into footer", async () => {
    render(
      <RealtimeWrapper
        selectedAppId="test"
        dateRange={{ from: new Date("2024-01-01"), to: new Date("2024-01-31") }}
        initialData={{
          kpis: { latest_version: "1.0.0", reports_this_period: 1, unique_installs: 1 },
        }}
      >
        <div data-testid="child" />
      </RealtimeWrapper>
    )

    expect(screen.getByTestId("child")).toBeInTheDocument()
    expect(screen.getByTestId("realtime-dashboard")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("realtime-footer")).toHaveTextContent("true:5")
    })
  })
})
