import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

describe("Table Components", () => {
  it("renders Table with proper styling", () => {
    render(
      <Table data-testid="table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByTestId("table")
    expect(table).toHaveClass("w-full", "caption-bottom", "text-sm")
  })

  it("renders TableHeader with proper styling", () => {
    render(
      <Table>
        <TableHeader data-testid="header">
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    const header = screen.getByTestId("header")
    expect(header).toHaveClass("[&_tr]:border-b")
  })

  it("renders TableBody with proper styling", () => {
    render(
      <Table>
        <TableBody data-testid="body">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const body = screen.getByTestId("body")
    expect(body).toHaveClass("[&_tr:last-child]:border-0")
  })

  it("renders TableFooter with proper styling", () => {
    render(
      <Table>
        <TableFooter data-testid="footer">
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    const footer = screen.getByTestId("footer")
    expect(footer).toHaveClass("border-t", "bg-muted/50", "font-medium")
  })

  it("renders TableRow with proper styling", () => {
    render(
      <Table>
        <TableBody>
          <TableRow data-testid="row">
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const row = screen.getByTestId("row")
    expect(row).toHaveClass("border-b", "transition-colors", "hover:bg-muted/50", "data-[state=selected]:bg-muted")
  })

  it("renders TableHead with proper styling", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="head">Column Header</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    const head = screen.getByTestId("head")
    expect(head).toHaveClass("h-12", "px-4", "text-left", "align-middle", "font-medium", "text-muted-foreground")
  })

  it("renders TableCell with proper styling", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell data-testid="cell">Cell Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const cell = screen.getByTestId("cell")
    expect(cell).toHaveClass("p-4", "align-middle")
  })

  it("renders TableCaption with proper styling", () => {
    render(
      <Table>
        <TableCaption data-testid="caption">Table Caption</TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const caption = screen.getByTestId("caption")
    expect(caption).toHaveClass("mt-4", "text-sm", "text-muted-foreground")
  })

  it("renders complete table structure", () => {
    render(
      <Table>
        <TableCaption>A list of recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>PayPal</TableCell>
            <TableCell>$150.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell>$400.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    // Check all parts are rendered
    expect(screen.getByText("A list of recent invoices.")).toBeInTheDocument()
    expect(screen.getByText("Invoice")).toBeInTheDocument()
    expect(screen.getByText("INV001")).toBeInTheDocument()
    expect(screen.getByText("$400.00")).toBeInTheDocument()
  })

  it("accepts custom className on all components", () => {
    render(
      <Table className="custom-table">
        <TableHeader className="custom-header">
          <TableRow className="custom-row">
            <TableHead className="custom-head">Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="custom-body">
          <TableRow>
            <TableCell className="custom-cell">Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByRole("table")).toHaveClass("custom-table")
  })
})
