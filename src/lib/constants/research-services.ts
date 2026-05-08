import type { ServiceCategory } from "../types";

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
    methodology: [
      {
        step: "Intelligence Requirements Definition",
        description:
          "Collaborate with the client to define precise research questions, scope boundaries, and decision context to ensure every deliverable is actionable.",
      },
      {
        step: "Multi-Source Desk Research",
        description:
          "Systematic research across proprietary databases, IEA, IRENA, IOGP, SPE resources, and industry publications to build a comprehensive evidence base.",
      },
      {
        step: "Practitioner Validation",
        description:
          "Validate findings through our established industry network of operators, engineers, and strategists to ensure real-world accuracy.",
      },
      {
        step: "Synthesis and Strategic Recommendations",
        description:
          "Distill research into clear, decision-ready recommendations with quantified scenarios and risk-adjusted assessments.",
      },
      {
        step: "Delivery Briefing and Ongoing Advisory",
        description:
          "Present findings in an executive briefing format and provide ongoing advisory support for follow-up questions and evolving needs.",
      },
    ],
    whoItsFor: [
      "VP Strategy and New Energy teams at NOCs and IOCs",
      "Corporate development teams evaluating energy transition investments",
      "Government ministries and sovereign wealth funds developing energy strategies",
      "Private equity and infrastructure funds evaluating energy assets",
    ],
    expectedOutcomes: [
      {
        title: "Decision-Ready Intelligence",
        description:
          "Comprehensive research documents structured for executive decision-making, not academic reading.",
      },
      {
        title: "Quantified Market Sizing",
        description:
          "Market sizing with full source transparency and methodology disclosure so you can defend the numbers internally.",
      },
      {
        title: "Strategic Recommendations",
        description:
          "Actionable recommendations backed by practitioner experience and validated against real-world operational realities.",
      },
      {
        title: "Ongoing Advisory",
        description:
          "Continued access to the research team for follow-up questions, scenario updates, and evolving market conditions.",
      },
    ],
    sampleProjects: [
      {
        title: "Green Hydrogen Market Entry Assessment",
        industry: "Energy",
        scope:
          "Mapping market sizing, competitor landscape, and regulatory environment for a GCC NOC entering hydrogen",
        duration: "6 weeks",
      },
      {
        title: "Renewable Energy Standards Landscape",
        industry: "Energy",
        scope:
          "Mapping applicable IEC/ISO standards for a solar+storage developer",
        duration: "4 weeks",
      },
      {
        title: "Energy Transition Investment Thesis",
        industry: "Finance",
        scope:
          "Sector-by-sector analysis for a PE fund's energy portfolio",
        duration: "8 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Single Study",
        description: "One-time focused research engagement delivering a comprehensive report on a defined topic.",
        typicalDuration: "4-8 weeks",
      },
      {
        model: "Retained Advisory",
        description: "Ongoing monthly deliverables with quarterly retainer providing continuous intelligence coverage.",
        typicalDuration: "Quarterly retainer",
      },
      {
        model: "Embedded Analyst",
        description: "Dedicated research capacity embedded within your team, operating as an extension of your strategy function.",
        typicalDuration: "Ongoing",
      },
    ],
    differentiators: [
      "CERAWeek speaker and ministerial panel moderator -- embedded in the energy intelligence community",
      "25+ years across industry, technology, and AI -- trained in institutional-grade research methodology",
      "Published author on Cognitive AI in energy (SAE International)",
      "Direct relationships with Aramco, ADNOC, Shell, and Chevron built over a decade",
    ],
    tldr: [
      "Decision-ready energy research for GCC + India — hydrogen, CCUS, energy transition, digitalisation.",
      "Senior practitioner depth: 25+ years across S&P Global, IHS Markit, GE Energy, Accuris.",
      "30–50% of Tier-1 consultancy cost; 4–8 week typical engagement.",
      "Reference engagements with Aramco, ADNOC, Shell, Chevron, Honeywell.",
    ],
    faqs: [
      {
        q: "How is intelle.io different from Tier-1 consultancies for energy research?",
        a: "Tier-1 firms staff energy research with junior analysts using templates. We deliver senior-practitioner work end-to-end — every deliverable is led by a 25-year domain practitioner with direct NOC and EPC relationships. Output quality is comparable; cost is 30–50% lower; turnaround is a quarter of theirs.",
      },
      {
        q: "Do you cover both GCC and India energy markets?",
        a: "Yes. Our energy research covers GCC (Saudi, UAE, Qatar, Kuwait, Oman, Bahrain) and India explicitly — including hydrogen, CCUS, renewables, oil & gas digitalisation, and the energy transition. We have reference engagements across both regions.",
      },
      {
        q: "What is a typical energy research engagement scope and duration?",
        a: "Most energy engagements run 4–8 weeks: a 2-week scoping memo, 4–6 weeks of primary + secondary research with 15–25 expert interviews, and a final decision-ready briefing. Bespoke scopes (board briefings, M&A diligence) can be 2–14 weeks.",
      },
      {
        q: "Can you support hydrogen and CCUS investment decisions?",
        a: "Yes — hydrogen offtake economics, CCUS feasibility, technology vendor scouting, and standards landscape mapping (ISO/TC 197, IEC/TC 105) are core capabilities. We have published research on Cognitive AI in energy and have direct relationships with major hydrogen ecosystem players.",
      },
      {
        q: "Do you serve mid-tier EPCs or only major NOCs?",
        a: "Both. We deliberately serve mid-tier EPCs and industrial scale-ups who can't afford Tier-1 fees but need decision-grade intelligence. NOC innovation arms get the same senior-led work; the engagement shape adapts to scope.",
      },
    ],
  },
  {
    id: "standards",
    title: "Standards & Regulations",
    shortTitle: "Standards & Regulations",
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
    methodology: [
      {
        step: "Standards Inventory and Requirements Mapping",
        description:
          "Catalog all potentially applicable standards based on product type, target markets, and regulatory jurisdiction.",
      },
      {
        step: "Regulatory Horizon Scanning",
        description:
          "Systematic scanning across SDOs (ISO, IEC, ASTM, API, ASME) to identify new, revised, and upcoming standards that may impact your operations.",
      },
      {
        step: "Gap Analysis",
        description:
          "Detailed gap analysis against internal processes and documentation to identify compliance shortfalls and redundancies.",
      },
      {
        step: "Compliance Roadmap",
        description:
          "Develop a prioritized compliance roadmap with actions sequenced by regulatory risk, business impact, and implementation complexity.",
      },
      {
        step: "Implementation Support and Ongoing Monitoring",
        description:
          "Hands-on support during implementation and continuous monitoring for standards revisions and new regulatory developments.",
      },
    ],
    whoItsFor: [
      "Engineering managers responsible for standards compliance",
      "Regulatory affairs teams in medical devices, aerospace, and energy",
      "Product managers entering new regulated markets",
      "Quality directors overseeing multi-site operations",
    ],
    expectedOutcomes: [
      {
        title: "Complete Standards Landscape Maps",
        description:
          "Comprehensive maps of all applicable standards with applicability assessments tailored to your specific products and markets.",
      },
      {
        title: "Prioritized Compliance Roadmaps",
        description:
          "Actionable compliance roadmaps tied to your business timelines, not generic checklists.",
      },
      {
        title: "Harmonized Standards Libraries",
        description:
          "Consolidated standards libraries that reduce redundancy and ensure consistent application across sites and geographies.",
      },
      {
        title: "Regulatory Horizon Visibility",
        description:
          "Forward-looking visibility into regulatory changes 12-24 months ahead, enabling proactive rather than reactive compliance.",
      },
    ],
    sampleProjects: [
      {
        title: "Multi-Geography Standards Harmonization",
        industry: "Oil & Gas",
        scope:
          "Harmonizing API/ASME/EN standards across 5 operating regions",
        duration: "8 weeks",
      },
      {
        title: "EU MDR Compliance Roadmap",
        industry: "Medical Devices",
        scope:
          "Mapping Class IIa/IIb portfolio against EU MDR requirements",
        duration: "6 weeks",
      },
      {
        title: "MIL-STD Compliance Matrix",
        industry: "Aerospace & Defense",
        scope:
          "Identifying applicable military standards for a new vehicle platform",
        duration: "4 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Standards Assessment",
        description: "Focused assessment of applicable standards for a specific product, market, or regulatory question.",
        typicalDuration: "2-4 weeks",
      },
      {
        model: "Full Compliance Program",
        description: "End-to-end compliance program covering gap analysis, roadmap development, and implementation support.",
        typicalDuration: "2-4 months",
      },
      {
        model: "Ongoing Monitoring Retainer",
        description: "Continuous monitoring of standards revisions and regulatory changes with quarterly update reports.",
        typicalDuration: "Quarterly updates",
      },
    ],
    differentiators: [
      "Deep experience inside the world's leading standards intelligence platforms -- understanding how standards bodies operate, not just what they publish",
      "Deep knowledge of how standards bodies operate -- not just what they publish",
      "Practitioner who understands the engineering context behind every standard",
      "Experience across 700+ API standards, ISO/IEC catalogs, and MIL-STD libraries",
    ],
    tldr: [
      "Senior-led standards research: API, ASME, ISO, IEC, MIL-STD, FDA, EU MDR.",
      "MoIAT / SASO / ESMA harmonisation for cross-jurisdiction GCC operations.",
      "Mid-tier EPC bid support and NOC tender preparation as a regular delivery shape.",
      "2-week Standards Landscape Scan: $15–25k. Full advisory retainer available.",
    ],
    faqs: [
      {
        q: "Which standards bodies do you cover?",
        a: "API, ASME, ISO, IEC, MIL-STD, FDA, EU MDR, and the GCC national bodies (MoIAT in UAE, SASO in Saudi, ESMA in UAE). We also cover IEC 62304 (software-as-medical-device), DO-178C (avionics software), and AS9100 (aerospace QMS).",
      },
      {
        q: "What is a Standards Landscape Scan?",
        a: "A 2-week diagnostic that maps every standard applicable to a specific product, jurisdiction, or tender response — with revision currency, gap analysis vs. internal procedures, and procurement-ready compliance evidence. Typical fee: $15–25k.",
      },
      {
        q: "Can you help with NOC tender preparation?",
        a: "Yes. Mid-tier EPCs bidding into Aramco, ADNOC, QatarEnergy, or Adnoc Sour Gas tenders use us to translate the tender's standards requirements into a compliance matrix the bid team can act on. Typical engagement: 4–6 weeks.",
      },
      {
        q: "Do you provide ongoing standards advisory?",
        a: "Yes. Our Standards Advisory Retainer ([engineering/compliance-advisory](/engineering/compliance-advisory)) puts a senior standards architect on-call for ongoing questions, currency monitoring, and cross-functional standards governance. Pricing band: $5–15k/month.",
      },
      {
        q: "How do you handle standards harmonisation across GCC + EU + US?",
        a: "We map each product's compliance posture across jurisdictions in parallel: identify equivalent clauses, flag genuine divergences, and produce a single source-of-truth document the engineering, QA, legal, and procurement teams can all act on.",
      },
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
    methodology: [
      {
        step: "AI Readiness Assessment and Use Case Inventory",
        description:
          "Evaluate current digital maturity and catalog potential AI use cases across operations, engineering, and business functions.",
      },
      {
        step: "Vendor and Technology Landscape Analysis",
        description:
          "Map the relevant vendor ecosystem, comparing capabilities, pricing, deployment models, and real customer references.",
      },
      {
        step: "Practitioner Validation",
        description:
          "Validate findings against real industrial deployments through our practitioner network, separating vendor claims from operational reality.",
      },
      {
        step: "ROI Modeling and Implementation Prioritization",
        description:
          "Build business cases with realistic ROI projections and prioritize use cases by value, feasibility, and organizational readiness.",
      },
      {
        step: "Strategic Recommendations with Risk Assessment",
        description:
          "Deliver actionable recommendations including implementation risks, governance requirements, and change management considerations.",
      },
    ],
    whoItsFor: [
      "CIOs and CTOs evaluating enterprise AI investments",
      "Innovation teams tasked with piloting AI/ML in operations",
      "Engineering leaders exploring GenAI for technical documentation",
      "Board members requiring AI strategy briefings",
    ],
    expectedOutcomes: [
      {
        title: "Validated AI Use Case Portfolio",
        description:
          "A ranked portfolio of AI use cases prioritized by ROI and feasibility, grounded in evidence from real deployments.",
      },
      {
        title: "Vendor Shortlists Based on Evidence",
        description:
          "Vendor shortlists based on real deployment evidence, not marketing materials or analyst quadrants.",
      },
      {
        title: "Digital Maturity Benchmarks",
        description:
          "Objective benchmarking of your digital maturity against industry peers with specific improvement recommendations.",
      },
      {
        title: "Realistic Implementation Timelines",
        description:
          "Honest, realistic implementation timelines not driven by vendor hype or unrealistic expectations.",
      },
    ],
    sampleProjects: [
      {
        title: "AI Use Case Prioritization",
        industry: "Oil & Gas",
        scope:
          "Identifying high-value AI applications in downstream operations",
        duration: "6 weeks",
      },
      {
        title: "GenAI Impact Assessment",
        industry: "Manufacturing",
        scope:
          "Evaluating GenAI applications for engineering documentation and quality processes",
        duration: "4 weeks",
      },
      {
        title: "Digital Maturity Benchmarking",
        industry: "Energy",
        scope:
          "Benchmarking digital capabilities against 12 industry peers",
        duration: "8 weeks",
      },
    ],
    engagementModels: [
      {
        model: "AI Strategy Brief",
        description: "Rapid assessment of AI opportunities and risks tailored to your industry and operational context.",
        typicalDuration: "2 weeks",
      },
      {
        model: "Comprehensive AI Study",
        description: "Deep-dive research covering use cases, vendors, ROI modeling, and implementation roadmap.",
        typicalDuration: "4-8 weeks",
      },
      {
        model: "Quarterly AI Intelligence Retainer",
        description: "Ongoing monitoring of AI developments, vendor movements, and emerging use cases relevant to your industry.",
        typicalDuration: "Ongoing quarterly",
      },
    ],
    differentiators: [
      "Published author on 'Intelligent Energy: Cognitive AI' (SAE International) -- not just researching AI, building it",
      "Hands-on experience building AI workflows including semantic search and knowledge extraction for enterprise engineering platforms",
      "Focus on what actually works in industrial environments, not what sounds impressive in demos",
      "Grounded in regulated industry realities -- AI governance, auditability, and compliance",
    ],
    tldr: [
      "Senior-led industrial AI and GenAI research — corpus prep first, model second.",
      "AI Readiness Brief: 2-week diagnostic, $20–30k. 90-Day Pilot Scope: 4-step playbook.",
      "23-Question Industrial AI Vendor Diagnostic: lead-magnet evaluator, free.",
      "SAE-published author on Cognitive AI in industrial operations.",
      "We refuse scopes where a wrong answer is unbounded (sizing, structural margins, control narratives). Fluency ≠ competence.",
    ],
    faqs: [
      {
        q: "What is an AI Readiness Brief?",
        a: "A 2-week diagnostic that assesses whether an engineering organisation can run a successful GenAI pilot. We audit corpus quality, workflow fit, success-metric clarity, and organisational readiness — then deliver a kill/scope/proceed recommendation. Typical fee: $20–30k.",
      },
      {
        q: "How does your 90-day pilot scoping work?",
        a: "Four phases: weeks 1–2 scope compression (one document class, one decision, one named user); weeks 3–6 corpus preparation (clean, chunk, tag, build evaluation set); weeks 7–10 retrieval system + thin UI inside the workflow tool; weeks 11–13 supervised pilot with 5–15 named engineers and a daily feedback loop.",
      },
      {
        q: "Where does GenAI actually work in engineering?",
        a: "Standards traceability (60–75% time-to-clause reductions when corpus is prepared correctly), engineering knowledge search and reuse, template-driven document generation (ITPs, MOCs, deviation reports), predictive-maintenance reasoning layers, and patent triage. Most other claims should be treated as marketing.",
      },
      {
        q: "Where do you refuse to play?",
        a: "Anywhere a wrong answer is unbounded — sizing relief valves, structural margins, control narratives. Plausibility is not correctness. We also decline horizontal 'AI co-pilot for engineers' scopes (too broad, no workflow to anchor adoption) and unstructured analogue corpus work (hand-drawn isometrics, marked-up 1990s drawings) until document AI matures.",
      },
      {
        q: "Do I need to fix my corpus before doing AI?",
        a: "Yes — and this is the single biggest determinant of success. GenAI pilots in engineering rise or fall on corpus quality, not model quality. A retrieval-ready corpus needs clean text extraction, semantic chunking, metadata tagging, controlled vocabulary, and an evaluation set of real engineering queries. 6–12 weeks for a 50,000-document archive.",
      },
      {
        q: "Which models / vendors do you recommend?",
        a: "Vendor-neutral. We work with Claude, GPT, Gemini, and 70B open-weights fine-tunes. The model is rarely the bottleneck — it's the corpus, the workflow integration, and the success metric. We help you evaluate vendors against your specific use case using our 23-Question Industrial AI Vendor Diagnostic.",
      },
      {
        q: "How do you measure pilot success?",
        a: "Adoption by unprompted reuse, not satisfaction surveys. If engineers are not coming back to the tool of their own accord by week three, the tool is not working — regardless of survey scores. We also track time-to-answer, citation accuracy, and decision velocity for the named user group.",
      },
      {
        q: "How is this different from McKinsey/BCG industrial AI work?",
        a: "Tier-1 firms staff industrial AI with consultants who have read about industrial AI. We staff with practitioners who have built industrial AI. The deliverable is not a slide deck — it's a corpus, a retrieval system inside your workflow tool, and an evaluation set you own forever. Cost is 30–50% of theirs.",
      },
    ],
  },
  {
    id: "technology-scouting",
    title: "Technology Scouting",
    shortTitle: "Technology Scouting",
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
    methodology: [
      {
        step: "Innovation Requirements and Technology Thesis Definition",
        description:
          "Work with the client to define the innovation thesis, technology requirements, and evaluation criteria for scouting.",
      },
      {
        step: "Systematic Landscape Scanning",
        description:
          "Scan across corporates, startups, universities, and research labs using structured databases, patent filings, and industry networks.",
      },
      {
        step: "TRL-Based Evaluation and Shortlisting",
        description:
          "Evaluate identified technologies using Technology Readiness Level frameworks, filtering for maturity, fit, and commercial viability.",
      },
      {
        step: "Validated Profiles with Contact Paths",
        description:
          "Develop detailed profiles of shortlisted technologies and companies, including validated contact paths for engagement.",
      },
      {
        step: "Match-Making Support and Engagement Facilitation",
        description:
          "Facilitate introductions and support initial engagement between the client and identified technology partners.",
      },
    ],
    whoItsFor: [
      "Corporate venturing and innovation teams at large enterprises",
      "R&D directors scouting for external technology partners",
      "Defense primes evaluating dual-use commercial technologies",
      "Private equity firms conducting technology due diligence",
    ],
    expectedOutcomes: [
      {
        title: "Curated Technology Shortlists",
        description:
          "Shortlists of technologies with TRL assessment, timeline to deployment, and strategic fit evaluation.",
      },
      {
        title: "Innovation Landscape Maps",
        description:
          "Visual and analytical maps showing competitive positioning of technologies, players, and investment trends.",
      },
      {
        title: "Validated Startup Profiles",
        description:
          "Startup profiles with financial and technical due diligence, not just marketing summaries.",
      },
      {
        title: "Partnership and Licensing Opportunities",
        description:
          "Identification of research partnership and licensing opportunities aligned with the client's innovation strategy.",
      },
    ],
    sampleProjects: [
      {
        title: "Carbon Capture Technology Scouting",
        industry: "Energy",
        scope:
          "Identifying 20 startups working on DAC and point-source capture",
        duration: "6 weeks",
      },
      {
        title: "Autonomous Systems Startup Scan",
        industry: "Aerospace & Defense",
        scope:
          "Scouting commercial autonomous capabilities for defense applications",
        duration: "8 weeks",
      },
      {
        title: "Advanced Materials Innovation Map",
        industry: "Manufacturing",
        scope:
          "Mapping R&D landscape for lightweight composites across universities and startups",
        duration: "4 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Targeted Scout",
        description: "Focused search on a specific technology domain or capability gap with curated shortlist delivery.",
        typicalDuration: "4-6 weeks",
      },
      {
        model: "Innovation Landscape Study",
        description: "Comprehensive multi-domain mapping covering technologies, players, patents, and investment trends.",
        typicalDuration: "8-12 weeks",
      },
      {
        model: "Continuous Scouting Retainer",
        description: "Ongoing quarterly scans of evolving technology landscapes with updated shortlists and alerts.",
        typicalDuration: "Ongoing quarterly",
      },
    ],
    differentiators: [
      "Practitioner network spanning corporates, startups, and research institutions across 4 industries",
      "TRL-grounded assessments, not hype-cycle positioning",
      "Direct experience evaluating hundreds of technology vendors across enterprise engineering and energy sectors",
      "Understand both the technology and the commercial viability",
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
    methodology: [
      {
        step: "Research Scope and Intelligence Requirements Definition",
        description:
          "Define the specific market questions, competitive gaps, and decision context to ensure research is directly actionable.",
      },
      {
        step: "Multi-Source Data Collection",
        description:
          "Collect data from public filings, industry databases, expert interviews, and proprietary sources to build a comprehensive market picture.",
      },
      {
        step: "Analysis and Synthesis with Competitive Frameworks",
        description:
          "Apply proven competitive analysis frameworks to synthesize data into strategic insights with clear implications.",
      },
      {
        step: "Executive-Ready Deliverables",
        description:
          "Package findings into executive-ready formats with strategic implications, not raw data dumps.",
      },
      {
        step: "Follow-Up Briefing and Q&A",
        description:
          "Deliver findings through a live briefing with dedicated Q&A to ensure full understanding and alignment on next steps.",
      },
    ],
    whoItsFor: [
      "Product managers launching in new markets or segments",
      "Corporate strategy teams evaluating M&A or partnership opportunities",
      "Sales leaders needing competitive battle cards and pricing intelligence",
      "Founders and CxOs preparing investor decks or board presentations",
    ],
    expectedOutcomes: [
      {
        title: "Actionable Market Sizing",
        description:
          "Market sizing with transparent methodology and clear source documentation so you can defend the numbers to your board.",
      },
      {
        title: "Competitive Profiles with Strategic Insight",
        description:
          "Competitor profiles that go beyond public data to reveal real strategic positioning, strengths, and vulnerabilities.",
      },
      {
        title: "Buyer Persona Research",
        description:
          "Buyer persona research grounded in practitioner knowledge of how these markets actually buy, not theoretical frameworks.",
      },
      {
        title: "Pricing and Packaging Intelligence",
        description:
          "Pricing and packaging intelligence informed by direct market experience, not just publicly available list prices.",
      },
    ],
    sampleProjects: [
      {
        title: "Competitive Landscape Study",
        industry: "SaaS/Enterprise Software",
        scope:
          "Detailed profiles of 12 competitors including GTM strategy and customer references",
        duration: "6 weeks",
      },
      {
        title: "Market Entry Study",
        industry: "Energy Services",
        scope:
          "Regulations, competitors, channels, and pricing for entering the Saudi Arabian market",
        duration: "8 weeks",
      },
      {
        title: "TAM/SAM/SOM Analysis",
        industry: "Industrial IoT",
        scope:
          "Market sizing for predictive maintenance solutions in process industries",
        duration: "4 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Single Market Study",
        description: "One-time focused market research engagement delivering a comprehensive report on a defined market question.",
        typicalDuration: "4-6 weeks",
      },
      {
        model: "Competitive Intelligence Package",
        description: "Quarterly updates tracking 5-15 competitors with profiles, movements, and strategic implications.",
        typicalDuration: "Quarterly updates",
      },
      {
        model: "Strategic Advisory Retainer",
        description: "Ongoing market monitoring and executive briefings covering market shifts, competitive moves, and emerging opportunities.",
        typicalDuration: "Monthly ongoing",
      },
    ],
    differentiators: [
      "Former enterprise sales leader -- has actually sold into these markets, not just researched them",
      "Practitioner who has directly sold into and served these markets -- understands buyer behavior from experience",
      "Delivers at a speed and price point that Gartner, Frost & Sullivan, and McKinsey cannot match",
      "Practitioner-led analysis, not junior-analyst-produced reports",
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
    methodology: [
      {
        step: "Patent Search Strategy and Classification Mapping",
        description:
          "Define search strategy including IPC/CPC classification codes, keyword taxonomies, and jurisdictional scope.",
      },
      {
        step: "Systematic Prior Art and Landscape Search",
        description:
          "Conduct systematic searches across USPTO, EPO, WIPO, and national patent offices using structured search protocols.",
      },
      {
        step: "Patent Family Analysis and Citation Mapping",
        description:
          "Analyze patent families, forward/backward citations, and filing patterns to reveal competitive strategies and technology trajectories.",
      },
      {
        step: "Strategic Interpretation and Competitive Implications",
        description:
          "Interpret patent data through a strategic lens, connecting filing patterns to business decisions and competitive positioning.",
      },
      {
        step: "Actionable Recommendations for IP Strategy",
        description:
          "Deliver specific recommendations for IP portfolio strategy, freedom-to-operate decisions, and innovation investment priorities.",
      },
    ],
    whoItsFor: [
      "IP counsel and patent attorneys managing portfolio strategy",
      "R&D directors assessing freedom-to-operate for new products",
      "Corporate development teams evaluating M&A targets by IP strength",
      "CTO offices monitoring competitive technology bets through patent filings",
    ],
    expectedOutcomes: [
      {
        title: "Decision-Ready Patent Landscape Maps",
        description:
          "Visual and analytical patent landscape maps with key player analysis, technology clustering, and filing trend visualization.",
      },
      {
        title: "Freedom-to-Operate Assessments",
        description:
          "FTO assessments with clear risk ratings and recommendations for design-around strategies where needed.",
      },
      {
        title: "White Space Identification",
        description:
          "Identification of under-patented innovation opportunities revealing where competitors have not yet staked claims.",
      },
      {
        title: "Competitive IP Portfolio Comparisons",
        description:
          "Side-by-side IP portfolio comparisons revealing strategic intent, investment priorities, and technology bets of key competitors.",
      },
    ],
    sampleProjects: [
      {
        title: "Patent Landscape Analysis",
        industry: "Autonomous Vehicles",
        scope:
          "Mapping 5,000+ patents in LiDAR and sensor fusion across 15 key players",
        duration: "6 weeks",
      },
      {
        title: "FTO Study for a Medical Device",
        industry: "Medical Devices",
        scope:
          "Assessing freedom-to-operate for a new surgical robot in US, EU, and Japan",
        duration: "4 weeks",
      },
      {
        title: "IP Portfolio Valuation Support",
        industry: "Energy",
        scope:
          "Evaluating patent strength of 3 M&A targets in hydrogen electrolysis",
        duration: "3 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Standard Patent Search",
        description: "Focused patent search on a specific technology, product, or freedom-to-operate question.",
        typicalDuration: "2-4 weeks",
      },
      {
        model: "Comprehensive Landscape Analysis",
        description: "Deep-dive analysis covering 5,000+ patents with landscape mapping, citation analysis, and competitive profiling.",
        typicalDuration: "6-8 weeks",
      },
      {
        model: "Ongoing IP Monitoring",
        description: "Quarterly tracking of competitor patent filings, new grants, and emerging technology trends in your domain.",
        typicalDuration: "Ongoing quarterly",
      },
    ],
    differentiators: [
      "Senior judgment on every engagement -- not outsourced to junior analysts or automated tools",
      "Cross-industry patent expertise spanning energy, aerospace, medical devices, and manufacturing",
      "Strategic interpretation that connects patent data to business decisions",
      "Fast turnaround for mid-sized engagements that large IP firms deprioritize",
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
    methodology: [
      {
        step: "Confidential Scoping and NDA Execution",
        description:
          "Engage under strict confidentiality with NDA execution before any substantive discussion, protecting sensitive strategic intent.",
      },
      {
        step: "Rapid Research Mobilization",
        description:
          "Mobilize research resources within 48-72 hours of engagement start, delivering first insights rapidly to inform early decisions.",
      },
      {
        step: "Iterative Delivery with Client Feedback Loops",
        description:
          "Deliver research in iterative cycles, incorporating client feedback to refine scope and sharpen strategic relevance.",
      },
      {
        step: "Final Synthesis and Executive Presentation",
        description:
          "Synthesize all research into a board-ready executive presentation with clear strategic recommendations and supporting evidence.",
      },
      {
        step: "Post-Engagement Advisory Support",
        description:
          "Provide ongoing advisory support after formal delivery for follow-up questions, scenario updates, and strategic pivots.",
      },
    ],
    whoItsFor: [
      "C-suite executives preparing for board meetings or investor calls",
      "Private equity partners evaluating deal flow in engineering/energy sectors",
      "Corporate development teams conducting confidential market screens",
      "Government and sovereign wealth fund strategists",
    ],
    expectedOutcomes: [
      {
        title: "Board-Ready Briefing Materials",
        description:
          "Polished briefing materials structured for board-level consumption on specific strategic questions.",
      },
      {
        title: "Confidential M&A Screens",
        description:
          "Confidential M&A screens with qualified target profiles, including financial, technical, and strategic fit assessment.",
      },
      {
        title: "Thought Leadership Content",
        description:
          "White papers and thought leadership content published under the client's brand, grounded in rigorous research.",
      },
      {
        title: "Conference-Ready Technical Content",
        description:
          "Conference-ready technical content grounded in practitioner expertise, suitable for industry keynotes and panel discussions.",
      },
    ],
    sampleProjects: [
      {
        title: "Confidential M&A Target Screen",
        industry: "Private Equity",
        scope:
          "Screening and qualifying 25 acquisition candidates in industrial software",
        duration: "4 weeks",
      },
      {
        title: "Executive Briefing Package",
        industry: "Energy",
        scope:
          "5-day deep dive preparing CEO for a ministerial meeting on hydrogen policy",
        duration: "1 week",
      },
      {
        title: "Thought Leadership White Paper",
        industry: "Engineering Services",
        scope:
          "Researched and written for a Fortune 500 client to publish under their brand",
        duration: "6 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Executive Briefing",
        description: "Rapid deep-dive research delivering board-ready briefing materials on a focused strategic question.",
        typicalDuration: "3-5 days",
      },
      {
        model: "Strategic Study",
        description: "Bespoke research engagement tailored to complex, multi-faceted strategic questions requiring comprehensive analysis.",
        typicalDuration: "4-8 weeks",
      },
      {
        model: "Retained Strategist",
        description: "Ongoing monthly advisory providing continuous strategic intelligence and executive-level counsel.",
        typicalDuration: "Monthly ongoing",
      },
    ],
    differentiators: [
      "CERAWeek speaker and moderator -- credibility at the highest levels of energy leadership",
      "Published technical author -- can produce conference-quality content",
      "Confidentiality and discretion built into every engagement",
      "Rapid mobilization -- first insights within 48-72 hours of engagement start",
    ],
  },
];
