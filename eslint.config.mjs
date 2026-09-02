import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase leans on `any` in the mock/admin layers; typecheck
      // still enforces real types. Flag it but don't block on it.
      "@typescript-eslint/no-explicit-any": "warn",
      // Aggressive new react-hooks compiler-era rules that would require
      // broad rewrites of existing effects. Surface as warnings.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);