"use server";

import { z } from "zod";
import { createClient } from "./supabase/server";
import { listRegulationsHybrid } from "./queries";

/**
 * Server action that powers the in-app regulation autocomplete used by
 * - LinkRegulationForm (linking a doc to a reg)
 * - CreateObligationForm (creating a new obligation)
 *
 * Goes through the same hybrid retrieval (vector + FTS) as the Search page
 * so paraphrases (eg "carbon tax" → CBAM) work out of the box. Falls back
 * to a name+citation ILIKE when the query is a UUID, so the deep-link path
 * (paste citation) still works.
 */

export interface RegulationPickerResult {
  id: string;
  citation: string;
  title: string;
  jurisdictionCode: string;
  regulatorName: string;
  status: string;
}

const inputSchema = z.object({
  query: z.string().trim().min(0).max(200),
  limit: z.number().int().min(1).max(25).default(10),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function searchRegulationsForPicker(
  input: unknown,
): Promise<RegulationPickerResult[]> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return [];

  const supabase = await createClient();

  // Direct UUID paste — return the single matching row.
  if (UUID_RE.test(parsed.data.query)) {
    const { data } = await supabase
      .from("regulatory_items")
      .select(
        `id, citation, title, jurisdiction_code, status,
         regulator:regulators!inner ( name, short_name )`,
      )
      .eq("id", parsed.data.query)
      .limit(1)
      .maybeSingle();
    if (!data) return [];
    const reg = Array.isArray(data.regulator)
      ? data.regulator[0]
      : data.regulator;
    return [
      {
        id: data.id as string,
        citation: data.citation as string,
        title: data.title as string,
        jurisdictionCode: data.jurisdiction_code as string,
        status: data.status as string,
        regulatorName:
          (reg?.short_name as string | null) ??
          (reg?.name as string | null) ??
          "Unknown regulator",
      },
    ];
  }

  // Empty / very-short query → show 10 recent items so the picker isn't blank.
  if (parsed.data.query.length < 2) {
    const { data } = await supabase
      .from("regulatory_items")
      .select(
        `id, citation, title, jurisdiction_code, status,
         regulator:regulators!inner ( name, short_name )`,
      )
      .order("last_changed_at", { ascending: false })
      .limit(parsed.data.limit);
    return (data ?? []).map((row) => {
      const reg = Array.isArray(row.regulator) ? row.regulator[0] : row.regulator;
      return {
        id: row.id as string,
        citation: row.citation as string,
        title: row.title as string,
        jurisdictionCode: row.jurisdiction_code as string,
        status: row.status as string,
        regulatorName:
          (reg?.short_name as string | null) ??
          (reg?.name as string | null) ??
          "Unknown regulator",
      };
    });
  }

  // Hybrid retrieval — same path Iris uses, scoped to the picker's needs.
  const hits = await listRegulationsHybrid(parsed.data.query, parsed.data.limit);
  return hits.map((h) => ({
    id: h.id,
    citation: h.citation,
    title: h.title,
    jurisdictionCode: h.jurisdiction_code,
    status: h.status,
    regulatorName: h.regulator.short_name ?? h.regulator.name,
  }));
}
