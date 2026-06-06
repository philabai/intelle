import { doc, h1, metaTable, section, bullets } from "../pm-helpers";
import type { TemplateDef } from "../types";

/**
 * 21 CFR 820.30 — Design Controls / Design History File (DHF).
 *
 * Ten-section structure required by FDA for medical device design
 * controls. Maps clause-by-clause to 820.30(a) through (j).
 */

export const CFR_820_TEMPLATES: TemplateDef[] = [
  {
    key: "21-cfr-820-design-history-file",
    label: "21 CFR 820.30 — Design History File (DHF)",
    description:
      "FDA Design Controls DHF template — covers all ten Design Controls clauses.",
    family: "21-cfr-820",
    kind: "design-document",
    defaultMetadata: { internalCodePrefix: "DHF-", suggestedKind: "design-document" },
    sortOrder: 10,
    prosemirrorJson: doc(
      h1("Design History File"),
      metaTable([
        ["Project / Device", ""],
        ["DHF number", ""],
        ["Revision", "v0.1"],
        ["Effective date", ""],
        ["Project owner", ""],
        ["Quality reviewer", ""],
      ]),
      ...section(
        "1. Design and development planning [820.30(b)]",
        "Identify and describe the design and development activities and define responsibility for implementation. Update plans as design and development evolve.",
        bullets(
          "Design phases and gates",
          "Resource assignments and responsibilities",
          "Interfaces between groups (engineering, quality, regulatory, clinical)",
        ),
      ),
      ...section(
        "2. Design inputs [820.30(c)]",
        "Procedures to ensure that the design requirements relating to a device are appropriate and address the intended use of the device, including the needs of the user and patient. The inputs shall be documented, reviewed and approved by a designated individual(s).",
      ),
      ...section(
        "3. Design outputs [820.30(d)]",
        "Procedures for defining and documenting design output in terms that allow an adequate evaluation of conformance to design input requirements. Identify those design outputs that are essential for the proper functioning of the device.",
      ),
      ...section(
        "4. Design review [820.30(e)]",
        "Procedures for formal documented reviews of the design at appropriate stages of the device's design development. Each review includes an individual(s) who does not have direct responsibility for the design stage being reviewed.",
      ),
      ...section(
        "5. Design verification [820.30(f)]",
        "Confirm that the design output meets the design input requirements. Results, including identification of the design, method(s), date, and individual(s) performing the verification, shall be documented in the DHF.",
      ),
      ...section(
        "6. Design validation [820.30(g)]",
        "Ensure that devices conform to defined user needs and intended uses and shall include testing of production units under actual or simulated use conditions. Validation includes software validation and risk analysis, where appropriate.",
      ),
      ...section(
        "7. Design transfer [820.30(h)]",
        "Procedures to ensure that the device design is correctly translated into production specifications.",
      ),
      ...section(
        "8. Design changes [820.30(i)]",
        "Procedures for the identification, documentation, validation or where appropriate verification, review, and approval of design changes before their implementation.",
      ),
      ...section(
        "9. Design history file [820.30(j)]",
        "DHF index — contains or references the records necessary to demonstrate that the design was developed in accordance with the approved design plan and the requirements of this part.",
      ),
      ...section(
        "10. Risk management linkage [ISO 14971]",
        "Reference the Risk Management File and how risk controls flow into design inputs/outputs.",
      ),
    ),
  },
];
