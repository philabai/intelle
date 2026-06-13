import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation primitives. Import `Link`, `useRouter`, `usePathname`,
 * `redirect`, `getPathname` from HERE instead of `next/link` / `next/navigation`
 * everywhere user-facing — they automatically prepend the active locale prefix.
 * (ESLint `no-restricted-imports` bans the raw imports to prevent regressions.)
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
