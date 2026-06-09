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
    // Vendored third-party bundles copied in by postinstall — not our source.
    "public/pdf-worker/**",
    "scripts/**",
  ]),
  // The React Compiler ships several advisory diagnostics as errors in the
  // recommended config. They flag legitimate, working patterns (e.g. closing a
  // menu via setState on route change, reading a ref in a callback) and would
  // require contorting correct code to satisfy. Keep them visible as warnings
  // rather than build-blocking errors. Genuine hook-ordering bugs stay errors
  // via react-hooks/rules-of-hooks.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
