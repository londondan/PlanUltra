import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="onSelect"]',
          message:
            'onSelect is a Radix UI API. This project uses Base UI — use onClick instead.',
        },
        {
          selector: 'JSXAttribute[name.name="asChild"]',
          message:
            'asChild is a Radix UI API. This project uses Base UI — use the render prop or a plain element instead.',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Marketing scripts (Node.js, not part of the Next.js app)
    "marketing/**",
  ]),
]);

export default eslintConfig;
