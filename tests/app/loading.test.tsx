import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import Loading from "../../app/loading"

describe("app/loading", () => {
  it("renders loading UI", () => {
    render(<Loading />)

    expect(screen.getByText("stats.store")).toBeInTheDocument()
    expect(screen.getByText("Loading dashboard data...")).toBeInTheDocument()
  })
})
