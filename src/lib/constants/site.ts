export const SITE = {
  name: "intelle.io",
  legalEntity: "SparkLab LLC",
  tagline: "Bespoke Research. Real Outcomes.",
  description:
    "Engineering intelligence and research services spanning energy, standards, AI, technology scouting, market intelligence, and patent analytics.",
  url: "https://intelle.io",
  email: "hello@intelle.io",
  phone: {
    dubai: "+971 50 107 1756",
    india: "+91 97489 89201",
  },
  locations: {
    primary: "Dubai, UAE",
  },
  calcom: {
    username: "intelle.io",
    introCallSlug: "30min",
  },
} as const;

// `key` indexes into the `nav` message namespace (src/messages/*.json). `label`
// is kept as the English fallback / non-localized contexts.
export const NAV_LINKS = [
  {
    label: "Research Services",
    key: "researchServices",
    href: "/research",
    children: [
      { label: "Energy Research", key: "energyResearch", href: "/research/energy" },
      {
        label: "Standards & Regulations",
        key: "standardsRegulations",
        href: "/research/standards",
      },
      {
        label: "AI & Digitalization Research",
        key: "aiDigitalization",
        href: "/research/ai-digitalization",
      },
      {
        label: "Technology Scouting",
        key: "technologyScouting",
        href: "/research/technology-scouting",
      },
      {
        label: "Market & Competitive Intelligence",
        key: "marketIntelligence",
        href: "/research/market-intelligence",
      },
      { label: "Patent & IP Intelligence", key: "patentIp", href: "/research/patent-ip" },
      {
        label: "Strategic & Custom Engagements",
        key: "strategicCustom",
        href: "/research/strategic",
      },
    ],
  },
  {
    label: "Implementation Services",
    key: "implementationServices",
    href: "/engineering",
    children: [
      {
        label: "Adoption & Value Realization",
        key: "adoptionValue",
        href: "/engineering/workbench-adoption",
      },
      {
        label: "Digital Threading & Traceability",
        key: "digitalThreading",
        href: "/engineering/plm-integration",
      },
      {
        label: "KM Strategy",
        key: "kmStrategy",
        href: "/engineering/knowledge-management-strategy",
      },
      {
        label: "KM Solutions Implementation",
        key: "kmImplementation",
        href: "/engineering/knowledge-management-implementation",
      },
      {
        label: "Standards Advisory",
        key: "standardsAdvisory",
        href: "/engineering/compliance-advisory",
      },
    ],
  },
  { label: "Industries", key: "industries", href: "/industries" },
  { label: "Insights", key: "insights", href: "/insights" },
  { label: "About", key: "about", href: "/about" },
  { label: "Contact", key: "contact", href: "/contact" },
] as const;

export const CREDENTIALS = [
  { value: "25+", label: "Years Domain Expertise" },
  { value: "65+", label: "Enterprise Relationships" },
  { value: "6", label: "Fortune 500 Clients Served" },
  { value: "4", label: "Industry Verticals" },
] as const;

export const FOOTER_LINKS = {
  research: [
    { label: "Energy Research", href: "/research/energy" },
    { label: "Standards & Regulations", href: "/research/standards" },
    { label: "AI & Digital Research", href: "/research/ai-digitalization" },
    { label: "Technology Scouting", href: "/research/technology-scouting" },
    { label: "Market Intelligence", href: "/research/market-intelligence" },
    { label: "Patent & IP", href: "/research/patent-ip" },
  ],
  engineering: [
    { label: "Adoption & Value Realization", href: "/engineering/workbench-adoption" },
    { label: "Digital Threading & Traceability", href: "/engineering/plm-integration" },
    {
      label: "KM Strategy",
      href: "/engineering/knowledge-management-strategy",
    },
    {
      label: "KM Solutions Implementation",
      href: "/engineering/knowledge-management-implementation",
    },
    {
      label: "Standards Advisory",
      href: "/engineering/compliance-advisory",
    },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Insights", href: "/insights" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
} as const;
