/**
 * Functional RegWatch roles used to derive default Feed filters and onboarding
 * defaults (Sweep role-based-default pattern from A.2). Stored in
 * supabase.auth user_metadata as `functional_role` — distinct from
 * organization_members.role which governs admin authority.
 */

export interface RegwatchRole {
  value: string;
  label: string;
  description: string;
}

export const REGWATCH_ROLES: RegwatchRole[] = [
  {
    value: "cco",
    label: "Chief Compliance Officer",
    description: "Oversees the org's full compliance posture; tracks board-level risk.",
  },
  {
    value: "ehs-manager",
    label: "EHS Manager",
    description: "Operational EHS — site-level permits, emissions, worker safety.",
  },
  {
    value: "legal-counsel",
    label: "Legal Counsel",
    description: "Statutory interpretation, regulatory filings, enforcement defence.",
  },
  {
    value: "esg-lead",
    label: "ESG / Sustainability Lead",
    description: "Disclosure frameworks (CSRD, ISSB, SEC), carbon markets, climate strategy.",
  },
  {
    value: "gov-affairs",
    label: "Government Affairs Lead",
    description: "Regulatory engagement, consultations, jurisdictional intelligence.",
  },
  {
    value: "other",
    label: "Other / not listed",
    description: "Skip the role-based defaults; configure filters manually.",
  },
];

export function roleLabel(value: string | null | undefined): string {
  if (!value) return "Not set";
  return REGWATCH_ROLES.find((r) => r.value === value)?.label ?? value;
}
