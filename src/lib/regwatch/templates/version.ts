export type VersionBump = "major" | "minor" | "patch";

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export const INITIAL_VERSION: SemVer = { major: 0, minor: 1, patch: 0 };

/**
 * Compute the next semver tuple from a previous version + bump choice.
 *
 *   major → (M+1, 0, 0)
 *   minor → (M, m+1, 0)
 *   patch → (M, m, p+1)
 *
 * Mirrored on the DB side by the saveDraftRevision action (PR-2) so the
 * client can preview the next version before submitting.
 */
export function nextVersion(prev: SemVer, bump: VersionBump): SemVer {
  switch (bump) {
    case "major":
      return { major: prev.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: prev.major, minor: prev.minor + 1, patch: 0 };
    case "patch":
      return { major: prev.major, minor: prev.minor, patch: prev.patch + 1 };
  }
}

export function formatVersion(v: SemVer): string {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

/** Human label for the bump radios in the save dialog. */
export const VERSION_BUMP_LABEL: Record<VersionBump, string> = {
  major: "Major — breaking content change; obligations or linked-regulation impact",
  minor: "Minor — meaningful content change; reviewers should re-look",
  patch: "Patch — typo / formatting / non-substantive",
};
