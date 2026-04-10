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
}

export interface IndustryInfo {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  standards: string[];
  clients: string[];
}
