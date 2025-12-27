import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "../../components/theme-provider"

// Mock next-themes
const mockNextThemesProvider = vi.fn(({ children }: { children?: ReactNode }) => (
  <div data-testid="next-themes-provider">{children}</div>
))

vi.mock("next-themes", () => ({
  ThemeProvider: (props: { children?: ReactNode }) => mockNextThemesProvider(props),
}))

describe("ThemeProvider", () => {
  afterEach(() => {
    mockNextThemesProvider.mockClear()
  })

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

    expect(screen.getByTestId("next-themes-provider")).toBeInTheDocument()
    expect(mockNextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: "class",
        defaultTheme: "system",
        disableTransitionOnChange: true,
        enableSystem: true,
      })
    )
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

    expect(mockNextThemesProvider).toHaveBeenCalledWith(expect.objectContaining({ storageKey: "app-theme" }))
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

    expect(mockNextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({ themes: ["light", "dark", "custom"], value: themes })
    )
  })

  it("handles forced theme prop", () => {
    render(
      <ThemeProvider forcedTheme="dark">
        <div>Forced Dark Theme</div>
      </ThemeProvider>
    )

    expect(mockNextThemesProvider).toHaveBeenCalledWith(expect.objectContaining({ forcedTheme: "dark" }))
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

    expect(mockNextThemesProvider).toHaveBeenCalledWith(expect.objectContaining({ nonce: "abc123" }))
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
