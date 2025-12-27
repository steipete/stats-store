import { render, screen } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import { RealtimeDashboardWrapper } from "../../components/realtime-dashboard-wrapper"

const toast = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
}))

let capturedOptions:
  | undefined
  | {
      onMilestone?: (event: { event_data: { message: string } }) => void
      onNewUser?: (event: { event_data: { app_version: string } }) => void
      onVersionUpdate?: (event: { event_data: { new_version: string } }) => void
    }

vi.mock("@/hooks/use-realtime-stats", () => ({
  useRealtimeStats: (options: unknown) => {
    capturedOptions = options as typeof capturedOptions
    return {
      isConnected: true,
      lastUpdate: new Date("2024-01-15T10:30:00"),
      realtimeEvents: [
        {
          created_at: new Date("2024-01-15T10:30:00").toISOString(),
          event_data: { app_version: "1.0.0", model: "MacBookPro" },
          event_type: "new_user",
          id: 1,
        },
      ],
    }
  },
}))

vi.mock("sonner", () => ({ toast }))

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: ComponentProps<"div"> & { children?: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

describe("RealtimeDashboardWrapper", () => {
  it("renders connected indicator", () => {
    render(
      <RealtimeDashboardWrapper selectedAppId="test">
        <div>Child</div>
      </RealtimeDashboardWrapper>
    )

    expect(screen.getByText("Real-time updates active")).toBeInTheDocument()
    expect(screen.getByText("Child")).toBeInTheDocument()
    expect(screen.getByText("Recent Activity")).toBeInTheDocument()
  })

  it("shows latest event toast + indicator for new users", () => {
    vi.useFakeTimers()

    render(
      <RealtimeDashboardWrapper selectedAppId="test">
        <div>Child</div>
      </RealtimeDashboardWrapper>
    )

    act(() => {
      capturedOptions?.onNewUser?.({ event_data: { app_version: "2.0.0" } })
    })

    expect(toast.success).toHaveBeenCalled()
    expect(screen.getByText("New user joined")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText("New user joined")).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
