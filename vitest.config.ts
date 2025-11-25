import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    exclude: ["**/node_modules/**", "**/tests/api/**", "**/tests/appcast-integration.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockServiceWorker.js",
        "tests/**",
        "scripts/**",
        ".next/**",
        "node_modules/**",
      ],
      thresholds: {
        global: {
          statements: 25,
          branches: 25,
          functions: 25,
          lines: 25,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@tremor/react": path.resolve(__dirname, "./tests/mocks/tremor-react.ts"),
    },
  },
})
