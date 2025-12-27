import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ThemeScript } from "../../app/theme-script"

describe("app/theme-script", () => {
  it("renders theme boot script", () => {
    const { container } = render(<ThemeScript />)

    const script = container.querySelector("script")
    expect(script).toBeTruthy()

    const content = script?.textContent ?? ""
    expect(content).toContain('localStorage.getItem("theme")')
    expect(content).toContain("document.documentElement.classList")
  })
})
