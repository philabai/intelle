/** Hand-authored types for the `outreach` schema (the tables Outreach reads/
 * writes). Generate-from-schema can replace these later via `supabase gen types`. */

export type GeoRegion = "gcc" | "us" | "canada" | "india" | "international";
export type Platform = "linkedin" | "x" | "newsletter" | "youtube" | "reddit";
export type PostStatus =
  | "draft" | "pending_review" | "under_review" | "approved"
  | "scheduled" | "publishing" | "published" | "rejected" | "failed";
export type PillarSlug =
  | "regulatory-briefings" | "mea-compliance" | "standards-engineering"
  | "industry-newsjack" | "demo-product" | "long-form-authority";

export interface ContentPillar {
  id: string;
  slug: string;
  name: string;
  description: string;
  editorial_voice_notes: string | null;
  active: boolean;
  weekly_post_target: number;
  created_at: string;
}

export interface ContentSeed {
  id: string;
  source_type: "regulator_update" | "industry_news" | "topic_calendar" | "manual";
  source_reference_id: string | null;
  title: string;
  summary: string;
  raw_content: string | null;
  pillar_id: string | null;
  geo_relevance: GeoRegion[];
  persona_relevance: string[];
  discovered_at: string;
  consumed: boolean;
  consumed_at: string | null;
  consumed_in_post_id: string | null;
}

export interface Citation {
  n: number;
  label: string;
  url?: string;
}

export interface OutreachPost {
  id: string;
  pillar_id: string;
  seed_id: string | null;
  target_platforms: Platform[];
  target_geos: GeoRegion[];
  target_personas: string[];
  title: string | null;
  body_long: string | null;
  body_medium: string | null;
  body_short: string | null;
  body_thread: string[] | null;
  hashtags: string[];
  suggested_media: unknown;
  citations: Citation[];
  platform_variants: Record<string, unknown>;
  status: PostStatus;
  scheduled_for: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  ai_confidence: number | null;
  prompt_version: string | null;
  model_used: string | null;
  generation_cost_usd: number | null;
  edit_history: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Publication {
  id: string;
  post_id: string;
  platform: Platform;
  platform_connection_id: string | null;
  platform_post_id: string | null;
  platform_url: string | null;
  published_at: string | null;
  status: "pending" | "publishing" | "published" | "failed";
  error_message: string | null;
  created_at: string;
}
