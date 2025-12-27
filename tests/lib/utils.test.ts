import { describe, expect, it } from "vitest"
import { cn } from "../../lib/utils"

describe("cn (className utility)", () => {
  describe("basic functionality", () => {
    it("returns empty string for no arguments", () => {
      expect(cn()).toBe("")
    })

    it("returns single string unchanged", () => {
      expect(cn("foo")).toBe("foo")
      expect(cn("foo bar")).toBe("foo bar")
    })

    it("concatenates multiple string arguments", () => {
      expect(cn("foo", "bar")).toBe("foo bar")
      expect(cn("foo", "bar", "baz")).toBe("foo bar baz")
    })

    it("filters out falsy values", () => {
      expect(cn("foo", undefined, "bar")).toBe("foo bar")
      expect(cn("foo", undefined, "bar")).toBe("foo bar")
      expect(cn("foo", false, "bar")).toBe("foo bar")
      expect(cn("foo", "", "bar")).toBe("foo bar")
      expect(cn("foo", 0, "bar")).toBe("foo bar")
    })
  })

  describe("conditional classes", () => {
    it("handles boolean conditions", () => {
      const isActive = true
      const isDisabled = false
      expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active")
    })

    it("handles object syntax", () => {
      expect(cn({ bar: false, foo: true })).toBe("foo")
      expect(cn({ bar: true, foo: true })).toBe("bar foo")
      expect(cn("base", { active: true, disabled: false })).toBe("base active")
    })

    it("handles array syntax", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar")
      expect(cn(["foo", undefined, "bar"])).toBe("foo bar")
      expect(cn("base", ["modifier1", "modifier2"])).toBe("base modifier1 modifier2")
    })

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz")
      expect(cn("base", ["mod1", ["mod2", "mod3"]])).toBe("base mod1 mod2 mod3")
    })
  })

  describe("Tailwind CSS class merging", () => {
    it("merges conflicting Tailwind classes correctly", () => {
      // Padding conflicts
      expect(cn("p-4", "p-2")).toBe("p-2")
      expect(cn("px-4", "px-2")).toBe("px-2")
      expect(cn("pt-4", "pt-2")).toBe("pt-2")

      // Margin conflicts
      expect(cn("m-4", "m-2")).toBe("m-2")
      expect(cn("mx-4", "mx-2")).toBe("mx-2")

      // Background color conflicts
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")

      // Text color conflicts
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")

      // Width conflicts
      expect(cn("w-4", "w-8")).toBe("w-8")
      expect(cn("w-full", "w-1/2")).toBe("w-1/2")
    })

    it("preserves non-conflicting classes", () => {
      expect(cn("p-4 text-red-500", "m-2 bg-blue-500")).toBe("p-4 text-red-500 m-2 bg-blue-500")
      expect(cn("flex items-center", "justify-between")).toBe("flex items-center justify-between")
    })

    it("handles arbitrary value classes", () => {
      expect(cn("p-[10px]", "p-[20px]")).toBe("p-[20px]")
      expect(cn("text-[#ff0000]", "text-[#0000ff]")).toBe("text-[#0000ff]")
      expect(cn("w-[100px]", "w-[200px]")).toBe("w-[200px]")
    })

    it("handles responsive prefixes", () => {
      expect(cn("sm:p-4", "sm:p-2")).toBe("sm:p-2")
      expect(cn("md:text-red-500", "md:text-blue-500")).toBe("md:text-blue-500")
      expect(cn("lg:w-4", "lg:w-8")).toBe("lg:w-8")
    })

    it("handles state variants", () => {
      expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500")
      expect(cn("focus:ring-2", "focus:ring-4")).toBe("focus:ring-4")
      expect(cn("disabled:opacity-50", "disabled:opacity-75")).toBe("disabled:opacity-75")
    })

    it("handles important modifier", () => {
      expect(cn("!p-4", "!p-2")).toBe("!p-2")
      // Tailwind-merge may not override non-important with important in all cases
      expect(cn("p-4", "!p-2")).toBe("p-4 !p-2")
      expect(cn("!bg-red-500", "!bg-blue-500")).toBe("!bg-blue-500")
    })
  })

  describe("complex use cases", () => {
    it("handles mixed input types", () => {
      expect(cn("base", "string-class", { "object-class": true }, ["array", "classes"], false, undefined)).toBe(
        "base string-class object-class array classes"
      )
    })

    it("handles component composition patterns", () => {
      const baseButton = "px-4 py-2 rounded font-medium"
      const primaryButton = "bg-blue-500 text-white hover:bg-blue-600"
      const smallButton = "px-2 py-1 text-sm"

      expect(cn(baseButton, primaryButton)).toBe(
        "px-4 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600"
      )
      expect(cn(baseButton, primaryButton, smallButton)).toBe(
        "rounded font-medium bg-blue-500 text-white hover:bg-blue-600 px-2 py-1 text-sm"
      )
    })

    it("handles theme variations", () => {
      const isDark = true
      const isCompact = false

      expect(
        cn("base-styles", isDark && "dark:bg-gray-800 dark:text-white", isCompact && "p-2", !isCompact && "p-4")
      ).toBe("base-styles dark:bg-gray-800 dark:text-white p-4")
    })

    it("handles empty strings and whitespace", () => {
      expect(cn("", "foo", "", "bar", "")).toBe("foo bar")
      expect(cn("  ", "foo", "  ", "bar")).toBe("foo bar")
      expect(cn("\n", "foo", "\t", "bar")).toBe("foo bar")
    })
  })
})
