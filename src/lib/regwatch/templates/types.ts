import type { InternalDocumentKind } from "@/lib/regwatch/internal-documents";
import type { PMDoc } from "./pm-helpers";

export type TemplateFamily =
  | "osha-psm"
  | "iso-9001"
  | "21-cfr-820"
  | "nasa-llis"
  | "ieee-829"
  | "generic";

export const TEMPLATE_FAMILY_LABEL: Record<TemplateFamily, string> = {
  "osha-psm": "OSHA PSM (29 CFR 1910.119)",
  "iso-9001": "ISO 9001 Quality",
  "21-cfr-820": "21 CFR 820 Design Controls",
  "nasa-llis": "NASA Lessons Learnt",
  "ieee-829": "IEEE 829 Test Plan",
  generic: "Generic",
};

export interface TemplateDef {
  key: string;
  label: string;
  description: string;
  family: TemplateFamily;
  kind: InternalDocumentKind;
  prosemirrorJson: PMDoc;
  /**
   * Forward-filled metadata used when the template is instantiated.
   * Currently only `internal_code_prefix` is honoured (auto-numbering),
   * but the shape is open for future fields (e.g. default reviewer role).
   */
  defaultMetadata: {
    internalCodePrefix?: string;
    suggestedKind?: InternalDocumentKind;
  };
  sortOrder: number;
}
