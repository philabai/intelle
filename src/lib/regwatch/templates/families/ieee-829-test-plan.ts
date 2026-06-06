import { doc, h1, metaTable, section } from "../pm-helpers";
import type { TemplateDef } from "../types";

/**
 * IEEE 829 — Standard for Software and System Test Documentation
 * (superseded by ISO/IEC/IEEE 29119-3 in 2013 but the 16-section
 * checklist remains the de facto industry layout for test plans).
 */

export const IEEE_829_TEMPLATES: TemplateDef[] = [
  {
    key: "ieee-829-test-plan",
    label: "IEEE 829 — Test Plan",
    description:
      "16-section IEEE 829 / 29119-3 test plan structure for software, system, or process validation testing.",
    family: "ieee-829",
    kind: "test-plan",
    defaultMetadata: { internalCodePrefix: "TP-", suggestedKind: "test-plan" },
    sortOrder: 10,
    prosemirrorJson: doc(
      h1("Test Plan"),
      metaTable([
        ["Plan identifier", ""],
        ["Project / System under test", ""],
        ["Revision", "v0.1"],
        ["Test lead", ""],
        ["Quality reviewer", ""],
      ]),
      ...section(
        "1. Test plan identifier",
        "Unique identifier for this test plan.",
      ),
      ...section(
        "2. Introduction",
        "Summary of the items and features to be tested. Provide context — system overview, references to higher-level plans, scope boundary.",
      ),
      ...section(
        "3. Test items",
        "List the items to be tested. Include version numbers / build identifiers.",
      ),
      ...section(
        "4. Features to be tested",
        "Identify all features and combinations of features to be tested.",
      ),
      ...section(
        "5. Features not to be tested",
        "Identify all features and significant combinations of features that will not be tested, and the reasons.",
      ),
      ...section(
        "6. Approach",
        "Overall approach to testing — methodology, level of integration, depth of testing.",
      ),
      ...section(
        "7. Item pass/fail criteria",
        "Specify the criteria to be used to determine whether each test item has passed or failed testing.",
      ),
      ...section(
        "8. Suspension criteria and resumption requirements",
        "Specify the criteria used to suspend all or a portion of the testing activity and the criteria to resume.",
      ),
      ...section(
        "9. Test deliverables",
        "Identify the documents to be delivered (test design specs, test cases, test procedures, test logs, anomaly reports, test summary report).",
      ),
      ...section(
        "10. Testing tasks",
        "Identify the tasks necessary to prepare for and perform testing.",
      ),
      ...section(
        "11. Environmental needs",
        "Specify the necessary properties of the test environment — hardware, software, communications, network, security.",
      ),
      ...section(
        "12. Responsibilities",
        "Identify the groups responsible for managing, designing, preparing, executing, witnessing, checking, and resolving testing.",
      ),
      ...section(
        "13. Staffing and training needs",
        "Specify staffing needs and any training needed to provide the necessary skills.",
      ),
      ...section(
        "14. Schedule",
        "Include test milestones, test item transmittal events, planned start / end dates for each task.",
      ),
      ...section(
        "15. Planning risks and contingencies",
        "Identify high-risk assumptions of the plan and contingency plans for each.",
      ),
      ...section(
        "16. Approvals",
        "Names and titles of the people who must approve this plan, with sign-off block.",
      ),
    ),
  },
];
