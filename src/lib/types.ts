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
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  updated_at: string;
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
}
