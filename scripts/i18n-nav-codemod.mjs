/**
 * One-off codemod: route locale-aware navigation through @/i18n/navigation.
 *   import Link from "next/link"           → import { Link } from "@/i18n/navigation"
 *   next/navigation { redirect, useRouter, usePathname }  → @/i18n/navigation
 *   next/navigation { notFound, useParams, useSearchParams } → stay
 * Skips api routes, proxy, i18n, and the supabase middleware.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MOVED = new Set(["redirect", "useRouter", "usePathname"]);
const SKIP = [/\/app\/api\//, /\/proxy\.ts$/, /\/i18n\//, /\/lib\/supabase\/middleware\.ts$/];

const files = execSync("git -C . ls-files 'src/**/*.ts' 'src/**/*.tsx'", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((f) => !SKIP.some((re) => re.test(f)));

let linkCount = 0;
let navCount = 0;

for (const file of files) {
  let src = readFileSync(file, "utf8");
  const before = src;

  // 1. next/link default import → named Link from the i18n navigation.
  src = src.replace(
    /import\s+Link\s+from\s+["']next\/link["'];?/g,
    () => {
      linkCount++;
      return 'import { Link } from "@/i18n/navigation";';
    },
  );

  // 2. next/navigation named imports — partition moved vs stayed.
  src = src.replace(
    /import\s+\{([^}]*)\}\s+from\s+["']next\/navigation["'];?/g,
    (_m, inner) => {
      const symbols = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const moved = symbols.filter((s) => MOVED.has(s));
      const stayed = symbols.filter((s) => !MOVED.has(s));
      if (moved.length === 0) return _m; // nothing to move
      navCount++;
      const lines = [];
      if (stayed.length)
        lines.push(`import { ${stayed.join(", ")} } from "next/navigation";`);
      lines.push(`import { ${moved.join(", ")} } from "@/i18n/navigation";`);
      return lines.join("\n");
    },
  );

  if (src !== before) writeFileSync(file, src);
}

console.log(`Rewrote ${linkCount} next/link imports, ${navCount} next/navigation imports.`);
