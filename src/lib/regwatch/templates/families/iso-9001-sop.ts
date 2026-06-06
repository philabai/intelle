import { doc, h1, metaTable, prompt, bullets, raciTable, section } from "../pm-helpers";
import type { TemplateDef } from "../types";

/**
 * ISO 9001:2015 — Quality Management SOP template.
 *
 * Section structure follows the de-facto SOP template adopted by ISO
 * 9001 implementers: Purpose / Scope / Definitions / Responsibilities
 * (RACI) / Procedure (hierarchically numbered) / References / Records /
 * Revision history / Appendices.
 */

export const ISO_9001_TEMPLATES: TemplateDef[] = [
  {
    key: "iso-9001-sop",
    label: "ISO 9001 — Standard Operating Procedure",
    description:
      "Canonical ISO 9001:2015 quality-management SOP structure used in regulated industries worldwide.",
    family: "iso-9001",
    kind: "sop",
    defaultMetadata: { internalCodePrefix: "SOP-", suggestedKind: "sop" },
    sortOrder: 10,
    prosemirrorJson: doc(
      h1("Standard Operating Procedure"),
      metaTable([
        ["Document title", ""],
        ["Document number", ""],
        ["Revision", "v0.1"],
        ["Effective date", ""],
        ["Next review", ""],
        ["Owner", ""],
        ["Approved by", ""],
      ]),
      ...section(
        "1. Purpose",
        "State the objective of this procedure — what activity it controls and what outcome it ensures.",
      ),
      ...section(
        "2. Scope",
        "Define which functions, sites, products or services this procedure applies to. Call out explicit exclusions.",
      ),
      ...section(
        "3. Definitions and abbreviations",
        "Terms specific to this procedure. Refer to the master glossary where possible.",
        bullets("Term — definition", "Acronym — full form"),
      ),
      ...section(
        "4. Responsibilities",
        "RACI matrix — Responsible / Accountable / Consulted / Informed for each step.",
        raciTable(["Step 1", "Step 2", "Step 3"]),
      ),
      ...section(
        "5. Procedure",
        "Step-by-step instructions, numbered hierarchically (5.1, 5.1.1, etc.).",
      ),
      ...section(
        "6. References",
        "Linked external standards (ISO 9001:2015 clauses), internal policies, and supporting SOPs.",
      ),
      ...section(
        "7. Records",
        "What records are generated, where they are filed, and the retention period.",
      ),
      ...section(
        "8. Revision history",
        "Auto-managed by the version control panel — every save creates an immutable revision row.",
      ),
      ...section(
        "9. Appendices",
        "Forms, checklists, flow diagrams referenced from the body.",
      ),
    ),
  },
];
