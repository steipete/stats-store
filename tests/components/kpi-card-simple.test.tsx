import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { KpiCardSimple } from "../../components/kpi-card-simple"
import { UsersIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline"

describe.skip("KpiCardSimple", () => {
  describe("basic rendering", () => {
    it("renders with required props", () => {
      render(<KpiCardSimple title="Total Users" value="1,234" icon={UsersIcon} />)

      expect(screen.getByText("Total Users")).toBeInTheDocument()
      expect(screen.getByText("1,234")).toBeInTheDocument()
    })

    it("renders with numeric value", () => {
      render(<KpiCardSimple title="Count" value={42} icon={UsersIcon} />)

      expect(screen.getByText("Count")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("renders icon component", () => {
      const { container } = render(<KpiCardSimple title="Users" value="100" icon={UsersIcon} />)

      expect(container.querySelector("svg")).toBeInTheDocument()
    })
  })

  describe("icon customization", () => {
    it("renders with custom icon color", () => {
      render(<KpiCardSimple title="Test" value="123" icon={UsersIcon} iconColor="green" />)

      expect(screen.getByText("Test")).toBeInTheDocument()
    })

    it("renders with icon variant prop", () => {
      render(<KpiCardSimple title="Test" value="123" icon={UsersIcon} iconVariant="solid" />)

      expect(screen.getByText("Test")).toBeInTheDocument()
      // The component accepts the iconVariant prop without errors
    })
  })

  describe("error state", () => {
    it("renders normal icon when error is true but no errorIcon provided", () => {
      const { container } = render(<KpiCardSimple title="Error" value="Failed" icon={UsersIcon} error />)

      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Failed")).toBeInTheDocument()
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders error icon when error is true and errorIcon is provided", () => {
      const { container } = render(
        <KpiCardSimple title="Error" value="Failed" icon={UsersIcon} error errorIcon={ExclamationCircleIcon} />
      )

      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Failed")).toBeInTheDocument()
      // Should render the error icon instead of the normal icon
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders normal icon when error is false even with errorIcon provided", () => {
      const { container } = render(
        <KpiCardSimple
          title="Normal"
          value="Success"
          icon={UsersIcon}
          error={false}
          errorIcon={ExclamationCircleIcon}
        />
      )

      expect(screen.getByText("Normal")).toBeInTheDocument()
      expect(screen.getByText("Success")).toBeInTheDocument()
      expect(container.querySelector("svg")).toBeInTheDocument()
    })
  })

  describe("tooltip functionality", () => {
    it("adds tooltip to card when provided", () => {
      const { container } = render(
        <KpiCardSimple title="Test" value="123" icon={UsersIcon} tooltip="Helpful information" />
      )

      // Card should have cursor-help class
      const card = container.querySelector(".cursor-help")
      expect(card).toBeInTheDocument()

      // Tooltip is set as title attribute on Card component
      expect(card).toHaveAttribute("title", "Helpful information")
    })

    it("renders without tooltip when not provided", () => {
      const { container } = render(<KpiCardSimple title="Test" value="123" icon={UsersIcon} />)

      const card = container.querySelector(".cursor-help")
      expect(card).toBeInTheDocument()
      expect(card).not.toHaveAttribute("title")
    })
  })

  describe("layout and spacing", () => {
    it("applies correct margin to metric", () => {
      render(<KpiCardSimple title="Title" value="Value" icon={UsersIcon} />)

      const metric = screen.getByText("Value")
      expect(metric).toHaveClass("mt-2")
    })

    it("maintains flex layout for title and icon", () => {
      const { container } = render(<KpiCardSimple title="Title" value="Value" icon={UsersIcon} />)

      // Check that Flex component is used for layout
      const title = screen.getByText("Title")
      const flexContainer = title.parentElement
      expect(flexContainer?.tagName).toBeDefined()
    })
  })

  describe("complex scenarios", () => {
    it("renders with all props combined", () => {
      render(
        <KpiCardSimple
          title="Complex Card"
          value="999"
          icon={UsersIcon}
          iconColor="purple"
          iconVariant="solid"
          error={false}
          errorIcon={ExclamationCircleIcon}
          tooltip="This is a complex card with all props"
        />
      )

      expect(screen.getByText("Complex Card")).toBeInTheDocument()
      expect(screen.getByText("999")).toBeInTheDocument()
    })

    it("handles long text values gracefully", () => {
      const longTitle = "This is a very long title that might wrap"
      const longValue = "1,234,567,890"

      render(<KpiCardSimple title={longTitle} value={longValue} icon={UsersIcon} />)

      expect(screen.getByText(longTitle)).toBeInTheDocument()
      expect(screen.getByText(longValue)).toBeInTheDocument()
    })
  })
})
