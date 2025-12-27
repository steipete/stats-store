import { render, waitFor } from "@testing-library/react"
import { act } from "react"
import { describe, expect, it, vi } from "vitest"

describe("useToast", () => {
  it("limits toast list to 1 and dismisses", async () => {
    vi.resetModules()
    const { useToast } = await import("../../hooks/use-toast")

    let api: ReturnType<typeof useToast> | null = null

    function Harness() {
      api = useToast()
      return null
    }

    render(<Harness />)

    act(() => {
      api?.toast({ title: "A" })
    })

    await waitFor(() => expect(api?.toasts).toHaveLength(1))
    expect(api?.toasts[0]?.title).toBe("A")

    act(() => {
      api?.toast({ title: "B" })
    })

    await waitFor(() => expect(api?.toasts).toHaveLength(1))
    expect(api?.toasts[0]?.title).toBe("B")

    act(() => {
      api?.dismiss()
    })

    await waitFor(() => expect(api?.toasts[0]?.open).toBe(false))
  })

  it("updates toast content", async () => {
    vi.resetModules()
    const { useToast } = await import("../../hooks/use-toast")

    let api: ReturnType<typeof useToast> | null = null

    function Harness() {
      api = useToast()
      return null
    }

    render(<Harness />)

    const handle = (() => {
      let result: { id: string; update: (props: unknown) => void } | null = null
      act(() => {
        result = api?.toast({ title: "A" }) ?? null
      })
      return result
    })()

    await waitFor(() => expect(api?.toasts).toHaveLength(1))

    act(() => {
      handle?.update({ id: handle.id, open: true, title: "Updated" })
    })

    await waitFor(() => expect(api?.toasts[0]?.title).toBe("Updated"))
  })
})
