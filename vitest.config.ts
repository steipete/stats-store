import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["**/tests/api/**", "node"]],
    globals: true,
    setupFiles: "./tests/setup.ts",
    silent: true,
    exclude: ["**/node_modules/**", "**/tests/appcast-integration.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockServiceWorker.js",
        "components/ui/**",
        "tests/**",
        "scripts/**",
        ".next/**",
        "node_modules/**",
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
