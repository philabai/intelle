import { createServiceClient } from "./supabase/service";

/**
 * Citation freshness — walks the body_doc ProseMirror JSON for inline
 * `citedClause` nodes, then bulk-fetches each cited regulation's current
 * `last_changed_at`. A citation is stale when the regulation has been
 * updated AFTER the version that was pinned at insertion time.
 *
 * The Phase-3 supersession cron flips `last_changed_at` whenever a
 * regulation gets a new version, so this is the same signal that drives
 * the watcher email — surfaced inside the review panel as the per-doc
 * citation review queue.
 */

export interface CitedClauseInBody {
  regId: string;
  clauseAnchor: string;
  pinnedVersion: string | null;
  displayText: string;
  /** Path through the doc — used only for ordering, not for resolution. */
  walkOrder: number;
}

export interface StaleCitation extends CitedClauseInBody {
  currentVersion: string | null;
  regulationCitation: string | null;
  jurisdictionCode: string | null;
  regulationTitle: string | null;
}

interface PMNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
}

export function collectCitedClauses(bodyDoc: unknown): CitedClauseInBody[] {
  if (!bodyDoc || typeof bodyDoc !== "object") return [];
  const out: CitedClauseInBody[] = [];
  let order = 0;
  const stack: PMNode[] = [bodyDoc as PMNode];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === "citedClause" && node.attrs) {
      const regId =
        typeof node.attrs.regId === "string" ? node.attrs.regId : null;
      const clauseAnchor =
        typeof node.attrs.clauseAnchor === "string"
          ? node.attrs.clauseAnchor
          : null;
      if (regId && clauseAnchor) {
        out.push({
          regId,
          clauseAnchor,
          pinnedVersion:
            typeof node.attrs.pinnedVersion === "string"
              ? node.attrs.pinnedVersion
              : null,
          displayText:
            typeof node.attrs.displayText === "string"
              ? node.attrs.displayText
              : `${regId} · ${clauseAnchor}`,
          walkOrder: order++,
        });
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) stack.push(child);
    }
  }
  return out;
}

export async function findStaleCitations(
  bodyDoc: unknown,
): Promise<StaleCitation[]> {
  const all = collectCitedClauses(bodyDoc);
  if (all.length === 0) return [];

  // Dedup by (regId, clauseAnchor) — one stale row per cited clause even
  // if the doc cites it five times.
  const seen = new Set<string>();
  const unique: CitedClauseInBody[] = [];
  for (const c of all) {
    const key = `${c.regId}::${c.clauseAnchor}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  const regIds = Array.from(new Set(unique.map((c) => c.regId)));
  const svc = createServiceClient();
  const { data: regs } = await svc
    .from("regulatory_items")
    .select("id, citation, jurisdiction_code, title, last_changed_at")
    .in("id", regIds);
  const regMap = new Map<
    string,
    {
      currentVersion: string | null;
      citation: string | null;
      jurisdictionCode: string | null;
      title: string | null;
    }
  >();
  for (const r of regs ?? []) {
    regMap.set(r.id as string, {
      currentVersion: (r.last_changed_at as string | null) ?? null,
      citation: (r.citation as string | null) ?? null,
      jurisdictionCode: (r.jurisdiction_code as string | null) ?? null,
      title: (r.title as string | null) ?? null,
    });
  }

  const stale: StaleCitation[] = [];
  for (const c of unique) {
    const reg = regMap.get(c.regId);
    if (!reg) {
      // Regulation deleted — surface as stale so the reviewer knows
      // they're citing something that no longer exists.
      stale.push({
        ...c,
        currentVersion: null,
        regulationCitation: null,
        jurisdictionCode: null,
        regulationTitle: null,
      });
      continue;
    }
    const pinned = c.pinnedVersion;
    const current = reg.currentVersion;
    const drifted =
      pinned !== null &&
      current !== null &&
      new Date(current).getTime() > new Date(pinned).getTime();
    const neverPinned = pinned === null && current !== null;
    if (drifted || neverPinned) {
      stale.push({
        ...c,
        currentVersion: current,
        regulationCitation: reg.citation,
        jurisdictionCode: reg.jurisdictionCode,
        regulationTitle: reg.title,
      });
    }
  }
  return stale;
}
