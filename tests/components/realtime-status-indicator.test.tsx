import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { RealtimeStatusIndicator } from "../../components/realtime-status-indicator"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: ComponentProps<"div"> & { children?: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

describe("RealtimeStatusIndicator", () => {
  it("renders nothing when disconnected", () => {
    const { container } = render(
      <RealtimeStatusIndicator
        isConnected={false}
        showActivityFeed={false}
        setShowActivityFeed={() => {}}
        realtimeEventsCount={0}
      />
    )
    expect(container.textContent).toBe("")
  })

  it("toggles activity feed state", () => {
    const setShowActivityFeed = vi.fn()

    render(
      <RealtimeStatusIndicator
        isConnected={true}
        lastUpdate={new Date("2024-01-15T10:30:00")}
        showActivityFeed={false}
        setShowActivityFeed={setShowActivityFeed}
        realtimeEventsCount={2}
      />
    )

    expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Activity Feed"))
    expect(setShowActivityFeed).toHaveBeenCalledWith(true)
  })
})
