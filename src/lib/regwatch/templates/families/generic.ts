import { doc, h1, metaTable, section, bullets, raciTable } from "../pm-helpers";
import type { TemplateDef } from "../types";

/**
 * Generic templates — one per common doc kind for teams that don't need
 * the industry-specific structures above. Section sets are deliberately
 * lean so authors can shape them to their org's existing patterns.
 */

const metaBlock = metaTable([
  ["Document title", ""],
  ["Document number", ""],
  ["Revision", "v0.1"],
  ["Effective date", ""],
  ["Next review", ""],
  ["Owner", ""],
  ["Approved by", ""],
]);

export const GENERIC_TEMPLATES: TemplateDef[] = [
  {
    key: "generic-policy",
    label: "Policy",
    description: "General-purpose corporate / quality policy template.",
    family: "generic",
    kind: "policy",
    defaultMetadata: { internalCodePrefix: "POL-", suggestedKind: "policy" },
    sortOrder: 10,
    prosemirrorJson: doc(
      h1("Policy"),
      metaBlock,
      ...section("1. Policy statement", "The position taken by the organization on this subject."),
      ...section("2. Purpose", "Why this policy exists and what it achieves."),
      ...section("3. Scope", "Who and what this policy applies to. Note exclusions explicitly."),
      ...section("4. Roles and responsibilities", "Who is accountable for compliance, who enforces, who escalates."),
      ...section("5. Policy principles", "Numbered statements; each is testable / auditable."),
      ...section("6. Compliance and monitoring", "How conformance is measured + cadence."),
      ...section("7. References", "Linked regulations, standards, and supporting procedures."),
      ...section("8. Revision history", "Auto-managed via the version control panel."),
    ),
  },
  {
    key: "generic-internal-standard",
    label: "Internal Standard",
    description: "Company-internal technical or operational standard.",
    family: "generic",
    kind: "internal-standard",
    defaultMetadata: { internalCodePrefix: "STD-", suggestedKind: "internal-standard" },
    sortOrder: 20,
    prosemirrorJson: doc(
      h1("Internal Standard"),
      metaBlock,
      ...section("1. Purpose", "What this standard defines and why."),
      ...section("2. Scope", "Applicability — assets, processes, geographies."),
      ...section("3. Normative references", "External codes / regulations / standards that this internal standard builds on."),
      ...section("4. Terms and definitions", "Domain-specific terms used in this standard."),
      ...section("5. Requirements", "Numbered, testable requirement clauses (5.1, 5.2, 5.2.1, …)."),
      ...section("6. Verification and compliance", "How conformance is demonstrated."),
      ...section("7. Records", "Records required by this standard + retention."),
      ...section("8. References", "Supporting documents."),
    ),
  },
  {
    key: "generic-procedure",
    label: "Procedure",
    description: "General-purpose multi-step procedure (non-SOP).",
    family: "generic",
    kind: "project-document",
    defaultMetadata: { internalCodePrefix: "PRC-", suggestedKind: "project-document" },
    sortOrder: 30,
    prosemirrorJson: doc(
      h1("Procedure"),
      metaBlock,
      ...section("1. Purpose", "What this procedure achieves."),
      ...section("2. Scope", "Activities + roles covered."),
      ...section("3. Roles and responsibilities", "RACI block.", raciTable(["Step 1", "Step 2"])),
      ...section("4. Procedure steps", "Numbered steps; each step has a clear actor + decision points."),
      ...section("5. Inputs and outputs", "What's required to start; what's produced when done."),
      ...section("6. Tools and references", "Forms, templates, systems, supporting documents."),
      ...section("7. Records", "Where the records of this procedure are stored."),
    ),
  },
  {
    key: "generic-work-instruction",
    label: "Work Instruction",
    description: "Task-level instruction sheet for an operator / technician.",
    family: "generic",
    kind: "work-instruction",
    defaultMetadata: { internalCodePrefix: "WI-", suggestedKind: "work-instruction" },
    sortOrder: 40,
    prosemirrorJson: doc(
      h1("Work Instruction"),
      metaBlock,
      ...section("1. Task description", "Single-sentence description of the task."),
      ...section("2. Tools and materials required", "Bill of materials + tools.", bullets("Tool / Material 1", "Tool / Material 2")),
      ...section("3. Safety considerations", "PPE required; specific hazards; LOTO references."),
      ...section("4. Step-by-step", "Numbered steps; photographs or diagrams where possible."),
      ...section("5. Quality checks", "What to inspect; what 'good' looks like; how to flag a defect."),
      ...section("6. Sign-off", "Who confirms completion."),
    ),
  },
  {
    key: "generic-blank",
    label: "Blank document",
    description: "Empty document — use when no template fits.",
    family: "generic",
    kind: "other",
    defaultMetadata: { internalCodePrefix: "DOC-", suggestedKind: "other" },
    sortOrder: 999,
    prosemirrorJson: doc(
      h1("Untitled"),
      metaBlock,
    ),
  },
];
