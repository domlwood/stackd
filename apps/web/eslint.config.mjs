import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import { defineConfig, globalIgnores } from "eslint/config"

/** Modules that must never be imported by the pure calculation engine. */
const IMPURE_MODULES = [
  "@/lib/supabase/*",
  "@/lib/ingest/*",
  "@/features/*",
  "next",
  "next/*",
  "react",
  "react-dom",
  "server-only",
  "@supabase/*",
]

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "coverage/**",
    "playwright-report/**",
    "next-env.d.ts",
    "src/lib/supabase/database.types.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "import/no-default-export": "off",
    },
  },
  {
    files: ["src/components/**", "src/app/**/*.tsx"],
    ignores: ["src/app/**/actions.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin"],
              message:
                "The service-role client is for scripts and server services only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/calc/**", "src/lib/inputs/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: IMPURE_MODULES,
              message:
                "lib/calc must stay pure: no I/O, framework or DB imports.",
            },
          ],
        },
      ],
    },
  },
])
