import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { RealtimeStatusFooter } from "../../components/realtime-status-footer"

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: ComponentProps<"div"> & { children?: ReactNode }) => <div {...props}>{children}</div>,
  },
}))

describe("RealtimeStatusFooter", () => {
  it("renders nothing when disconnected", () => {
    const { container } = render(<RealtimeStatusFooter isConnected={false} realtimeEventsCount={0} />)
    expect(container.textContent).toBe("")
  })

  it("renders status and event count when connected", () => {
    render(
      <RealtimeStatusFooter isConnected={true} lastUpdate={new Date("2024-01-15T10:30:00")} realtimeEventsCount={3} />
    )

    expect(screen.getByText(/Real-time updates active/)).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Activity Feed"))
    fireEvent.click(screen.getByText("Activity Feed"))
  })
})
