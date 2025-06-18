import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: "./tests/setup.node.ts",
    include: ["**/tests/api/**"],
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
    },
  },
})
