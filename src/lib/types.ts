export type ArticlePillar =
  | "industry_insight"
  | "service_spotlight"
  | "founder_pov"
  | "case_archetype"
  | "resource";

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export interface Article {
  id: string;
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  category: "insight" | "case-study" | "whitepaper" | "news";
  tags: string[];
  cover_image_url: string | null;
  author_name: string;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;

  pillar: ArticlePillar | null;
  meta_description: string | null;
  seo_keywords: string[];
  scheduled_at: string | null;

  linkedin_body: string | null;
  linkedin_scheduled_at: string | null;
  linkedin_published_at: string | null;
  linkedin_buffer_post_id: string | null;

  twitter_body: string | null;
  twitter_scheduled_at: string | null;
  twitter_published_at: string | null;
  twitter_buffer_post_id: string | null;

  generation_prompt: string | null;
  generation_metadata: Record<string, unknown>;
}

export type EngagementStatus = "active" | "paused" | "completed" | "cancelled";
export type EngagementServiceType = "research" | "engineering";
export type DocumentKind = "deliverable" | "draft" | "source" | "report" | "other";

export interface Engagement {
  id: string;
  customer_id: string;
  service_id: string;
  service_type: EngagementServiceType;
  title: string;
  status: EngagementStatus;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementDocument {
  id: string;
  engagement_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  kind: DocumentKind;
  title: string | null;
  description: string | null;
  uploaded_by: string | null;
  is_visible_to_customer: boolean;
  created_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  service_interest: string | null;
  message: string;
  source_page: string | null;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface ServiceCategory {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  icon: string;
  deliverables: string[];
  focusAreas: string[];
  // Enriched content fields
  methodology?: { step: string; description: string }[];
  whoItsFor?: string[];
  expectedOutcomes?: { title: string; description: string }[];
  sampleProjects?: {
    title: string;
    industry: string;
    scope: string;
    duration: string;
  }[];
  engagementModels?: {
    model: string;
    description: string;
    typicalDuration: string;
  }[];
  differentiators?: string[];
  // Engineering-specific optional fields
  technologyPartners?: { name: string; type: string }[];
  implementationTimeline?: {
    phase: string;
    duration: string;
    description: string;
  }[];
  // SEO + content depth (from audit)
  tldr?: string[];
  faqs?: FAQ[];
  // Visual variant — defaults to "blue" if absent (existing service detail visual unchanged).
  accentColor?: "blue" | "teal" | "violet";
  // Hero eyebrow override — defaults to "Implementation Service" / "Research Service".
  eyebrow?: string;
  // Vendor landscape table (rendered conditionally on Engineering Service Detail).
  // Optional `experience` per row surfaces how deeply we deliver against that category
  // (e.g., "Primary delivery", "Direct experience", "Vendor-neutral evaluation").
  vendorLandscape?: { category: string; vendors: string; experience?: string }[];
  // Callout block above the vendor table — surfaces the implementation focus
  // (which platforms we actually deliver against) distinct from evaluation breadth.
  implementationFocus?: {
    title: string;
    body: string;
    platforms: string[];
  };
  // Dedicated platform-spotlight block — primary platform with quantified benefits and
  // capabilities, plus an optional nested GenAI assistant sub-section. Rendered above
  // the vendor landscape on the Engineering Service Detail page.
  platformSpotlight?: {
    eyebrow: string;
    title: string;
    subtitle: string;
    positioningStatement: string;
    benefits: { metric: string; label: string }[];
    benefitsSource?: string;
    capabilities: { title: string; description: string }[];
    chat?: {
      title: string;
      subtitle: string;
      capabilities: { title: string; description: string }[];
    };
    closingNote?: string;
  };
  // RAG architecture patterns (numbered list rendered conditionally).
  ragPatterns?: { title: string; description: string }[];
  // Render the bespoke SECI 2×2 knowledge-spiral diagram on this service's detail page.
  seciDiagram?: boolean;
  // "Next step" callout near the bottom of the page — surfaces a related service
  // the buyer will likely move to next (e.g., Strategy → Implementation).
  nextStep?: {
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  };
}

export interface IndustryInfo {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  standards: string[];
  clients: string[];
  // Enriched content fields
  heroSubtitle?: string;
  challenges?: { title: string; description: string }[];
  trends?: {
    title: string;
    description: string;
    stat?: string;
    statSource?: string;
  }[];
  howWeHelp?: {
    title: string;
    description: string;
    serviceHref?: string;
  }[];
  relevantServices?: {
    serviceId: string;
    serviceType: "research" | "engineering";
    relevance: string;
  }[];
  keyStats?: { value: string; label: string; source?: string }[];
  useCases?: {
    title: string;
    description: string;
    outcome: string;
  }[];
  standardsDetail?: {
    code: string;
    fullName: string;
    relevance: string;
  }[];
  // SEO + content depth (from audit)
  tldr?: string[];
  faqs?: FAQ[];
}
