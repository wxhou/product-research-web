import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    files: ["web/src/lib/__tests__/**/*.ts", "web/src/lib/__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "web/src/lib/datasources/index.ts",
      "web/src/lib/research-agent/workers/analyzer/quantitative/datasource.ts",
      "web/src/lib/research-agent/workers/analyzer/quantitative/user-research-analyzer.ts",
      "web/src/lib/research-agent/workers/reporter/templates.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "web/src/lib/research-agent/**/*.ts",
      "web/src/lib/taskQueue.ts",
      "web/src/lib/datasources/index.ts",
      "web/src/lib/db/index.ts",
      "web/src/lib/analysis/index.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
