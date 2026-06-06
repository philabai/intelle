import { doc, h1, metaTable, section, bullets } from "../pm-helpers";
import type { TemplateDef } from "../types";

/**
 * NASA Lessons Learned Information System (LLIS) — the de facto format
 * for capturing engineering / operations lessons learnt and surfacing
 * them to future projects.
 */

export const NASA_LLIS_TEMPLATES: TemplateDef[] = [
  {
    key: "nasa-llis-lesson-learnt",
    label: "NASA LLIS — Lesson Learnt",
    description:
      "Canonical NASA Lessons Learned format — title + lesson ID + abstract + context + driving event + lesson(s) + recommendations + evidence + applicability + references.",
    family: "nasa-llis",
    kind: "lessons-learnt",
    defaultMetadata: { internalCodePrefix: "LL-", suggestedKind: "lessons-learnt" },
    sortOrder: 10,
    prosemirrorJson: doc(
      h1("Lesson Learnt"),
      metaTable([
        ["Lesson title", ""],
        ["Lesson ID", ""],
        ["Submitter", ""],
        ["Date submitted", ""],
        ["Project / Program", ""],
        ["Discipline", ""],
        ["Severity", ""],
      ]),
      ...section(
        "1. Abstract",
        "1-2 sentence summary of the lesson. This is what gets indexed and surfaced in search.",
      ),
      ...section(
        "2. Background and context",
        "Describe the project, program, or operation. Include the technical, organizational and historical context that lets a future reader understand the situation.",
      ),
      ...section(
        "3. Driving event",
        "What happened — the failure, near-miss, deviation, anomaly, or success — that drives this lesson? Be specific about dates, conditions, and observable facts.",
      ),
      ...section(
        "4. Lesson(s) learnt",
        "What the team learnt. Generalise beyond the immediate event so the lesson is reusable by other teams.",
      ),
      ...section(
        "5. Recommendation(s)",
        "Specific actions for future projects / programs / operations. Each recommendation should be testable.",
        bullets(
          "Recommendation 1 — actionable, traceable",
          "Recommendation 2 — actionable, traceable",
        ),
      ),
      ...section(
        "6. Evidence and contributing factors",
        "Root cause(s) identified; data / measurements / observations that support the lesson; references to investigation reports.",
      ),
      ...section(
        "7. Applicability",
        "Which projects, disciplines, life-cycle phases, mission classes this lesson applies to. Tag broadly so it gets surfaced widely.",
      ),
      ...section(
        "8. References and links",
        "Investigation reports, related lessons, regulations, internal SOPs.",
      ),
    ),
  },
];
