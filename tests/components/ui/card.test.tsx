import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

describe("Card Components", () => {
  it("renders Card with proper styling", () => {
    render(
      <Card data-testid="card">
        <CardContent>Card content</CardContent>
      </Card>
    )

    const card = screen.getByTestId("card")
    expect(card).toHaveClass("rounded-lg", "border", "bg-card", "text-card-foreground")
  })

  it("renders CardHeader with proper styling", () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>
    )

    const header = screen.getByTestId("header")
    expect(header).toHaveClass("flex", "flex-col", "space-y-1.5", "p-6")
  })

  it("renders CardTitle with proper styling", () => {
    render(<CardTitle>Test Title</CardTitle>)

    const title = screen.getByText("Test Title")
    expect(title).toHaveClass("text-2xl", "font-semibold", "leading-none", "tracking-tight")
  })

  it("renders CardDescription with proper styling", () => {
    render(<CardDescription>Test description</CardDescription>)

    const description = screen.getByText("Test description")
    expect(description).toHaveClass("text-sm", "text-muted-foreground")
  })

  it("renders CardContent with proper styling", () => {
    render(
      <Card>
        <CardContent data-testid="content">Content</CardContent>
      </Card>
    )

    const content = screen.getByTestId("content")
    expect(content).toHaveClass("p-6", "pt-0")
  })

  it("renders CardFooter with proper styling", () => {
    render(
      <Card>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    )

    const footer = screen.getByTestId("footer")
    expect(footer).toHaveClass("flex", "items-center", "p-6", "pt-0")
  })

  it("renders complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText("Card Title")).toBeInTheDocument()
    expect(screen.getByText("Card description")).toBeInTheDocument()
    expect(screen.getByText("Card content goes here")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()
  })

  it("accepts custom className on all components", () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Title</CardTitle>
          <CardDescription className="custom-description">Desc</CardDescription>
        </CardHeader>
        <CardContent className="custom-content">Content</CardContent>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText("Title").parentElement?.parentElement).toHaveClass("custom-card")
    expect(screen.getByText("Title").parentElement).toHaveClass("custom-header")
    expect(screen.getByText("Title")).toHaveClass("custom-title")
    expect(screen.getByText("Desc")).toHaveClass("custom-description")
  })
})
