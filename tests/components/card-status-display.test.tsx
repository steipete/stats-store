import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CardStatusDisplay } from "../../components/card-status-display"

describe("CardStatusDisplay", () => {
  it("renders error state", () => {
    render(<CardStatusDisplay minHeightClassName="min-h-10" error="Boom" />)
    expect(screen.getByText("Boom")).toBeInTheDocument()
  })

  it("renders no-data state with default message", () => {
    render(<CardStatusDisplay minHeightClassName="min-h-10" noData={true} />)
    expect(screen.getByText("No data for selected period.")).toBeInTheDocument()
  })

  it("renders nothing when no state", () => {
    const { container } = render(<CardStatusDisplay minHeightClassName="min-h-10" />)
    expect(container.firstChild).toBeNull()
  })
})
