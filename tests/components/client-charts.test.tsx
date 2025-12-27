import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ClientBarChart } from "../../components/client-bar-chart"
import { ClientDonutChart } from "../../components/client-donut-chart"
import { ClientLineChart } from "../../components/client-line-chart"

describe("Client Chart Components", () => {
  it("renders line chart wrapper", () => {
    render(
      <ClientLineChart className="h-40" data={[{ date: "2024-01-01", users: 1 }]} index="date" categories={["users"]} />
    )
    expect(screen.getByTestId("line-chart")).toBeInTheDocument()
  })

  it("renders bar chart wrapper", () => {
    render(<ClientBarChart className="h-40" data={[{ name: "A", count: 1 }]} index="name" categories={["count"]} />)
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
  })

  it("renders donut chart wrapper", () => {
    render(<ClientDonutChart className="h-40" data={[{ name: "A", value: 1 }]} index="name" category="value" />)
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
  })

  it("supports multiple series + stacked bars", () => {
    render(
      <ClientBarChart
        className="h-40"
        data={[{ arm64: 1, month: "Jan", x86_64: 2 }]}
        index="month"
        categories={["arm64", "x86_64"]}
        stack={true}
      />
    )
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
  })

  it("supports pie variant", () => {
    render(
      <ClientDonutChart
        className="h-40"
        data={[
          { name: "A", value: 1 },
          { name: "B", value: 2 },
        ]}
        index="name"
        category="value"
        variant="pie"
      />
    )
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
  })
})
