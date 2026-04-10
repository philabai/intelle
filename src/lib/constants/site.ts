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
} as const;

export const NAV_LINKS = [
  {
    label: "Research Services",
    href: "/research",
    children: [
      { label: "Energy Research", href: "/research/energy" },
      {
        label: "Standards & Regulations",
        href: "/research/standards",
      },
      {
        label: "AI & Digitalization Research",
        href: "/research/ai-digitalization",
      },
      {
        label: "Technology Scouting",
        href: "/research/technology-scouting",
      },
      {
        label: "Market & Competitive Intelligence",
        href: "/research/market-intelligence",
      },
      { label: "Patent & IP Intelligence", href: "/research/patent-ip" },
      {
        label: "Strategic & Custom Engagements",
        href: "/research/strategic",
      },
    ],
  },
  {
    label: "Implementation Services",
    href: "/engineering",
    children: [
      {
        label: "Adoption & Value Realization",
        href: "/engineering/workbench-adoption",
      },
      {
        label: "Requirements Digitalization",
        href: "/engineering/plm-integration",
      },
      {
        label: "Knowledge Management",
        href: "/engineering/knowledge-management",
      },
      {
        label: "Standards Advisory",
        href: "/engineering/compliance-advisory",
      },
    ],
  },
  { label: "Industries", href: "/industries" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const CREDENTIALS = [
  { value: "25+", label: "Years Domain Expertise" },
  { value: "65+", label: "Enterprise Relationships" },
  { value: "2x", label: "President's Club Winner" },
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
    { label: "Requirements Digitalization", href: "/engineering/plm-integration" },
    {
      label: "Knowledge Management",
      href: "/engineering/knowledge-management",
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
