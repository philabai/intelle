/**
 * RTL codemod: convert the UNAMBIGUOUS physical Tailwind utilities to logical
 * (dir-aware) ones across components + app. Margin/padding/text-align/border-
 * side/rounded-side only — these have no centering ambiguity. Directional
 * POSITIONING (left-/right-) is handled by hand (drawers, dropdowns, centering,
 * decorative blobs need case-by-case care), so it's intentionally excluded here.
 *
 * Runs on className tokens (optionally with a `sm:`/`hover:` variant prefix),
 * guarded by a lookbehind so it never matches inside another identifier.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Order matters: 2-letter rounded corners before single-letter sides.
const RULES = [
  [/(?<![\w-])rounded-tl(?=[-\s"'`}])/g, "rounded-ss"],
  [/(?<![\w-])rounded-tr(?=[-\s"'`}])/g, "rounded-se"],
  [/(?<![\w-])rounded-bl(?=[-\s"'`}])/g, "rounded-es"],
  [/(?<![\w-])rounded-br(?=[-\s"'`}])/g, "rounded-ee"],
  [/(?<![\w-])rounded-l(?=[-\s"'`}])/g, "rounded-s"],
  [/(?<![\w-])rounded-r(?=[-\s"'`}])/g, "rounded-e"],
  [/(?<![\w-])border-l(?=[-\s"'`}])/g, "border-s"],
  [/(?<![\w-])border-r(?=[-\s"'`}])/g, "border-e"],
  [/(?<![\w-])text-left(?=[\s"'`}])/g, "text-start"],
  [/(?<![\w-])text-right(?=[\s"'`}])/g, "text-end"],
  [/(?<![\w-])ml-/g, "ms-"],
  [/(?<![\w-])mr-/g, "me-"],
  [/(?<![\w-])pl-/g, "ps-"],
  [/(?<![\w-])pr-/g, "pe-"],
  // Negative margins.
  [/(?<![\w-])-ml-/g, "-ms-"],
  [/(?<![\w-])-mr-/g, "-me-"],
];

const files = execSync("git -C . ls-files 'src/**/*.tsx'", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

let changed = 0;
let edits = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  const before = src;
  for (const [re, to] of RULES) {
    src = src.replace(re, () => {
      edits++;
      return to;
    });
  }
  if (src !== before) {
    writeFileSync(file, src);
    changed++;
  }
}
console.log(`RTL codemod: ${edits} class conversions across ${changed} files.`);
