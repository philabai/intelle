import { OSHA_PSM_TEMPLATES } from "./families/osha-psm";
import { ISO_9001_TEMPLATES } from "./families/iso-9001-sop";
import { CFR_820_TEMPLATES } from "./families/21-cfr-820-design";
import { NASA_LLIS_TEMPLATES } from "./families/nasa-llis";
import { IEEE_829_TEMPLATES } from "./families/ieee-829-test-plan";
import { GENERIC_TEMPLATES } from "./families/generic";
import type { TemplateDef, TemplateFamily } from "./types";

/**
 * Code is the source of truth for the template gallery. The DB table
 * `regwatch.internal_document_templates` is a deploy-time upsert target
 * generated from this registry via scripts/seed-internal-doc-templates.ts.
 *
 * Add new templates by writing a new family file and importing it here.
 * Run `npm run regen-template-seed` to regenerate the seed migration body.
 */

export const TEMPLATE_REGISTRY: TemplateDef[] = [
  ...OSHA_PSM_TEMPLATES,
  ...ISO_9001_TEMPLATES,
  ...CFR_820_TEMPLATES,
  ...NASA_LLIS_TEMPLATES,
  ...IEEE_829_TEMPLATES,
  ...GENERIC_TEMPLATES,
];

export function getTemplate(key: string): TemplateDef | null {
  return TEMPLATE_REGISTRY.find((t) => t.key === key) ?? null;
}

export function listTemplatesByFamily(family: TemplateFamily): TemplateDef[] {
  return TEMPLATE_REGISTRY.filter((t) => t.family === family).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  "osha-psm",
  "iso-9001",
  "21-cfr-820",
  "nasa-llis",
  "ieee-829",
  "generic",
];
