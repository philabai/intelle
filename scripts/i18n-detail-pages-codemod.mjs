/**
 * Codemod the marketing service/industry DETAIL pages to render the localized
 * entry. Each is `const x = ARRAY[N]; ... return <Comp x={x} />`. We keep the
 * module const (used by `metadata` for href/SEO) and inject a localized entry
 * for the render. The client detail components are unchanged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const FN = {
  RESEARCH_SERVICES: "localizeResearchServices",
  ENGINEERING_SERVICES: "localizeEngineeringServices",
  INDUSTRIES: "localizeIndustries",
};

const files = execSync("git -C . ls-files 'src/app/'", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) =>
    /\(marketing\)\/(research|engineering|industries)\/[^/]+\/page\.tsx$/.test(f),
  )
  // Skip the listing index pages — handled separately.
  .filter((f) => !/\/(research|engineering|industries)\/page\.tsx$/.test(f));

let done = 0;
for (const f of files) {
  let s = readFileSync(f, "utf8");
  const m = s.match(
    /const\s+(\w+)\s*=\s*(RESEARCH_SERVICES|ENGINEERING_SERVICES|INDUSTRIES)\[(\d+)\];/,
  );
  if (!m) {
    console.log("SKIP (no const=ARRAY[N]):", f);
    continue;
  }
  const [, varName, array, idx] = m;
  const fn = FN[array];

  if (!s.includes("next-intl/server")) {
    s = s.replace(
      /(import type \{ Metadata \} from "next";\n)/,
      `$1import { getLocale } from "next-intl/server";\nimport { ${fn} } from "@/lib/constants/i18n/localize";\n`,
    );
  }

  const exportRe = /export default function (\w+)\(\) \{\n(\s*)return/;
  if (!exportRe.test(s)) {
    console.log("SKIP (no simple default export):", f);
    continue;
  }
  s = s.replace(
    exportRe,
    (_mm, name, ind) =>
      `export default async function ${name}() {\n${ind}const _localized = ${fn}(await getLocale())[${idx}];\n${ind}return`,
  );
  s = s.replace(new RegExp(`=\\{${varName}\\}\\s*/>`), "={_localized} />");

  writeFileSync(f, s);
  done++;
}
console.log("updated", done, "detail pages");
