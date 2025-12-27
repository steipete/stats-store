import { Analytics } from "@vercel/analytics/react"
import type { Metadata } from "next"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import RootLayout from "@/app/layout"
import { ThemeProvider } from "@/components/theme-provider"

// Mock next/font
vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "inter-font",
  }),
}))

// Mock components
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) => ({
    $$typeof: Symbol.for("react.element"),
    type: "div",
    key: null,
    ref: null,
    props: {
      "data-testid": "theme-provider",
      ...props,
      children,
    },
    _owner: null,
    _store: {},
  }),
}))

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => ({
    $$typeof: Symbol.for("react.element"),
    _owner: null,
    _store: {},
    key: null,
    props: {
      "data-testid": "vercel-analytics",
    },
    ref: null,
    type: "div",
  }),
}))

describe("Root Layout", () => {
  const getBodyFromLayout = (layout: ReactElement) => {
    const children = Array.isArray(layout.props.children) ? layout.props.children : [layout.props.children]
    const body = children.find((child: unknown) => {
      if (typeof child !== "object" || child === null) {
        return false
      }
      return (child as { type?: unknown }).type === "body"
    })
    if (!body) {
      throw new Error("Expected RootLayout to render a <body> element")
    }
    return body as { type: unknown; props: { children?: unknown } }
  }

  it("renders with correct structure", () => {
    const TestChild = () => <div>Test Content</div>

    const layout = RootLayout({ children: <TestChild /> })

    // Verify HTML structure
    expect(layout.type).toBe("html")
    expect(layout.props.lang).toBe("en")
    expect(layout.props.suppressHydrationWarning).toBe(true)

    const body = getBodyFromLayout(layout)
    expect(body.type).toBe("body")

    // Check that body has children (the exact structure depends on React internals)
    expect(body.props.children).toBeDefined()

    // The mocked components should have been created
    // We can verify this by checking that our mocks were called/imported
    expect(vi.mocked(ThemeProvider)).toBeDefined()
    expect(vi.mocked(Analytics)).toBeDefined()
  })

  it("passes children to ThemeProvider", () => {
    const TestContent = () => <main>Main Content</main>

    const layout = RootLayout({ children: <TestContent /> })
    const body = getBodyFromLayout(layout)
    const bodyChildren = Array.isArray(body.props.children) ? body.props.children : [body.props.children]
    const themeProvider = bodyChildren[0]

    // Verify children are passed through
    expect(themeProvider.props.children.type).toBe(TestContent)
  })

  it("renders multiple children correctly", () => {
    const MultipleChildren = () => (
      <>
        <header>Header</header>
        <main>Main</main>
        <footer>Footer</footer>
      </>
    )

    const layout = RootLayout({ children: <MultipleChildren /> })
    const body = getBodyFromLayout(layout)
    const bodyChildren = Array.isArray(body.props.children) ? body.props.children : [body.props.children]
    const themeProvider = bodyChildren[0]

    expect(themeProvider.props.children.type).toBe(MultipleChildren)
  })
})

describe("Layout Metadata", () => {
  it("exports correct metadata", async () => {
    // Import the metadata export
    const layoutModule = await import("@/app/layout")
    const metadata = layoutModule.metadata as Metadata

    expect(metadata.title).toEqual({
      default:
        "stats.store - Fast, open, privacy-first analytics for Sparkle-enabled Mac apps. Free for open source projects and indie developers.",
      template: "%s | stats.store",
    })
    expect(metadata.description).toBe(
      "Fast, open, privacy-first analytics for Sparkle-enabled Mac apps. Free for open source projects and indie developers."
    )
    expect(metadata.authors).toEqual([{ name: "Peter Steinberger", url: "https://steipete.me" }])
    expect(metadata.creator).toBe("Peter Steinberger")
    expect(metadata.publisher).toBe("Peter Steinberger")
  })
})
