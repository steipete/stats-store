import { render, screen, waitFor } from "@testing-library/react"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import { useIsMobile } from "../../hooks/use-mobile"

describe("useIsMobile", () => {
  it("tracks viewport size changes", async () => {
    const listeners = new Set<() => void>()
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 500 })

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        addEventListener: (_event: string, cb: () => void) => listeners.add(cb),
        matches: window.innerWidth < 768,
        removeEventListener: (_event: string, cb: () => void) => listeners.delete(cb),
      }))
    )

    function Harness() {
      const isMobile = useIsMobile()
      return <div>{isMobile ? "mobile" : "desktop"}</div>
    }

    render(<Harness />)

    await waitFor(() => expect(screen.getByText("mobile")).toBeInTheDocument())

    window.innerWidth = 900
    act(() => {
      for (const cb of listeners) cb()
    })

    await waitFor(() => expect(screen.getByText("desktop")).toBeInTheDocument())
  })
})
