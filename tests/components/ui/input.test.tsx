import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("renders with default props", () => {
    render(<Input placeholder="Enter text" />)

    const input = screen.getByPlaceholderText("Enter text")
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass(
      "flex",
      "h-10",
      "w-full",
      "rounded-md",
      "border",
      "border-input",
      "bg-background",
      "px-3",
      "py-2"
    )
  })

  it("accepts different input types", () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text")

    rerender(<Input type="email" placeholder="email" />)
    expect(screen.getByPlaceholderText("email")).toHaveAttribute("type", "email")

    rerender(<Input type="password" placeholder="password" />)
    expect(screen.getByPlaceholderText("password")).toHaveAttribute("type", "password")

    rerender(<Input type="number" placeholder="number" />)
    expect(screen.getByPlaceholderText("number")).toHaveAttribute("type", "number")
  })

  it("handles value and onChange", () => {
    const handleChange = vi.fn()
    render(<Input value="test value" onChange={handleChange} placeholder="test" />)

    const input = screen.getByPlaceholderText("test")
    expect(input).toHaveValue("test value")

    fireEvent.change(input, { target: { value: "new value" } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it("applies custom className", () => {
    render(<Input className="custom-input" placeholder="custom" />)

    expect(screen.getByPlaceholderText("custom")).toHaveClass("custom-input")
  })

  it("handles disabled state", () => {
    render(<Input disabled placeholder="disabled" />)

    const input = screen.getByPlaceholderText("disabled")
    expect(input).toBeDisabled()
    expect(input).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50")
  })

  it("handles readonly state", () => {
    render(<Input readOnly value="readonly value" />)

    const input = screen.getByDisplayValue("readonly value")
    expect(input).toHaveAttribute("readonly")
  })

  it("forwards ref correctly", () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)

    expect(ref).toHaveBeenCalled()
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement)
  })

  it("handles focus and blur events", () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()

    render(<Input onFocus={handleFocus} onBlur={handleBlur} placeholder="focus test" />)

    const input = screen.getByPlaceholderText("focus test")

    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)

    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it("accepts HTML input attributes", () => {
    render(
      <Input
        placeholder="test"
        maxLength={10}
        minLength={2}
        pattern="[A-Za-z]+"
        required
        autoComplete="off"
        autoFocus
      />
    )

    const input = screen.getByPlaceholderText("test")
    expect(input).toHaveAttribute("maxLength", "10")
    expect(input).toHaveAttribute("minLength", "2")
    expect(input).toHaveAttribute("pattern", "[A-Za-z]+")
    expect(input).toHaveAttribute("required")
    expect(input).toHaveAttribute("autoComplete", "off")
    // autoFocus is processed by React and doesn't appear as an HTML attribute
  })
})
