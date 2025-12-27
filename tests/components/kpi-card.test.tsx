import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { KpiCard } from "../../components/kpi-card"

describe("KpiCard", () => {
  describe("basic rendering", () => {
    it("renders with title and value", () => {
      render(<KpiCard title="Total Users" value="1,234" />)

      expect(screen.getByText("Total Users")).toBeInTheDocument()
      expect(screen.getByText("1,234")).toBeInTheDocument()
    })

    it("renders with numeric value", () => {
      render(<KpiCard title="Count" value={42} />)

      expect(screen.getByText("Count")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("renders without any props", () => {
      const { container } = render(<KpiCard />)

      expect(container.firstChild).toHaveClass("rounded-lg", "bg-card", "text-card-foreground")
    })

    it("renders with only title", () => {
      render(<KpiCard title="Users" />)

      expect(screen.getByText("Users")).toBeInTheDocument()
    })

    it("renders with only value", () => {
      render(<KpiCard value="999" />)

      expect(screen.getByText("999")).toBeInTheDocument()
    })

    it("renders with custom className", () => {
      const { container } = render(<KpiCard className="custom-class" />)

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("icon rendering", () => {
    it("renders users icon", () => {
      const { container } = render(<KpiCard title="Users" iconName="users" />)

      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders cube icon", () => {
      const { container } = render(<KpiCard title="Versions" iconName="cube" />)

      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders tag icon", () => {
      const { container } = render(<KpiCard title="Tags" iconName="tag" />)

      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders with custom icon color", () => {
      render(<KpiCard title="Test" iconName="users" iconColor="red" />)

      // Icon should be rendered with the specified color
      expect(screen.getByText("Test")).toBeInTheDocument()
    })

    it("renders with icon variant prop", () => {
      render(<KpiCard title="Test" iconName="users" iconVariant="solid" />)

      expect(screen.getByText("Test")).toBeInTheDocument()
      // The component accepts the iconVariant prop without errors
    })
  })

  describe("error state", () => {
    it("renders error state with exclamation icon", () => {
      const { container } = render(<KpiCard title="Error" value="Failed" error />)

      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Failed")).toBeInTheDocument()
      expect(container.firstChild).toHaveClass("border-destructive/50")
    })

    it("overrides icon when error is true", () => {
      const { container } = render(<KpiCard title="Test" iconName="users" error />)

      // Should render exclamation icon instead of users icon
      expect(container.querySelector("svg")).toBeInTheDocument()
      expect(container.firstChild).toHaveClass("border-destructive/50")
    })
  })

  describe("tooltip functionality", () => {
    it("renders without tooltip wrapper when tooltip is not provided", () => {
      const { container } = render(<KpiCard title="Test" value="123" />)

      expect(container.querySelector('[role="tooltip"]')).not.toBeInTheDocument()
    })

    it("renders with tooltip wrapper when tooltip is provided", () => {
      render(<KpiCard title="Test" value="123" tooltip="This is a tooltip" />)

      expect(screen.getByText("Test")).toBeInTheDocument()
      expect(screen.getByText("123")).toBeInTheDocument()
    })
  })

  describe("children rendering", () => {
    it("renders children content", () => {
      render(
        <KpiCard title="Parent">
          <div>Child content</div>
        </KpiCard>
      )

      expect(screen.getByText("Parent")).toBeInTheDocument()
      expect(screen.getByText("Child content")).toBeInTheDocument()
    })

    it("renders children without title or value", () => {
      render(
        <KpiCard>
          <div>Only child content</div>
        </KpiCard>
      )

      expect(screen.getByText("Only child content")).toBeInTheDocument()
    })

    it("applies proper spacing with children", () => {
      render(
        <KpiCard title="Test" value="123">
          <div>Child</div>
        </KpiCard>
      )

      const childWrapper = screen.getByText("Child").parentElement
      expect(childWrapper).toHaveClass("mt-4")
    })

    it("does not apply margin to children when no title or value", () => {
      render(
        <KpiCard>
          <div>Child</div>
        </KpiCard>
      )

      const childWrapper = screen.getByText("Child").parentElement
      expect(childWrapper).not.toHaveClass("mt-4")
    })
  })

  describe("spacing and layout", () => {
    it("applies correct margin to metric when title exists", () => {
      render(<KpiCard title="Title" value="Value" />)

      const metric = screen.getByText("Value")
      expect(metric).toHaveClass("mt-2")
    })

    it("applies correct margin to metric when only icon exists", () => {
      render(<KpiCard iconName="users" value="Value" />)

      const metric = screen.getByText("Value")
      expect(metric).toHaveClass("mt-2")
    })

    it("does not apply margin to metric when no title or icon", () => {
      render(<KpiCard value="Value" />)

      const metric = screen.getByText("Value")
      expect(metric).toHaveClass("mt-0")
    })
  })

  describe("complex combinations", () => {
    it("renders all props together", () => {
      render(
        <KpiCard
          title="Complex Card"
          value="999"
          iconName="users"
          iconColor="green"
          iconVariant="solid"
          tooltip="This is a complex card"
          className="custom-card"
        >
          <div>Additional content</div>
        </KpiCard>
      )

      expect(screen.getByText("Complex Card")).toBeInTheDocument()
      expect(screen.getByText("999")).toBeInTheDocument()
      expect(screen.getByText("Additional content")).toBeInTheDocument()
    })

    it("handles error state with all props", () => {
      const { container } = render(
        <KpiCard title="Error Card" value="Failed" iconName="users" error tooltip="Error details">
          <div>Error info</div>
        </KpiCard>
      )

      expect(screen.getByText("Error Card")).toBeInTheDocument()
      expect(screen.getByText("Failed")).toBeInTheDocument()
      expect(screen.getByText("Error info")).toBeInTheDocument()
      expect(container.firstChild).toHaveClass("border-destructive/50")
    })
  })
})
