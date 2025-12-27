import { describe, expect, it } from "vitest"
import { valueFormatter } from "../../lib/formatters"

describe("valueFormatter", () => {
  describe("valid number inputs", () => {
    it("formats regular numbers correctly", () => {
      expect(valueFormatter(0)).toBe("0")
      expect(valueFormatter(1)).toBe("1")
      expect(valueFormatter(100)).toBe("100")
      expect(valueFormatter(1000)).toBe("1,000")
      expect(valueFormatter(1_000_000)).toBe("1,000,000")
    })

    it("formats negative numbers correctly", () => {
      expect(valueFormatter(-1)).toBe("-1")
      expect(valueFormatter(-1000)).toBe("-1,000")
      expect(valueFormatter(-1_000_000)).toBe("-1,000,000")
    })

    it("formats decimal numbers correctly", () => {
      expect(valueFormatter(1.5)).toBe("1.5")
      expect(valueFormatter(1000.99)).toBe("1,000.99")
      expect(valueFormatter(0.123)).toBe("0.123")
    })

    it("handles very large numbers", () => {
      expect(valueFormatter(1e9)).toBe("1,000,000,000")
      expect(valueFormatter(1e12)).toBe("1,000,000,000,000")
    })

    it("handles very small numbers", () => {
      expect(valueFormatter(0.001)).toBe("0.001")
      // Very small numbers may be formatted to "0" by Intl.NumberFormat
      expect(valueFormatter(0.000_001)).toBe("0")
    })

    it("handles special numeric values", () => {
      expect(valueFormatter(Infinity)).toBe("∞")
      expect(valueFormatter(-Infinity)).toBe("-∞")
    })
  })

  describe("invalid inputs", () => {
    it('returns "0" for NaN', () => {
      expect(valueFormatter(Number.NaN)).toBe("0")
      expect(valueFormatter(0 / 0)).toBe("0")
    })

    it('returns "0" for non-numeric types', () => {
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter(undefined)).toBe("0")
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter()).toBe("0")
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter("123")).toBe("0")
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter({})).toBe("0")
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter([])).toBe("0")
      // @ts-expect-error - Testing invalid input
      expect(valueFormatter(true)).toBe("0")
    })
  })

  describe("edge cases", () => {
    it("handles zero correctly", () => {
      expect(valueFormatter(0)).toBe("0")
      // JavaScript's -0 may be formatted as "-0" by Intl.NumberFormat
      expect(valueFormatter(-0)).toBe("-0")
    })

    it("handles Number constants", () => {
      // Number.MAX_VALUE is formatted with thousands separators
      expect(valueFormatter(Number.MAX_VALUE)).toContain("179,769,313,486,231,570")
      // Very small numbers are formatted as "0" by Intl.NumberFormat
      expect(valueFormatter(Number.MIN_VALUE)).toBe("0")
      expect(valueFormatter(Number.EPSILON)).toBe("0")
    })
  })
})
