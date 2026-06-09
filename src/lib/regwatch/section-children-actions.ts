"use server";

import {
  getSectionChildren,
  type SectionNode,
} from "./regulatory-sections";

/**
 * Server action behind the browse tree's lazy expansion. The corpus is public
 * (read-only, no auth gate), so this simply returns the direct children of a
 * section node when the user expands it.
 */
export async function loadSectionChildren(
  parentId: string,
): Promise<SectionNode[]> {
  if (!parentId) return [];
  return getSectionChildren(parentId);
}
