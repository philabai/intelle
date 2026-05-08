import { SITE } from "@/lib/constants";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalEntity,
    url: SITE.url,
    logo: `${SITE.url}/intelle-logo.png`,
    description: SITE.description,
    foundingDate: "2026",
    contactPoint: {
      "@type": "ContactPoint",
      email: SITE.email,
      telephone: SITE.phone.dubai,
      contactType: "sales",
      areaServed: ["AE", "SA", "QA", "OM", "KW", "BH", "IN", "US", "GB"],
      availableLanguage: ["en"],
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    sameAs: [],
  };
}

export function serviceSchema(
  name: string,
  description: string,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${SITE.url}${url}`,
    provider: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 25.2048,
        longitude: 55.2708,
      },
      geoRadius: 6000000,
    },
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  authorName: string;
  imageUrl?: string;
  keywords?: string[];
  wordCount?: number;
  articleSection?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `${SITE.url}${article.url}`,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      "@type": "Person",
      name: article.authorName,
      url: `${SITE.url}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE.url}/intelle-logo.png`,
      },
    },
    ...(article.imageUrl && { image: article.imageUrl }),
    ...(article.keywords?.length && { keywords: article.keywords.join(", ") }),
    ...(article.wordCount && { wordCount: article.wordCount }),
    ...(article.articleSection && { articleSection: article.articleSection }),
  };
}

export function breadcrumbSchema(
  items: { name: string; href: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE.url}${item.href}`,
    })),
  };
}

/**
 * Person schema for the founder. Critical for AI-search citation
 * (ChatGPT/Claude/Perplexity attribute claims to the named person).
 */
export function personSchema(opts: {
  name: string;
  jobTitle: string;
  alumniOf?: string[];
  knowsAbout?: string[];
  sameAs?: string[];
  image?: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    jobTitle: opts.jobTitle,
    worksFor: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    ...(opts.alumniOf?.length && {
      alumniOf: opts.alumniOf.map((org) => ({
        "@type": "Organization",
        name: org,
      })),
    }),
    ...(opts.knowsAbout?.length && { knowsAbout: opts.knowsAbout }),
    ...(opts.sameAs?.length && { sameAs: opts.sameAs }),
    ...(opts.image && { image: opts.image }),
    ...(opts.description && { description: opts.description }),
    url: `${SITE.url}/about`,
  };
}

/**
 * LocalBusiness schema — surfaces Dubai-based business in local-pack results.
 * Geo coordinates: Dubai (DIFC area).
 */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}#business`,
    name: SITE.name,
    legalName: SITE.legalEntity,
    url: SITE.url,
    image: `${SITE.url}/intelle-logo.png`,
    logo: `${SITE.url}/intelle-logo.png`,
    description: SITE.description,
    telephone: SITE.phone.dubai,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 25.2048,
      longitude: 55.2708,
    },
    areaServed: [
      { "@type": "Country", name: "United Arab Emirates" },
      { "@type": "Country", name: "Saudi Arabia" },
      { "@type": "Country", name: "Qatar" },
      { "@type": "Country", name: "India" },
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "United Kingdom" },
    ],
    priceRange: "$$$",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  };
}

/**
 * WebSite schema with SearchAction — makes the site eligible for the
 * Google sitelinks search box once content scales.
 */
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/insights?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * FAQPage schema — every page that surfaces buyer FAQs should emit this
 * to compete for featured snippets in Google + AI search engines.
 */
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

/**
 * ItemList schema for hub pages (Research / Engineering / Industries).
 * Helps Google show the page as a list/hub in SERPs.
 */
export function itemListSchema(items: {
  name: string;
  url: string;
  description?: string;
}[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: `${SITE.url}${it.url}`,
      ...(it.description && { description: it.description }),
    })),
  };
}
