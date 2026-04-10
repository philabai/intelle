import type { ServiceCategory, IndustryInfo } from "./types";

export const SITE = {
  name: "intelle.io",
  legalEntity: "SparkLab LLC",
  tagline: "Bespoke Research. Real Outcomes.",
  description:
    "Engineering intelligence and research services spanning energy, standards, AI, technology scouting, market intelligence, and patent analytics.",
  url: "https://intelle.io",
  email: "contact@intelle.io",
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
        label: "Standards & Regulatory Intelligence",
        href: "/research/standards",
      },
      {
        label: "AI & Digitalization Research",
        href: "/research/ai-digitalization",
      },
      {
        label: "Technology Scouting & Innovation",
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
    label: "Engineering Services",
    href: "/engineering",
    children: [
      {
        label: "Workbench Adoption & Value Realization",
        href: "/engineering/workbench-adoption",
      },
      {
        label: "PLM/ALM Integration",
        href: "/engineering/plm-integration",
      },
      {
        label: "Knowledge Management & Semantic Search",
        href: "/engineering/knowledge-management",
      },
      {
        label: "Compliance & Standards Advisory",
        href: "/engineering/compliance-advisory",
      },
    ],
  },
  { label: "Industries", href: "/industries" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const RESEARCH_SERVICES: ServiceCategory[] = [
  {
    id: "energy",
    title: "Energy Research",
    shortTitle: "Energy",
    description:
      "Built on two decades of direct engagement with the largest operators, ministries, and strategy teams across the energy value chain. We combine rigorous desk research with deep domain fluency.",
    href: "/research/energy",
    icon: "Zap",
    deliverables: [
      "Energy transition pathway analysis and decarbonization roadmaps",
      "Renewable energy market studies across solar, wind, and geothermal",
      "Hydrogen economy research covering green, blue, and grey production",
      "CCUS market intelligence and project tracking",
      "Battery storage and critical minerals supply chain studies",
      "Oil & Gas digitalization and AI adoption research",
      "GCC and MENA energy market intelligence",
      "Carbon markets and ESG research",
    ],
    focusAreas: [
      "Energy Transition",
      "Renewables",
      "Hydrogen",
      "CCUS",
      "Battery Storage",
      "O&G Digitalization",
      "GCC/MENA",
      "Carbon Markets",
    ],
  },
  {
    id: "standards",
    title: "Standards & Regulatory Intelligence",
    shortTitle: "Standards",
    description:
      "Almost every regulated industry relies on standards but lacks the internal expertise to interpret them strategically. We translate regulatory complexity into actionable business decisions.",
    href: "/research/standards",
    icon: "Shield",
    deliverables: [
      "Standards landscape mapping for new products and markets",
      "Regulatory horizon scanning with business impact assessments",
      "Compliance gap analysis and remediation roadmaps",
      "International standards harmonization studies",
      "Standards mapping to internal engineering processes",
      "Standards strategy advisory for requirements management",
    ],
    focusAreas: [
      "ISO/IEC",
      "ASTM/API/ASME",
      "MIL-STD",
      "FDA/EU MDR",
      "Compliance",
      "Harmonization",
    ],
  },
  {
    id: "ai-digitalization",
    title: "AI & Digitalization Research",
    shortTitle: "AI & Digital",
    description:
      "Industry-specific AI intelligence grounded in real industrial use cases, validated by practitioners, and focused on what actually works in your specific industry.",
    href: "/research/ai-digitalization",
    icon: "Brain",
    deliverables: [
      "Industry-specific AI use case identification and ROI prioritization",
      "AI vendor landscape mapping for niche applications",
      "GenAI impact assessments by function and industry",
      "Digitalization maturity benchmarking against peers",
      "Industrial AI adoption studies",
      "AI ethics and governance frameworks for regulated industries",
    ],
    focusAreas: [
      "Industrial AI",
      "GenAI",
      "Digital Maturity",
      "AI Governance",
      "Predictive Maintenance",
      "Vendor Landscape",
    ],
  },
  {
    id: "technology-scouting",
    title: "Technology Scouting & Innovation Research",
    shortTitle: "Tech Scouting",
    description:
      "Help corporates identify emerging technologies, evaluate startups, and benchmark their own innovation programs with a practitioner's eye.",
    href: "/research/technology-scouting",
    icon: "Search",
    deliverables: [
      "Emerging technology assessments with TRL evaluation",
      "Innovation landscape mapping across corporates, startups, and universities",
      "Targeted startup and scaleup scouting with validated profiles",
      "Technology benchmarking against competitors",
      "University and research lab tracking",
      "Research-to-commercialization pathway analysis",
    ],
    focusAreas: [
      "Emerging Tech",
      "Startup Scouting",
      "TRL Assessment",
      "Innovation Mapping",
      "University R&D",
      "Commercialization",
    ],
  },
  {
    id: "market-intelligence",
    title: "Market & Competitive Intelligence",
    shortTitle: "Market Intel",
    description:
      "Rigorous market research at a price and speed that the big firms cannot match, informed by a practitioner who has actually sold into these markets.",
    href: "/research/market-intelligence",
    icon: "BarChart",
    deliverables: [
      "Market sizing and segmentation studies (TAM, SAM, SOM)",
      "Competitive landscape studies with detailed profiles",
      "Customer and buyer persona research",
      "Pricing intelligence across competitors",
      "Go-to-market strategy benchmarking",
      "Channel and distribution analysis",
    ],
    focusAreas: [
      "Market Sizing",
      "Competitive Analysis",
      "Buyer Personas",
      "Pricing",
      "GTM Strategy",
      "Channel Analysis",
    ],
  },
  {
    id: "patent-ip",
    title: "Patent & IP Intelligence",
    shortTitle: "Patent & IP",
    description:
      "Fast, personalized patent analytic services for mid-sized engagements where senior judgment matters more than brute-force search capacity.",
    href: "/research/patent-ip",
    icon: "FileText",
    deliverables: [
      "Patentability searches and prior art analysis",
      "Freedom-to-Operate (FTO) studies",
      "Patent landscape analysis",
      "Competitive IP portfolio analysis",
      "White space and innovation gap identification",
      "Patent-based M&A target screening",
    ],
    focusAreas: [
      "Prior Art",
      "FTO Studies",
      "Patent Landscape",
      "IP Portfolio",
      "White Space",
      "M&A Screening",
    ],
  },
  {
    id: "strategic",
    title: "Strategic & Custom Engagements",
    shortTitle: "Strategic",
    description:
      "Complex, one-off, and highly confidential research needs that senior executives bring to us -- from market entry decisions to board briefings to confidential M&A screens.",
    href: "/research/strategic",
    icon: "Target",
    deliverables: [
      "Bespoke market entry studies",
      "White papers and thought leadership research",
      "Conference content and technical research papers",
      "Executive briefings on-demand",
      "M&A target screening",
      "Custom syndicated multi-client studies",
    ],
    focusAreas: [
      "Market Entry",
      "Thought Leadership",
      "Executive Briefings",
      "M&A",
      "Custom Studies",
      "Conference Content",
    ],
  },
];

export const ENGINEERING_SERVICES: ServiceCategory[] = [
  {
    id: "workbench-adoption",
    title: "Engineering Workbench Adoption & Value Realization",
    shortTitle: "Workbench Adoption",
    description:
      "Help enterprise customers maximize ROI from their engineering standards management platforms through deployment, training, and full organizational adoption.",
    href: "/engineering/workbench-adoption",
    icon: "Layers",
    deliverables: [
      "Standards management workflow design",
      "User adoption programs and training workshops",
      "Standards portfolio optimization",
      "Compliance reporting setup and KPI dashboards",
      "Quarterly business reviews and advisory",
    ],
    focusAreas: [
      "Workflow Design",
      "Training",
      "Adoption",
      "Compliance Reporting",
      "Portfolio Optimization",
    ],
  },
  {
    id: "plm-integration",
    title: "PLM/ALM Integration Services",
    shortTitle: "PLM/ALM Integration",
    description:
      "End-to-end implementation of requirements extraction and integration with customer PLM/ALM systems for seamless engineering workflows.",
    href: "/engineering/plm-integration",
    icon: "GitMerge",
    deliverables: [
      "Requirements extraction workflow design",
      "API integration with PLM systems (Windchill, Teamcenter, Aras)",
      "API integration with ALM systems (DOORS, Jama, Codebeamer, Jira)",
      "Custom mapping of requirements to compliance frameworks",
      "Testing, validation, and user acceptance",
    ],
    focusAreas: [
      "PLM Integration",
      "ALM Integration",
      "Requirements Management",
      "API Development",
      "Compliance Mapping",
    ],
  },
  {
    id: "knowledge-management",
    title: "Knowledge Management & Semantic Search",
    shortTitle: "Knowledge Management",
    description:
      "Deploy and configure semantic search across customer knowledge bases -- patents, standards, technical literature, and internal documents.",
    href: "/engineering/knowledge-management",
    icon: "Database",
    deliverables: [
      "Knowledge source mapping and taxonomy design",
      "Semantic search configuration and connector setup",
      "Custom search profile creation per engineering discipline",
      "Integration with DMS (SharePoint, Documentum, OpenText)",
      "User training and ongoing optimization",
    ],
    focusAreas: [
      "Taxonomy Design",
      "Semantic Search",
      "DMS Integration",
      "Knowledge Mapping",
      "Search Optimization",
    ],
  },
  {
    id: "compliance-advisory",
    title: "Engineering Compliance & Standards Advisory",
    shortTitle: "Compliance Advisory",
    description:
      "Industry-specific consulting on standards compliance strategy, regulatory readiness, and engineering knowledge management.",
    href: "/engineering/compliance-advisory",
    icon: "CheckCircle",
    deliverables: [
      "Standards compliance gap analysis",
      "Regulatory readiness assessments",
      "Standards management maturity model assessments",
      "Engineering knowledge management strategy",
      "Digital transformation roadmaps",
    ],
    focusAreas: [
      "Gap Analysis",
      "Regulatory Readiness",
      "Maturity Models",
      "KM Strategy",
      "Digital Transformation",
    ],
  },
];

export const INDUSTRIES: IndustryInfo[] = [
  {
    id: "oil-gas",
    title: "Oil & Gas",
    description:
      "Deep expertise across upstream, midstream, and downstream operations with a decade of direct engagement with national oil companies and energy majors.",
    href: "/industries/oil-gas",
    icon: "Flame",
    standards: ["API", "ASME", "ASTM", "NACE", "ISO 14001"],
    clients: ["Aramco", "ADNOC", "Shell", "Chevron", "SABIC"],
  },
  {
    id: "aerospace-defense",
    title: "Aerospace & Defense",
    description:
      "Supporting mission-critical engineering with standards compliance, technology scouting, and AI adoption research.",
    href: "/industries/aerospace-defense",
    icon: "Plane",
    standards: ["MIL-STD", "DO-178C", "AS9100", "ITAR", "FAR/DFARS"],
    clients: ["Boeing", "NASA", "SpaceX", "Lockheed Martin"],
  },
  {
    id: "medical-devices",
    title: "Medical Devices",
    description:
      "Navigating complex regulatory landscapes and helping device manufacturers maintain compliance while accelerating innovation.",
    href: "/industries/medical-devices",
    icon: "Heart",
    standards: ["ISO 13485", "FDA 21 CFR Part 820", "EU MDR", "IEC 62304"],
    clients: ["Device manufacturers worldwide"],
  },
  {
    id: "manufacturing",
    title: "Manufacturing",
    description:
      "Supporting global OEMs and suppliers with quality management, process optimization, and digital transformation.",
    href: "/industries/manufacturing",
    icon: "Settings",
    standards: ["ISO 9001", "ISO 14001", "IATF 16949", "ISO 45001"],
    clients: ["Global OEMs and suppliers"],
  },
];

export const CREDENTIALS = [
  { value: "11+", label: "Years Domain Expertise" },
  { value: "65+", label: "Enterprise Relationships" },
  { value: "2x", label: "President's Club Winner" },
  { value: "4", label: "Industry Verticals" },
] as const;

export const FOOTER_LINKS = {
  research: [
    { label: "Energy Research", href: "/research/energy" },
    { label: "Standards Intelligence", href: "/research/standards" },
    { label: "AI & Digital Research", href: "/research/ai-digitalization" },
    { label: "Tech Scouting", href: "/research/technology-scouting" },
    { label: "Market Intelligence", href: "/research/market-intelligence" },
    { label: "Patent & IP", href: "/research/patent-ip" },
  ],
  engineering: [
    { label: "Workbench Adoption", href: "/engineering/workbench-adoption" },
    { label: "PLM/ALM Integration", href: "/engineering/plm-integration" },
    {
      label: "Knowledge Management",
      href: "/engineering/knowledge-management",
    },
    {
      label: "Compliance Advisory",
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
