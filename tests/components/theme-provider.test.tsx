import { render, screen } from "@testing-library/react"
import type { ComponentProps, ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "../../components/theme-provider"

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <div data-testid="next-themes-provider" {...(props as ComponentProps<"div">)}>
      {children}
    </div>
  ),
}))

describe("ThemeProvider", () => {
  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div>Test Child Content</div>
      </ThemeProvider>
    )

    expect(screen.getByText("Test Child Content")).toBeInTheDocument()
  })

  it("passes through props to NextThemesProvider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <div>Content</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId("next-themes-provider")
    expect(provider).toHaveAttribute("attribute", "class")
    expect(provider).toHaveAttribute("defaultTheme", "system")
    // Boolean props might not be rendered as attributes in the DOM
    expect(provider).toBeInTheDocument()
  })

  it("renders multiple children", () => {
    render(
      <ThemeProvider>
        <header>Header</header>
        <main>Main Content</main>
        <footer>Footer</footer>
      </ThemeProvider>
    )

    expect(screen.getByText("Header")).toBeInTheDocument()
    expect(screen.getByText("Main Content")).toBeInTheDocument()
    expect(screen.getByText("Footer")).toBeInTheDocument()
  })

  it("handles theme storage key prop", () => {
    render(
      <ThemeProvider storageKey="app-theme">
        <div>App</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId("next-themes-provider")
    expect(provider).toHaveAttribute("storageKey", "app-theme")
  })

  it("handles theme values prop", () => {
    const themes = {
      custom: "custom-theme",
      dark: "dark",
      light: "light",
    }

    render(
      <ThemeProvider themes={["light", "dark", "custom"]} value={themes}>
        <div>Themed App</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId("next-themes-provider")
    expect(provider).toHaveAttribute("themes", "light,dark,custom")
  })

  it("handles forced theme prop", () => {
    render(
      <ThemeProvider forcedTheme="dark">
        <div>Forced Dark Theme</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId("next-themes-provider")
    expect(provider).toHaveAttribute("forcedTheme", "dark")
  })

  it("renders without any props", () => {
    render(
      <ThemeProvider>
        <div>Default Theme Provider</div>
      </ThemeProvider>
    )

    expect(screen.getByText("Default Theme Provider")).toBeInTheDocument()
    expect(screen.getByTestId("next-themes-provider")).toBeInTheDocument()
  })

  it("handles nonce prop for CSP", () => {
    render(
      <ThemeProvider nonce="abc123">
        <div>Secure Content</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId("next-themes-provider")
    expect(provider).toHaveAttribute("nonce", "abc123")
  })

  it("works with complex nested components", () => {
    const ComplexApp = () => (
      <div>
        <nav>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </nav>
        <main>
          <section>
            <h1>Title</h1>
            <p>Paragraph</p>
          </section>
        </main>
      </div>
    )

    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ComplexApp />
      </ThemeProvider>
    )

    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Paragraph")).toBeInTheDocument()
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })
})
