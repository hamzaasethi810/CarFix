import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The client must never reach the data layer. These rules make an accidental
// import of Prisma, the repositories, or server env fail lint rather than ship.
const serverOnlyModules = [
  {
    group: ["**/lib/generated/prisma", "**/lib/generated/prisma/**", "@prisma/client"],
    message: "Prisma may only be imported from lib/repositories/*.",
  },
  {
    group: ["**/lib/db", "@/lib/db"],
    message: "The Prisma client is server-only. Go through a repository, then a service.",
  },
  {
    group: ["**/lib/repositories/**", "@/lib/repositories/**"],
    message: "Repositories are reachable only from lib/services/*.",
  },
  {
    group: ["**/lib/env", "@/lib/env"],
    message: "Server env holds secrets and must not be imported into client code.",
  },
  {
    group: ["**/lib/storage/**", "@/lib/storage/**"],
    message: "Storage credentials are server-only.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: serverOnlyModules }],
    },
  },
  {
    // Route handlers are the controller layer: they may use services, never repositories.
    files: ["app/api/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/generated/prisma", "**/lib/generated/prisma/**", "@prisma/client"],
              message: "Route handlers must call a service, not Prisma directly.",
            },
            {
              group: ["**/lib/db", "@/lib/db"],
              message: "Route handlers must call a service, not Prisma directly.",
            },
            {
              group: ["**/lib/repositories/**", "@/lib/repositories/**"],
              message: "Route handlers must call a service, not a repository.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/db", "@/lib/db", "@prisma/client"],
              message: "Services must go through a repository, not Prisma directly.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/generated/**",
  ]),
]);

export default eslintConfig;
