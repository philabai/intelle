/**
 * Second pass: internal server redirects → locale-aware localizedRedirect.
 * Replaces `import { redirect } from "@/i18n/navigation"` +`redirect(` calls
 * with `localizedRedirect` from @/i18n/redirect (awaited). Skips billing-actions
 * (external Stripe URLs — handled separately to use next/navigation).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SKIP = [/billing-actions\.ts$/];

const files = execSync('git -C . grep -l \'redirect.*from "@/i18n/navigation"\' -- "src/**/*.ts" "src/**/*.tsx"', {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((f) => !SKIP.some((re) => re.test(f)));

let n = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  const before = src;
  src = src.replace(
    /import\s+\{\s*redirect\s*\}\s+from\s+["']@\/i18n\/navigation["'];?/g,
    'import { localizedRedirect } from "@/i18n/redirect";',
  );
  // Bare redirect( calls (not .redirect(, not already localizedRedirect).
  src = src.replace(/(?<![.\w])redirect\(/g, "await localizedRedirect(");
  if (src !== before) {
    writeFileSync(file, src);
    n++;
  }
}
console.log(`Rewrote ${n} files to localizedRedirect.`);
