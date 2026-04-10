import type { ServiceCategory } from "../types";

export const ENGINEERING_SERVICES: ServiceCategory[] = [
  // ---------------------------------------------------------------------------
  // 1. Adoption & Value Realization
  // ---------------------------------------------------------------------------
  {
    id: "workbench-adoption",
    title: "Adoption & Value Realization",
    shortTitle: "Adoption & Value Realization",
    description:
      "Turn your standards management and engineering intelligence investments into measurable value through structured adoption programs, workflow optimization, and usage analytics. We bridge the gap between platform purchase and daily engineering usage, ensuring every license translates into real productivity gains.",
    href: "/engineering/workbench-adoption",
    icon: "Layers",
    deliverables: [
      "Adoption strategy and implementation roadmap",
      "Usage analytics dashboard and KPI framework",
      "Role-based training programs and materials",
      "Workflow optimization documentation",
      "ROI analysis and executive summary report",
    ],
    focusAreas: [
      "User adoption and change management",
      "Workflow integration with engineering processes",
      "Standards portfolio optimization",
      "Usage analytics and ROI measurement",
      "Training program design and delivery",
    ],
    methodology: [
      {
        step: "Current State Assessment",
        description:
          "Review platform usage analytics, license utilization, and existing workflows to establish an adoption baseline and identify quick wins.",
      },
      {
        step: "Stakeholder Interviews & Pain Point Mapping",
        description:
          "Conduct structured interviews with engineers, standards managers, and leadership to map pain points, uncover workflow friction, and understand organizational readiness.",
      },
      {
        step: "Workflow Redesign & Optimization",
        description:
          "Redesign engineering workflows to embed standards access at the point of need, removing manual steps and aligning platform capabilities with how engineers actually work.",
      },
      {
        step: "Training Program Development & Delivery",
        description:
          "Build role-based training curricula -- from occasional users to power users -- and deliver workshops, e-learning modules, and quick-reference guides.",
      },
      {
        step: "Adoption Metrics Tracking & Continuous Optimization",
        description:
          "Deploy adoption dashboards, track leading and lagging indicators, and run continuous optimization cycles to sustain and grow platform usage over time.",
      },
    ],
    whoItsFor: [
      "Engineering teams that have purchased standards management platforms but aren't seeing ROI",
      "Standards managers struggling with low user adoption rates",
      "Engineering VPs seeking justification for continued investment in standards tools",
      "IT teams integrating standards platforms with existing engineering systems",
    ],
    expectedOutcomes: [
      {
        title: "Increased Platform Adoption",
        description:
          "Measurable increase in platform adoption and daily active users, moving from shelfware to an indispensable engineering tool.",
      },
      {
        title: "Optimized Engineering Workflows",
        description:
          "Optimized workflows that embed standards into existing engineering processes, reducing time-to-access and eliminating manual workarounds.",
      },
      {
        title: "Reduced Compliance Risk",
        description:
          "Reduced standards currency drift and compliance risk through automated alerts, subscription optimization, and proactive governance.",
      },
      {
        title: "Executive-Ready ROI Reporting",
        description:
          "Executive-ready ROI reports demonstrating platform value in terms of time saved, risk reduced, and cost avoided.",
      },
    ],
    sampleProjects: [
      {
        title: "Enterprise-Wide Adoption Program",
        industry: "Oil & Gas",
        scope:
          "Deploying standards management across 8 engineering disciplines at a major operator, including workflow redesign, training delivery, and adoption tracking",
        duration: "12 weeks",
      },
      {
        title: "Standards Portfolio Optimization",
        industry: "Manufacturing",
        scope:
          "Auditing 2,000+ standard subscriptions against actual engineering usage to eliminate waste, close gaps, and right-size the portfolio",
        duration: "4 weeks",
      },
      {
        title: "Compliance Dashboard Implementation",
        industry: "Aerospace",
        scope:
          "Setting up automated compliance tracking and reporting for 5 program teams, integrating with existing PLM and document management systems",
        duration: "6 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Discovery & Assessment",
        description:
          "Focused assessment of current adoption state, usage analytics review, and prioritized recommendations for quick wins and long-term improvement.",
        typicalDuration: "2-3 weeks",
      },
      {
        model: "Full Adoption Program",
        description:
          "End-to-end adoption engagement covering assessment, workflow redesign, training development and delivery, and ongoing optimization.",
        typicalDuration: "3-6 months",
      },
      {
        model: "Monthly Retainer",
        description:
          "Ongoing optimization and support including usage monitoring, new user onboarding, workflow refinement, and quarterly business reviews.",
        typicalDuration: "Ongoing monthly",
      },
    ],
    differentiators: [
      "25+ years at the intersection of industry, technology, and AI -- from GE Energy and Dell-EMC to engineering intelligence platforms",
      "2x President's Club winner for measurable customer impact and adoption outcomes",
      "Direct experience serving 65+ enterprise engineering organizations across 4 industries",
      "Deep understanding of both the technology and the organizational change management required for successful adoption",
    ],
    implementationTimeline: [
      {
        phase: "Discovery & Assessment",
        duration: "2-3 weeks",
        description:
          "Current state analysis, usage analytics review, stakeholder interviews, and baseline adoption metrics.",
      },
      {
        phase: "Workflow Design",
        duration: "2-4 weeks",
        description:
          "Process mapping, gap identification, workflow optimization, and integration architecture for existing engineering tools.",
      },
      {
        phase: "Configuration & Training",
        duration: "4-6 weeks",
        description:
          "Platform configuration, training material development, workshop delivery, and role-based onboarding programs.",
      },
      {
        phase: "Go-Live & Optimization",
        duration: "Ongoing",
        description:
          "Adoption monitoring, user support, continuous improvement cycles, and quarterly business reviews.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Requirements Digitalization
  // ---------------------------------------------------------------------------
  {
    id: "plm-integration",
    title: "Requirements Digitalization",
    shortTitle: "Requirements Digitalization",
    description:
      "Connect standards requirements to your product lifecycle and application lifecycle management systems with bi-directional integrations that maintain traceability from regulation through verification. We build the connectors, data mappings, and automated workflows that make compliance evidence a by-product of normal engineering work.",
    href: "/engineering/plm-integration",
    icon: "GitMerge",
    deliverables: [
      "Integration architecture and API specification document",
      "Custom connectors and data mapping configurations",
      "Bi-directional sync engine between standards and PLM/ALM",
      "Requirements traceability matrix templates",
      "Deployment runbook and operational documentation",
    ],
    focusAreas: [
      "Requirements traceability across systems",
      "Bi-directional data synchronization",
      "Compliance evidence automation",
      "API development and system integration",
      "Certification-ready audit trails",
    ],
    methodology: [
      {
        step: "Requirements Gathering & System Architecture Review",
        description:
          "Document integration requirements, review existing system architectures, and map data flows between standards management, PLM, and ALM systems.",
      },
      {
        step: "Integration Architecture Design & API Specification",
        description:
          "Design the integration architecture, define API contracts, specify data mappings, and establish sync rules for bi-directional traceability.",
      },
      {
        step: "Development, Unit Testing & Integration Testing",
        description:
          "Build custom connectors, implement data transformations, and execute rigorous unit and integration testing against representative datasets.",
      },
      {
        step: "User Acceptance Testing & Stakeholder Sign-Off",
        description:
          "Conduct structured UAT with engineering and compliance stakeholders, validate traceability chains, and secure formal sign-off before deployment.",
      },
      {
        step: "Production Deployment, Documentation & Handover",
        description:
          "Deploy to production, deliver comprehensive documentation including runbooks and troubleshooting guides, and conduct knowledge transfer to the operations team.",
      },
    ],
    whoItsFor: [
      "Engineering organizations needing to trace standards requirements through design and verification",
      "PLM administrators integrating requirements management with product lifecycle tools",
      "Compliance teams needing automated requirements traceability for certification evidence",
      "Program managers on DO-178C, ISO 26262, or MIL-STD programs requiring formal traceability",
    ],
    expectedOutcomes: [
      {
        title: "Automated Bi-Directional Sync",
        description:
          "Automated bi-directional sync between standards requirements and PLM/ALM systems, eliminating manual data entry and transcription errors.",
      },
      {
        title: "Full Requirements Traceability",
        description:
          "Full requirements traceability from regulation through design, implementation, and verification -- visible in a single pane of glass.",
      },
      {
        title: "Reduced Manual Compliance Effort",
        description:
          "Reduced manual effort in compliance evidence generation, turning weeks of audit preparation into hours of automated report generation.",
      },
      {
        title: "Audit-Ready Traceability Matrices",
        description:
          "Audit-ready traceability matrices generated on demand, satisfying DER, notified body, and customer audit requirements.",
      },
    ],
    sampleProjects: [
      {
        title: "PLM Integration for Requirements Traceability",
        industry: "Aerospace",
        scope:
          "Bi-directional sync between standards extraction and PLM for a flight control system, enabling end-to-end traceability from DO-178C objectives through verification",
        duration: "12 weeks",
      },
      {
        title: "Requirements Management Integration",
        industry: "Aerospace",
        scope:
          "Automated requirements flow from standards to requirements management tools for certification evidence, including derived requirements tracking and compliance matrices",
        duration: "10 weeks",
      },
      {
        title: "Agile Standards Compliance Integration",
        industry: "Software/Medical",
        scope:
          "Mapping extracted standards requirements to agile project management tools for development teams, with automated status sync and compliance dashboards",
        duration: "6 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Assessment & Architecture",
        description:
          "System analysis, API review, and integration architecture design with a detailed implementation roadmap and effort estimate.",
        typicalDuration: "2-3 weeks",
      },
      {
        model: "Single System Integration",
        description:
          "Complete integration between standards management and one PLM or ALM system, including development, testing, deployment, and documentation.",
        typicalDuration: "3-4 months",
      },
      {
        model: "Multi-System Integration",
        description:
          "Integration across multiple PLM, ALM, and requirements management systems with a unified traceability layer and centralized governance.",
        typicalDuration: "4-6 months",
      },
    ],
    differentiators: [
      "Deep knowledge of PLM/ALM data models and APIs across Windchill, Teamcenter, DOORS, and Jira ecosystems",
      "Practitioner who understands the compliance context behind every integration -- not just the API documentation",
      "End-to-end ownership from architecture through deployment and handover",
      "Experience building requirements traceability solutions for Fortune 500 engineering organizations",
    ],
    implementationTimeline: [
      {
        phase: "Requirements & Architecture",
        duration: "2-3 weeks",
        description:
          "System analysis, API review, data model mapping, and integration architecture design.",
      },
      {
        phase: "Development",
        duration: "6-8 weeks",
        description:
          "API development, data mapping implementation, custom connector build, and sync engine configuration.",
      },
      {
        phase: "Testing & UAT",
        duration: "2-3 weeks",
        description:
          "Integration testing, user acceptance testing, performance validation, and edge case verification.",
      },
      {
        phase: "Deployment & Training",
        duration: "2 weeks",
        description:
          "Production deployment, operational documentation, runbook delivery, and user training.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Knowledge Management
  // ---------------------------------------------------------------------------
  {
    id: "knowledge-management",
    title: "Knowledge Management",
    shortTitle: "Knowledge Management",
    description:
      "Deploy AI-powered semantic search and knowledge management solutions that let engineers find answers in minutes instead of hours across millions of technical documents. We design taxonomies, configure search profiles, and connect knowledge sources so that institutional expertise is preserved and accessible.",
    href: "/engineering/knowledge-management",
    icon: "Search",
    deliverables: [
      "Knowledge source inventory and taxonomy",
      "Information architecture and search strategy document",
      "Configured semantic search platform with custom connectors",
      "Discipline-specific search profiles and relevancy tuning",
      "User training materials and adoption playbook",
    ],
    focusAreas: [
      "Semantic search deployment and configuration",
      "Technical taxonomy and ontology design",
      "Knowledge source integration and connector development",
      "Search relevancy tuning and profile customization",
      "Institutional knowledge capture and preservation",
    ],
    methodology: [
      {
        step: "Knowledge Source Inventory & Taxonomy Workshop",
        description:
          "Catalog all knowledge sources -- documents, standards, patents, procedures, lessons learned -- and conduct workshops to define the taxonomy and metadata schema.",
      },
      {
        step: "Information Architecture & Search Strategy Design",
        description:
          "Design the information architecture, define search profiles by engineering discipline, and establish relevancy ranking rules aligned with engineering workflows.",
      },
      {
        step: "Semantic Search Configuration & Connector Deployment",
        description:
          "Configure the semantic search platform, deploy connectors to all knowledge sources, and set up indexing schedules and access control policies.",
      },
      {
        step: "Search Profile Customization & Relevancy Tuning",
        description:
          "Create discipline-specific search profiles, tune relevancy algorithms using engineering-specific heuristics, and validate results with subject matter experts.",
      },
      {
        step: "User Training, Launch & Ongoing Optimization",
        description:
          "Deliver hands-on training workshops, launch the platform with champion users, and establish feedback loops for continuous relevancy and coverage improvement.",
      },
    ],
    whoItsFor: [
      "Engineering organizations with large volumes of unstructured technical documents",
      "R&D teams needing to search across patents, standards, and internal technical literature",
      "Knowledge management leaders tasked with capturing institutional expertise",
      "Chief engineers concerned about knowledge loss from workforce turnover",
    ],
    expectedOutcomes: [
      {
        title: "Dramatic Search Time Reduction",
        description:
          "Sub-minute search across millions of technical documents, down from typical 30-45 minute manual searches through filing systems and shared drives.",
      },
      {
        title: "Discipline-Specific Search Profiles",
        description:
          "Discipline-specific search profiles tailored to each engineering function, ensuring that mechanical, electrical, process, and structural engineers each see the most relevant results first.",
      },
      {
        title: "Connected Knowledge Bases",
        description:
          "Connected knowledge bases spanning internal documents, standards, patents, and published research -- breaking down silos between information sources.",
      },
      {
        title: "Reduced Duplicated Research",
        description:
          "Measurable reduction in duplicated research and reinvention of existing solutions, preserving institutional knowledge even as experienced engineers retire.",
      },
    ],
    sampleProjects: [
      {
        title: "Enterprise Knowledge Platform",
        industry: "Oil & Gas",
        scope:
          "Deploying semantic search across 2M+ technical documents for a global EPC firm, including integration with document management systems and standards libraries",
        duration: "16 weeks",
      },
      {
        title: "R&D Knowledge Base",
        industry: "Manufacturing",
        scope:
          "Connecting internal design documents, patents, and standards into a unified searchable knowledge base with discipline-specific search profiles",
        duration: "10 weeks",
      },
      {
        title: "Standards-Integrated Search",
        industry: "Aerospace",
        scope:
          "Configuring semantic search to surface relevant standards alongside internal technical procedures, linked to active programs and design requirements",
        duration: "8 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Discovery & Knowledge Audit",
        description:
          "Inventory of knowledge sources, taxonomy workshop, and information architecture recommendations with a deployment roadmap.",
        typicalDuration: "2-3 weeks",
      },
      {
        model: "Standard Deployment",
        description:
          "Full deployment of semantic search across a single site or business unit, including connector setup, relevancy tuning, and user training.",
        typicalDuration: "3-4 months",
      },
      {
        model: "Enterprise Multi-Site",
        description:
          "Enterprise-wide deployment across multiple sites and business units with unified taxonomy, federated search, and centralized governance.",
        typicalDuration: "6-12 months",
      },
    ],
    differentiators: [
      "Published author on Cognitive AI for engineering knowledge augmentation (SAE International)",
      "Hands-on experience building semantic search and knowledge extraction products for enterprise engineering organizations",
      "Combines AI/NLP expertise with deep engineering domain knowledge across 4 industries",
      "Practical taxonomy design informed by how engineers actually search, not how librarians organize",
    ],
    implementationTimeline: [
      {
        phase: "Knowledge Audit",
        duration: "2-3 weeks",
        description:
          "Source inventory, taxonomy workshop, information architecture design, and metadata schema definition.",
      },
      {
        phase: "Configuration",
        duration: "4-6 weeks",
        description:
          "Connector setup, indexing pipeline configuration, search profile creation, and relevancy algorithm tuning.",
      },
      {
        phase: "Integration",
        duration: "3-4 weeks",
        description:
          "DMS integration, authentication and SSO setup, access control configuration, and cross-system linking.",
      },
      {
        phase: "Training & Launch",
        duration: "2-3 weeks",
        description:
          "User training workshops, champion user onboarding, adoption playbook delivery, and feedback collection.",
      },
      {
        phase: "Optimization",
        duration: "Ongoing",
        description:
          "Usage analytics monitoring, relevancy tuning based on search behavior, source expansion, and continuous improvement.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Standards Advisory
  // ---------------------------------------------------------------------------
  {
    id: "compliance-advisory",
    title: "Standards Advisory",
    shortTitle: "Standards Advisory",
    description:
      "Strategic advisory services for engineering compliance, standards management maturity, and digital transformation of compliance processes in regulated industries. We assess your current compliance posture, benchmark against industry peers, and build prioritized roadmaps that align remediation with business priorities.",
    href: "/engineering/compliance-advisory",
    icon: "ShieldCheck",
    deliverables: [
      "Standards portfolio assessment and gap analysis report",
      "Compliance maturity scorecard with peer benchmarking",
      "Prioritized remediation roadmap with resource estimates",
      "Digital compliance transformation strategy",
      "Quarterly compliance review and progress reports",
    ],
    focusAreas: [
      "Standards compliance gap analysis",
      "Compliance maturity assessment and benchmarking",
      "Digital transformation of compliance processes",
      "Regulatory readiness and audit preparation",
      "Standards management strategy and governance",
    ],
    methodology: [
      {
        step: "Standards Portfolio & Compliance Baseline Assessment",
        description:
          "Inventory all applicable standards and regulations, assess current compliance status, and establish a quantitative baseline against which progress will be measured.",
      },
      {
        step: "Gap Analysis Against Applicable Standards & Regulations",
        description:
          "Perform detailed gap analysis comparing current practices against requirements in applicable standards, identifying non-conformities, partial conformities, and areas of excellence.",
      },
      {
        step: "Maturity Model Evaluation Across 5 Dimensions",
        description:
          "Evaluate standards management maturity across five dimensions: governance, processes, technology, people, and measurement -- scoring each from ad hoc to optimized.",
      },
      {
        step: "Remediation Roadmap with Prioritized Actions",
        description:
          "Develop a prioritized remediation roadmap that sequences actions by business impact, compliance risk, and implementation effort, with clear ownership and timelines.",
      },
      {
        step: "Implementation Support & Progress Tracking",
        description:
          "Provide ongoing advisory support during remediation, track progress against the roadmap, and adjust priorities as the compliance landscape evolves.",
      },
    ],
    whoItsFor: [
      "Quality directors and compliance managers in regulated industries",
      "Engineering VPs responsible for standards management across the organization",
      "Companies preparing for customer or regulatory audits",
      "Organizations undergoing digital transformation of their compliance processes",
    ],
    expectedOutcomes: [
      {
        title: "Compliance Visibility",
        description:
          "Clear visibility into compliance status across all applicable standards, with dashboards that highlight gaps, risks, and progress at a glance.",
      },
      {
        title: "Prioritized Remediation Roadmap",
        description:
          "Prioritized remediation roadmap aligned with business priorities, ensuring that the highest-risk gaps are addressed first with realistic timelines.",
      },
      {
        title: "Maturity Score with Peer Benchmarking",
        description:
          "Standards management maturity score with peer benchmarking, giving leadership an objective measure of where the organization stands relative to industry best practice.",
      },
      {
        title: "Digital Transformation Roadmap",
        description:
          "Digital transformation roadmap for engineering compliance processes, moving from paper-based and manual workflows to automated, auditable, and scalable systems.",
      },
    ],
    sampleProjects: [
      {
        title: "Compliance Gap Analysis",
        industry: "Medical Devices",
        scope:
          "Auditing QMS and design controls against ISO 13485 and EU MDR for a portfolio of 35 devices, identifying critical gaps and prioritizing remediation",
        duration: "8 weeks",
      },
      {
        title: "Standards Maturity Assessment",
        industry: "Manufacturing",
        scope:
          "Evaluating standards management maturity across 5 dimensions for a multi-plant OEM, benchmarking against industry peers and developing an improvement roadmap",
        duration: "4 weeks",
      },
      {
        title: "Digital Compliance Roadmap",
        industry: "Oil & Gas",
        scope:
          "Developing a roadmap for digitizing standards compliance from paper-based to automated processes, including technology selection and change management",
        duration: "6 weeks",
      },
    ],
    engagementModels: [
      {
        model: "Advisory Day Rate",
        description:
          "Flexible advisory engagement for targeted questions, audit preparation support, or ad hoc compliance guidance on specific standards or regulations.",
        typicalDuration: "As needed",
      },
      {
        model: "Strategic Assessment",
        description:
          "Comprehensive compliance assessment including gap analysis, maturity scoring, peer benchmarking, and a prioritized remediation roadmap.",
        typicalDuration: "4-8 weeks",
      },
      {
        model: "Fractional Chief Standards Officer",
        description:
          "Ongoing strategic advisory as a fractional executive, providing standards management leadership, governance oversight, and continuous improvement guidance.",
        typicalDuration: "Ongoing monthly",
      },
    ],
    differentiators: [
      "Deep understanding of how standards bodies operate and how their publications should be applied in engineering practice",
      "Cross-industry experience spanning oil & gas, aerospace, medical devices, and manufacturing -- applying best practices from one sector to another",
      "Standards management maturity model developed from decades of enterprise customer engagements",
      "Practical, implementation-focused advisory grounded in real engineering contexts -- not academic frameworks",
    ],
    implementationTimeline: [
      {
        phase: "Baseline Assessment",
        duration: "1-2 weeks",
        description:
          "Current state review, standards inventory, stakeholder alignment, and assessment scope definition.",
      },
      {
        phase: "Gap Analysis",
        duration: "2-3 weeks",
        description:
          "Detailed compliance assessment against all applicable standards, documenting non-conformities, partial conformities, and areas of strength.",
      },
      {
        phase: "Maturity Evaluation",
        duration: "1-2 weeks",
        description:
          "Five-dimension maturity scoring across governance, processes, technology, people, and measurement, with peer benchmarking.",
      },
      {
        phase: "Roadmap Development",
        duration: "2-3 weeks",
        description:
          "Prioritized remediation plan with timeline, resource estimates, ownership assignments, and business case for each initiative.",
      },
      {
        phase: "Implementation Support",
        duration: "Ongoing",
        description:
          "Progress tracking, guidance on remediation execution, quarterly reviews, and roadmap adjustments as priorities evolve.",
      },
    ],
  },
];
