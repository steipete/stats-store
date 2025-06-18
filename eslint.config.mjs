import js from "@eslint/js"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import prettier from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly",
        global: "readonly",
        Buffer: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      prettier,
    },
    rules: {
      ...typescript.configs["recommended"].rules,
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-escape": "off",
      "no-undef": "off", // TypeScript handles this
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
      "*.config.mjs",
    ],
  },
]
