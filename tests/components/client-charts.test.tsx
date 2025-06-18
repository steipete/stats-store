import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClientLineChart } from "../../components/client-line-chart"
import { ClientBarChart } from "../../components/client-bar-chart"
import { ClientDonutChart } from "../../components/client-donut-chart"

// Mock Tremor charts
vi.mock("@tremor/react", () => ({
  LineChart: ({ data, categories, index, valueFormatter, ...props }: any) => (
    <div data-testid="line-chart" {...props}>
      {data?.map((item: any, i: number) => (
        <div key={i}>
          {index && item[index]}
          {categories?.map((cat: string) => (
            <span key={cat}>{valueFormatter ? valueFormatter(item[cat]) : item[cat]}</span>
          ))}
        </div>
      ))}
    </div>
  ),
  BarChart: ({ data, categories, index, valueFormatter, ...props }: any) => (
    <div data-testid="bar-chart" {...props}>
      {data?.map((item: any, i: number) => (
        <div key={i}>
          {index && item[index]}
          {categories?.map((cat: string) => (
            <span key={cat}>{valueFormatter ? valueFormatter(item[cat]) : item[cat]}</span>
          ))}
        </div>
      ))}
    </div>
  ),
  DonutChart: ({ data, category, index, valueFormatter, ...props }: any) => {
    // Remove the 'index' prop from props before spreading to avoid React warnings
    const { index: _, ...restProps } = props
    return (
      <div data-testid="donut-chart" {...restProps}>
        {data?.map((item: any, i: number) => (
          <div key={i}>
            <span>{item[index]}</span>
            <span>{valueFormatter ? valueFormatter(item[category]) : item[category]}</span>
          </div>
        ))}
      </div>
    )
  },
}))

describe("Client Chart Components", () => {
  describe("ClientLineChart", () => {
    it("renders with basic props", () => {
      const mockData = [
        { date: "2024-01-01", users: 100 },
        { date: "2024-01-02", users: 150 },
      ]

      render(<ClientLineChart data={mockData} index="date" categories={["users"]} />)

      expect(screen.getByTestId("line-chart")).toBeInTheDocument()
      expect(screen.getByText("2024-01-01")).toBeInTheDocument()
      expect(screen.getByText("2024-01-02")).toBeInTheDocument()
    })

    it("applies valueFormatter to data", () => {
      const mockData = [
        { date: "2024-01-01", count: 1000 },
        { date: "2024-01-02", count: 2500 },
      ]

      render(<ClientLineChart data={mockData} index="date" categories={["count"]} />)

      // valueFormatter should format numbers with commas
      expect(screen.getByText("1,000")).toBeInTheDocument()
      expect(screen.getByText("2,500")).toBeInTheDocument()
    })

    it("renders empty state when no data", () => {
      render(<ClientLineChart data={[]} index="date" categories={["users"]} />)

      expect(screen.getByTestId("line-chart")).toBeInTheDocument()
    })

    it("passes through additional props", () => {
      render(
        <ClientLineChart
          data={[]}
          index="date"
          categories={["users"]}
          className="custom-class"
          colors={["blue", "red"]}
          showLegend={false}
        />
      )

      const chart = screen.getByTestId("line-chart")
      expect(chart).toHaveClass("custom-class")
    })

    it("handles multiple categories", () => {
      const mockData = [
        { date: "2024-01-01", mobile: 100, desktop: 200 },
        { date: "2024-01-02", mobile: 150, desktop: 250 },
      ]

      render(<ClientLineChart data={mockData} index="date" categories={["mobile", "desktop"]} />)

      expect(screen.getByText("100")).toBeInTheDocument()
      expect(screen.getByText("200")).toBeInTheDocument()
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("250")).toBeInTheDocument()
    })
  })

  describe("ClientBarChart", () => {
    it("renders with basic props", () => {
      const mockData = [
        { os: "macOS 14", count: 100 },
        { os: "macOS 13", count: 50 },
      ]

      render(<ClientBarChart data={mockData} index="os" categories={["count"]} />)

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
      expect(screen.getByText("macOS 14")).toBeInTheDocument()
      expect(screen.getByText("macOS 13")).toBeInTheDocument()
    })

    it("applies valueFormatter to data", () => {
      const mockData = [
        { version: "1.0", downloads: 5000 },
        { version: "2.0", downloads: 10000 },
      ]

      render(<ClientBarChart data={mockData} index="version" categories={["downloads"]} />)

      expect(screen.getByText("5,000")).toBeInTheDocument()
      expect(screen.getByText("10,000")).toBeInTheDocument()
    })

    it("handles stacked bar charts", () => {
      const mockData = [
        { month: "Jan", arm64: 100, x86_64: 50 },
        { month: "Feb", arm64: 120, x86_64: 40 },
      ]

      render(<ClientBarChart data={mockData} index="month" categories={["arm64", "x86_64"]} stack={true} />)

      expect(screen.getByText("100")).toBeInTheDocument()
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("120")).toBeInTheDocument()
      expect(screen.getByText("40")).toBeInTheDocument()
    })

    it("renders with custom colors", () => {
      render(
        <ClientBarChart
          data={[{ category: "A", value: 10 }]}
          index="category"
          categories={["value"]}
          colors={["emerald"]}
        />
      )

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
    })
  })

  describe("ClientDonutChart", () => {
    it("renders with basic props", () => {
      const mockData = [
        { name: "Apple Silicon", value: 75 },
        { name: "Intel", value: 25 },
      ]

      render(<ClientDonutChart data={mockData} category="value" index="name" />)

      expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
      expect(screen.getByText("Apple Silicon")).toBeInTheDocument()
      expect(screen.getByText("Intel")).toBeInTheDocument()
    })

    it("applies valueFormatter to values", () => {
      const mockData = [
        { browser: "Chrome", users: 1500 },
        { browser: "Safari", users: 2500 },
        { browser: "Firefox", users: 500 },
      ]

      render(<ClientDonutChart data={mockData} category="users" index="browser" />)

      expect(screen.getByText("1,500")).toBeInTheDocument()
      expect(screen.getByText("2,500")).toBeInTheDocument()
      expect(screen.getByText("500")).toBeInTheDocument()
    })

    it("handles empty data", () => {
      render(<ClientDonutChart data={[]} category="value" index="name" />)

      expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
    })

    it("renders with custom variant", () => {
      const mockData = [
        { type: "A", count: 60 },
        { type: "B", count: 40 },
      ]

      render(<ClientDonutChart data={mockData} category="count" index="type" variant="pie" />)

      expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
    })

    it("handles label and custom colors", () => {
      const mockData = [
        { status: "Active", count: 80 },
        { status: "Inactive", count: 20 },
      ]

      render(
        <ClientDonutChart
          data={mockData}
          category="count"
          index="status"
          label="User Status"
          colors={["green", "gray"]}
        />
      )

      expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
      expect(screen.getByText("Active")).toBeInTheDocument()
      expect(screen.getByText("Inactive")).toBeInTheDocument()
    })
  })

  describe("Common chart behaviors", () => {
    it("all charts handle null/undefined data gracefully", () => {
      const { rerender } = render(<ClientLineChart data={undefined as any} index="x" categories={["y"]} />)
      expect(screen.getByTestId("line-chart")).toBeInTheDocument()

      rerender(<ClientBarChart data={null as any} index="x" categories={["y"]} />)
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument()

      rerender(<ClientDonutChart data={null as any} category="y" index="x" />)
      expect(screen.getByTestId("donut-chart")).toBeInTheDocument()
    })

    it("all charts preserve Tremor props", () => {
      const commonProps = {
        className: "custom-chart",
        showAnimation: true,
        animationDuration: 500,
      }

      const { rerender } = render(<ClientLineChart data={[]} index="x" categories={["y"]} {...commonProps} />)
      expect(screen.getByTestId("line-chart")).toHaveClass("custom-chart")

      rerender(<ClientBarChart data={[]} index="x" categories={["y"]} {...commonProps} />)
      expect(screen.getByTestId("bar-chart")).toHaveClass("custom-chart")

      rerender(<ClientDonutChart data={[]} category="y" index="x" {...commonProps} />)
      expect(screen.getByTestId("donut-chart")).toHaveClass("custom-chart")
    })
  })
})
