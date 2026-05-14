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
      "Trusted by Fortune 500 engineering organizations for measurable adoption outcomes",
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
  // 3. Knowledge Management Strategy (advisory)
  // ---------------------------------------------------------------------------
  {
    id: "knowledge-management-strategy",
    title: "Knowledge Management Strategy",
    shortTitle: "KM Strategy",
    description:
      "Treat engineering knowledge as a board-level intangible asset. We help CKOs, VP Engineering, and Chief Innovation Officers build a defensible KM strategy across four pillars — Nonaka/SECI-based knowledge-creation design, multi-framework KM maturity evaluation, peer & sector benchmarking, and AI / GenAI strategy for KM — and hand off a funded, integrated 18–24 month roadmap that flows seamlessly into our KM Solutions Implementation practice.",
    href: "/engineering/knowledge-management-strategy",
    icon: "Target",
    accentColor: "violet",
    eyebrow: "Advisory Service",
    seciDiagram: true,
    tldr: [
      "Pillar 1 — Nonaka/SECI diagnostic and \"Ba\" design across Socialization, Externalization, Combination, Internalization.",
      "Pillar 2 — KM maturity evaluation using APQC KMCAT, Kulkarni-Freeze KMCA, and Siemens KMMM as defensible instruments.",
      "Pillar 3 — Peer & sector benchmarking via APQC Open Standards, CII BM&M, and sector bodies (SPE, AIAA, NASA APPEL).",
      "Pillar 4 — AI / GenAI strategy for KM: use-case portfolio, retrieval architecture, governance, KPI redesign.",
    ],
    deliverables: [
      "SECI diagnostic report and tacit-knowledge-at-risk register (ranked, with owner and retention plan)",
      "KM maturity assessment using APQC KMCAT, Kulkarni-Freeze KMCA, or Siemens KMMM — scored heatmap with evidence",
      "Peer & sector benchmark scorecard with gap analysis and sized uplift opportunity",
      "GenAI-KM use-case portfolio, target retrieval architecture, and governance playbook (IP, citation, red-team, audit)",
      "Integrated 18–24 month KM transformation roadmap with KPIs, governance, and executive business case",
      "Strategy-to-implementation handoff pack — KPI framework, target architecture, prioritised initiatives, risk register",
    ],
    focusAreas: [
      "Nonaka/SECI knowledge-creation diagnostic and \"Ba\" design",
      "KM maturity evaluation — APQC KMCAT, Kulkarni-Freeze KMCA, Siemens KMMM",
      "Peer & sector benchmarking — APQC, CII BM&M, SPE, AIAA, NASA APPEL",
      "AI / GenAI strategy for KM — use-case portfolio, retrieval architecture, governance",
      "KPI redesign, governance, and KM operating model",
      "Strategy-to-execution handoff into KM Solutions Implementation",
    ],
    methodology: [
      {
        step: "Engineering-knowledge sponsor alignment & charter",
        description:
          "Align with the CKO / VP Engineering / Chief Innovation Officer sponsor on scope, business outcomes, and the engineering domains in scope. Confirm guiding principles, steering cadence, and how the strategy will hand off to implementation.",
      },
      {
        step: "Pillar 1 — SECI diagnostic & tacit-knowledge-at-risk register",
        description:
          "Map how tacit and explicit knowledge currently moves across Socialization, Externalization, Combination, and Internalization. Run 25–40 structured \"knowledge-at-risk\" interviews with senior engineers and field operators. Score critical knowledge on replication difficulty and time-to-loss. Diagnose the four \"Ba\" types — Originating, Dialoguing, Systemising, Exercising — in physical, virtual, and cognitive layers.",
      },
      {
        step: "Pillar 2 — KM maturity assessment (APQC KMCAT / KMCA / KMMM)",
        description:
          "Baseline the organisation against a credible, externally-referenced maturity instrument — APQC KMCAT (broadest), Kulkarni & Freeze KMCA (most academically validated, strong for project-based industries), or Siemens KMMM (strongest for industrial engineering). Triangulate survey, interviews, document review, and system telemetry — survey-only assessments routinely overstate maturity by a full level.",
      },
      {
        step: "Pillar 3 — Peer & sector benchmarking",
        description:
          "Define a 6–12 firm peer cohort. Benchmark knowledge velocity, reuse rate, expertise-location time, time-to-competence, and lessons-learned implementation rate against APQC Open Standards data, CII BM&M (for capital projects), and sector bodies — SPE for upstream, AIAA / INCOSE / NASA APPEL for aerospace, NAM for manufacturing. Produce a scorecard with cohort distributions and sized financial uplift opportunity per metric.",
      },
      {
        step: "Pillar 4 — GenAI-KM use-case portfolio & architecture decisions",
        description:
          "Score 15–30 GenAI-KM use cases on value, feasibility, risk, and corpus dependency. Decide retrieval architecture — hybrid RAG, GraphRAG (Microsoft Research 2024), agentic retrieval, or a layered combination. Design the governance contract — citation enforcement, hallucination tolerance in safety-critical workflows, IP and data-residency rules, prompt-injection defence, audit logging — and the model-routing logic across Anthropic, OpenAI, and open-source.",
      },
      {
        step: "Integrated 4×4 framework — GenAI re-scored",
        description:
          "Design a 4×4 framework — four enablers (people, process, technology, governance) by four knowledge activities (create, capture, share, apply). Re-score every gap from Pillars 2 and 3 through the GenAI lens: which gaps disappear under AI-augmented retrieval, and which become more acute (corpus quality, citation, governance)?",
      },
      {
        step: "KPI redesign, governance & operating model",
        description:
          "Retire activity metrics (documents captured, portal visits). Define answer-quality, deflection, hallucination-rate, and citation-coverage KPIs. Design the governance model — KM council, domain knowledge owners, content stewards, AI-KM ethics lead, retrieval-quality engineer — and the steering rhythm.",
      },
      {
        step: "Executive activation & handoff to KM Solutions Implementation",
        description:
          "Deliver the executive readout, secure year-one funding, and scope the first 2–3 initiatives to implementation-ready level. The KM Solutions Implementation practice inherits the KPI framework and target architecture — no re-baselining, no re-discovery between strategy and delivery.",
      },
    ],
    whoItsFor: [
      "Chief Knowledge Officers building or relaunching a KM function in an engineering organisation",
      "VPs of Engineering concerned about retiring expertise, knowledge silos, and slow onboarding",
      "Chief Innovation Officers tying KM to R&D productivity, reuse, and AI-augmented knowledge work",
      "Heads of Engineering Excellence and Centers of Excellence designing operating models",
      "CIOs / Heads of Digital whose KM platform investment has stalled and needs a GenAI-era reset",
    ],
    expectedOutcomes: [
      {
        title: "Defensible, peer-anchored maturity baseline",
        description:
          "An APQC- / KMCA- / KMMM-anchored maturity scorecard triangulated across survey, interview, document, and telemetry evidence — positioned against a named peer cohort. The board can act on it; it isn't a survey opinion.",
      },
      {
        title: "Funded, integrated 18–24 month roadmap",
        description:
          "A four-pillar roadmap with named accountable executives, sized initiatives, and a business case the CFO will engage with. Typical uplift opportunity sizes at $5M–$50M for multi-billion-dollar engineering enterprises, driven by reuse, expertise-location, and lessons-learned implementation gaps.",
      },
      {
        title: "GenAI-ready KM operating model",
        description:
          "Target retrieval architecture (hybrid RAG, GraphRAG, agentic), citation-grounding governance, KPI redesign, and the new roles required to govern AI-augmented knowledge work. The operating model survives the consulting engagement.",
      },
      {
        title: "Measurable knowledge-velocity gains",
        description:
          "Programmes that execute typically deliver time-to-answer reductions of 40–70%, lessons-learned implementation rate uplift from 10–20% baseline to 45–60% (CII BM&M data), and onboarding time-to-productivity reductions of 25–40%.",
      },
    ],
    sampleProjects: [
      {
        title: "Engineering-Knowledge Retention & GenAI Readiness",
        industry: "Aerospace & Defense",
        scope:
          "SECI diagnostic across 4 engineering centres (2,800 engineers); APQC KMCAT maturity assessment; benchmarking against AIAA, INCOSE, and NASA APPEL data; GenAI use-case portfolio for design-rationale retrieval under ITAR constraints. Outcome: knowledge-at-risk register covering 220 critical roles, two-level maturity advance plan, sovereign-deployment GenAI architecture approved by CISO.",
        duration: "36 weeks",
      },
      {
        title: "Subsurface Lessons-Learned & GraphRAG Strategy",
        industry: "Upstream Oil & Gas",
        scope:
          "SECI + CoP audit across drilling, completions, and reservoir disciplines; CII BM&M-style lessons-learned implementation benchmark; GraphRAG architecture decision over 30 years of well files and incident reports. Outcome: lessons-learned implementation rate uplift plan from 14% baseline to 50% target, GraphRAG pilot scope and governance, $18M sized annual avoidable-rework opportunity.",
        duration: "24 weeks",
      },
      {
        title: "Project-Knowledge Reuse & GenAI Productivity",
        industry: "Global EPC Contractor",
        scope:
          "Kulkarni-Freeze KMCA maturity assessment; APQC + AACE benchmarking on reuse rate and time-to-competence; GenAI strategy for FEED-stage proposal authoring and design reuse with mandatory citation. Outcome: reuse-rate uplift target 22% → 45%, AI-augmented proposal workflow with citation enforcement, 18-month integrated roadmap signed by CEO and CTO.",
        duration: "48 weeks",
      },
    ],
    engagementModels: [
      {
        model: "KM Strategy Diagnostic",
        description:
          "Pillars 1 and 2 in parallel — SECI diagnostic and KM maturity assessment — plus the top three uplift opportunities sized for executive decision-making. The entry point for boards that need to know where they stand before committing to a full roadmap.",
        typicalDuration: "6-8 weeks",
      },
      {
        model: "Integrated KM Strategy & Roadmap",
        description:
          "All four pillars end-to-end — SECI, maturity, benchmarking, GenAI strategy — integrated into a 4×4 framework, GenAI-re-scored 18–24 month roadmap, governance and KPI model, and executive activation. The standard engagement.",
        typicalDuration: "10-14 weeks",
      },
      {
        model: "Embedded KM Advisory",
        description:
          "Fractional KM leadership embedded with the CKO / VP Engineering to drive roadmap execution, govern the GenAI rollout, coach knowledge owners, and report KPI progress to the steering committee. Often follows an integrated strategy engagement.",
        typicalDuration: "6-12 months",
      },
    ],
    differentiators: [
      "Engineering-domain KM grounded in Nonaka/Takeuchi SECI theory and \"Ba\" design — not generic enterprise KM",
      "Multi-framework rigor: APQC KMCAT, Kulkarni-Freeze KMCA, and Siemens KMMM as defensible, externally-referenced instruments",
      "Native GenAI-strategy depth — use-case portfolios, retrieval-architecture decisions, citation governance, KPI redesign for AI-augmented knowledge work",
      "Vendor-neutral on platforms; clean handoff into KM Solutions Implementation (Goldfire, OpenText, Sinequa, Glean, and the broader landscape)",
    ],
    implementationTimeline: [
      {
        phase: "Mobilization",
        duration: "1-2 weeks",
        description:
          "Sponsor alignment, charter, stakeholder mapping, and confirmation of in-scope engineering domains and steering rhythm.",
      },
      {
        phase: "Diagnose (Pillars 1 + 2)",
        duration: "3-4 weeks",
        description:
          "SECI diagnostic and KM maturity assessment run in parallel — they're complementary lenses on the same organisation. Output: one integrated current-state picture with knowledge-at-risk register and maturity heatmap.",
      },
      {
        phase: "Anchor & Reframe (Pillars 3 + 4)",
        duration: "3-4 weeks",
        description:
          "Peer benchmarking against APQC, CII BM&M, and sector bodies — then re-score every gap through the GenAI lens. Use-case portfolio, retrieval architecture decisions, governance contract.",
      },
      {
        phase: "Roadmap & Activation",
        duration: "2-3 weeks",
        description:
          "Integrated 4×4 framework, KPI redesign, governance and operating model, executive readout, year-one funding, and handoff pack to KM Solutions Implementation.",
      },
    ],
    faqs: [
      {
        q: "SECI is thirty years old. Has it held up?",
        a: "The four-mode model has been critiqued (Gourlay 2006; Hislop 2013) as insufficiently empirically grounded for the Combination → Internalization transitions, and culturally rooted in Japanese context. But the Socialization–Externalization spiral and the \"Ba\" construct remain the most-cited frame in the engineering-KM literature, and Nonaka's later work (Nonaka, Toyama & Konno 2000; Nonaka & von Krogh 2009) substantially refined it. We use SECI as a diagnostic lens — particularly for Externalization, which is the weakest mode in most engineering enterprises — not as a prescription.",
      },
      {
        q: "Which maturity framework do you use, and why?",
        a: "Three credible, externally-referenced instruments — APQC KMCAT for breadth across twelve capability areas, Kulkarni & Freeze KMCA (Decision Support Systems, 2008) for project-based industries with strong academic validation, and Siemens KMMM (Ehms & Langen, 2002) for industrial engineering. We pick the primary instrument based on the enterprise's sector, prior assessment heritage, and which peer cohort has the most relevant benchmark distribution. We then borrow specific items from the other two where useful — most engagements use one primary plus two or three items from the others.",
      },
      {
        q: "How do you benchmark, and against whom?",
        a: "Cross-industry via APQC Open Standards Benchmarking and Conference Board KM Council data. Sector-specific via SPE (upstream oil & gas), AIAA / INCOSE / NASA APPEL (aerospace), NAM (manufacturing), and CII BM&M (capital projects — particularly hard-edged on lessons-learned implementation rate). We define a 6–12 firm named peer cohort under NDA and benchmark eight to twelve metrics including knowledge velocity, reuse rate, expertise-location time, time-to-competence, and lessons-learned implementation rate. We avoid composite-index awards in favour of metric-specific peer comparisons.",
      },
      {
        q: "What does GenAI actually change about a KM strategy?",
        a: "It collapses the cost of synthesis and retrieval, which shifts the strategic centre of gravity from \"capturing and curating documents\" to governing the corpus, the retrieval architecture, the citation discipline, and the human-in-the-loop workflows. Communities of practice shift upstream — from answering questions to curating canonical sources the LLM is allowed to cite. KPIs change too: \"documents captured\" and \"portal visits\" become near-obsolete; citation coverage, deflection rate, and hallucination rate replace them.",
      },
      {
        q: "How do we handle hallucination in safety-critical engineering work?",
        a: "Three layers. (1) Retrieval-only / extractive answering with mandatory citation in regulated workflows — no free-form generation. (2) Human-in-the-loop sign-off for any AI output entering a controlled document. (3) Red-team and out-of-distribution monitoring on production. Generative free-form answers without citation have no place in safety-case, certification, or capital-project decisions — and the governance design has to enforce this, not rely on guidance.",
      },
      {
        q: "What happens to our existing KM platform investment in the GenAI era?",
        a: "Most legacy investments retain value as the content and metadata layer — taxonomy, document management, expertise location, access control. The search and UX layer is being displaced by GenAI-native interfaces. Plan a 24-month transition; don't rip-and-replace. The strategy engagement decides which layers move and which stay.",
      },
      {
        q: "When does the strategy engagement end and implementation begin?",
        a: "When the maturity target, benchmark gaps, GenAI architecture pattern, build-vs-buy decisions, and governance model are signed off; when the roadmap is sequenced and resourced with named executives and budget; and when the first 2–3 initiatives are scoped to implementation-ready level. The trigger is typically a board or executive-committee approval of the roadmap and budget. The implementation team inherits the KPI framework defined in the strategy and reports against it from day one.",
      },
    ],
    nextStep: {
      eyebrow: "Ready to execute",
      title: "Knowledge Management Solutions Implementation",
      description:
        "Once the strategy, target architecture, and governance are signed off, our KM Solutions Implementation practice picks up the same KPI framework and delivers — semantic search, GenAI / RAG, GraphRAG, and engineering-content platforms across Goldfire, OpenText, Sinequa, Glean, and the broader landscape. No re-baselining, no re-discovery.",
      href: "/engineering/knowledge-management-implementation",
      ctaLabel: "Explore KM Solutions Implementation →",
    },
  },

  // ---------------------------------------------------------------------------
  // 4. Knowledge Management Solutions Implementation
  // ---------------------------------------------------------------------------
  {
    id: "knowledge-management-implementation",
    title: "Knowledge Management Solutions Implementation",
    shortTitle: "KM Solutions Implementation",
    description:
      "Deploy AI-powered semantic search, GenAI / RAG, and engineering-content platforms so engineers find answers in minutes instead of hours across millions of technical documents. Our primary delivery is on Accuris Goldfire and Goldfire Chat — the engineering-domain platform where content is semantically pre-indexed and every answer is source-traceable. We also integrate OpenText Documentum into regulated engineering workflows, and run vendor-neutral evaluation across the broader landscape (Sinequa, Coveo, Glean, Microsoft Copilot / Azure AI Search, Lucidworks, Mindbreeze, IntraFind, AlphaSense) against your corpus, security model, and TCO.",
    href: "/engineering/knowledge-management-implementation",
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
      "GenAI / RAG pipeline design and grounded generation",
      "Vendor evaluation and fit-for-purpose RFP execution",
      "Goldfire and OpenText / Documentum delivery",
      "GraphRAG and hybrid retrieval architecture",
      "Domain-tuned embeddings and cross-encoder reranking",
      "Citation grounding, access control, and answer governance",
    ],
    platformSpotlight: {
      eyebrow: "Our primary platform",
      title: "Accuris Goldfire — engineering knowledge, pre-indexed",
      subtitle:
        "Goldfire is where our delivery depth lives. It is the only enterprise platform that ships with engineering content already understood — standards, patents, technical literature, and your internal corpus — indexed semantically rather than as keywords.",
      positioningStatement:
        "Generic enterprise search and modern workplace assistants treat your engineering corpus like any other body of text. Goldfire was built for engineers: more than two decades of natural-language processing tuned to engineering syntax and terminology across oil & gas, aerospace & defense, manufacturing, and energy. Every answer is traceable to the source passage, so design decisions stay defensible — which matters when the answer drives a calculation, a safety case, or a regulatory submission.",
      benefits: [
        { metric: "40%", label: "Faster research time" },
        { metric: "50%", label: "More relevant answers on complex questions" },
        { metric: "60%", label: "Faster insight discovery" },
        { metric: "70%", label: "Reduction in engineer analysis time" },
        { metric: "90%", label: "Faster requirements identification (nuclear case)" },
        { metric: "13", label: "Disconnected sources unified into one answer" },
      ],
      benefitsSource:
        "Outcome ranges published by Accuris (accuristech.com). Engineers spend up to 42% of their working time searching across an average of 13 disconnected sources — Goldfire collapses that into one semantically-aware surface.",
      capabilities: [
        {
          title: "Semantic engineering search, not keyword retrieval",
          description:
            "Goldfire understands what an engineer is asking — requirements, properties, components, technical concepts — and surfaces the precise passage rather than a list of documents to triage.",
        },
        {
          title: "Pre-indexed engineering content",
          description:
            "Ingests internal documents, designs, and reports alongside trusted external engineering content (standards, patents, technical literature) without manual tagging or rule-building.",
        },
        {
          title: "Source-traceable answers",
          description:
            "Every answer is backed by verified source material — preserving rationale and evidence so decisions remain explainable, repeatable, and audit-defensible.",
        },
        {
          title: "Federated, multi-server reach",
          description:
            "Recent releases (25.1.1) extend Goldfire with federated search across multiple servers, so a single query reaches a global knowledge base while respecting per-region access controls.",
        },
        {
          title: "Flexible deployment posture",
          description:
            "SaaS, customer-hosted, or fully on-premise — the right answer for export-controlled aerospace & defense, sovereign oil & gas, and regulated manufacturing environments.",
        },
        {
          title: "Built-in connectors to engineering systems",
          description:
            "First-class integrations into SharePoint, document management systems, and engineering content sources mean shorter time-to-first-answer and lower integration cost than a generic-search build-out.",
        },
      ],
      chat: {
        title: "Goldfire Chat — the engineering GenAI assistant",
        subtitle:
          "Goldfire Chat layers generative AI on top of Goldfire's semantic engine so engineers get conversational, cited answers grounded in the organisation's own data — not the open internet, and not a generic Copilot.",
        capabilities: [
          {
            title: "Grounded generation, not generic LLM",
            description:
              "Answers are constrained to indexed organisational knowledge through Goldfire's semantic retrieval — preventing the hallucination patterns that make generic LLMs unsafe for engineering decisions.",
          },
          {
            title: "Trained on engineering data",
            description:
              "Twenty-plus years of engineering NLP behind every response. Understands specialised syntax and terminology across oil & gas, aerospace & defense, and manufacturing.",
          },
          {
            title: "Citation-first by design",
            description:
              "Summarises dense test reports, answers compliance queries, and traces every claim back to the originating standard, procedure, or technical document — a hard prerequisite for regulated work.",
          },
          {
            title: "API-first deployment",
            description:
              "The Goldfire Chat API integrates with existing engineering tools and workflows — embed it in your PLM, your standards portal, your QMS, or stand it up as a dedicated assistant.",
          },
        ],
      },
      closingNote:
        "We evaluate every vendor in the table below. When the answer is engineering content — standards, design rationale, lessons-learned, regulatory submissions — Goldfire wins on engineering depth, on time-to-first-answer (because the content is already indexed), and on the defensibility that regulated industries require. That is where our delivery, consulting, and support is concentrated.",
    },
    vendorLandscape: [
      {
        category: "Engineering-domain semantic platforms",
        vendors:
          "Accuris Goldfire, Goldfire Chat, Sinequa, Coveo, Mindbreeze, IntraFind",
        experience: "Primary delivery (Goldfire / Goldfire Chat)",
      },
      {
        category: "Engineering content & document platforms",
        vendors:
          "OpenText Documentum, OpenText Content Cloud, OpenText Magellan",
        experience: "Direct experience (Documentum)",
      },
      {
        category: "Modern workplace search & GenAI assistants",
        vendors:
          "Glean, Microsoft Copilot, Azure AI Search, Lucidworks Fusion / Springboard",
        experience: "Vendor-neutral evaluation",
      },
      {
        category: "Domain-vertical insight platforms",
        vendors: "AlphaSense (market & external research), Accuris Engineering Workbench",
        experience: "Vendor-neutral evaluation",
      },
      {
        category: "RAG & retrieval infrastructure",
        vendors:
          "Vector stores (pgvector, OpenSearch k-NN, Pinecone, Weaviate), reranker models (Cohere Rerank, BGE), embedding models (OpenAI, Voyage, BGE)",
        experience: "Vendor-neutral evaluation",
      },
      {
        category: "LLM and model orchestration",
        vendors:
          "Anthropic Claude, OpenAI GPT-class, Azure OpenAI, AWS Bedrock, model routing and policy frameworks",
        experience: "Vendor-neutral evaluation",
      },
    ],
    implementationFocus: {
      title: "How we engage across the landscape",
      body: "We deliver Accuris Goldfire and Goldfire Chat as our primary engineering-content platform — implementation, consulting, and ongoing support. We have also integrated OpenText Documentum into regulated engineering workflows. For every other vendor in the table below, we run a structured, vendor-neutral evaluation against your corpus, security model, geography, and TCO — and then hand off cleanly to the platform's own delivery team or to a system integrator we trust. We won't pretend to deliver platforms we haven't shipped.",
      platforms: [
        "Accuris Goldfire",
        "Goldfire Chat",
        "OpenText Documentum",
      ],
    },
    ragPatterns: [
      {
        title: "Hybrid retrieval (BM25 + dense)",
        description:
          "Combine lexical (BM25) and dense vector retrieval with rank fusion so engineering queries that depend on exact part numbers, standards codes, and acronyms surface alongside semantically similar passages.",
      },
      {
        title: "GraphRAG",
        description:
          "Layer a knowledge graph over the corpus — assets, systems, standards, suppliers, lessons — so retrieval can traverse relationships (e.g., \"which standards apply to this assembly under API 510?\") rather than relying on flat similarity.",
      },
      {
        title: "Agentic RAG",
        description:
          "Decompose multi-step engineering questions into planned sub-queries (retrieval, calculation, comparison, citation), executed by tool-using agents with guardrails — for design-rationale lookups, failure-mode investigations, and procedure synthesis.",
      },
      {
        title: "Domain-tuned embeddings",
        description:
          "Fine-tune or adapt embedding models on engineering-domain corpora (standards, procedures, lessons-learned) so retrieval understands oilfield, aerospace, and process-industry vocabulary that generic embeddings dilute.",
      },
      {
        title: "Cross-encoder reranking",
        description:
          "Re-rank top-k candidates with a cross-encoder reranker (Cohere Rerank, BGE-reranker) to push the genuinely relevant passages into the top three — where answer quality lives.",
      },
      {
        title: "Citation grounding",
        description:
          "Force the generator to cite the exact source passages used in every answer — including page numbers, standard sections, and document IDs — so engineers can verify before they act.",
      },
      {
        title: "Long-context + RAG hybrid",
        description:
          "Use long-context models for synthesis after retrieval narrows the candidate set — combining the precision of RAG with the reasoning capacity of large-context models for complex multi-document questions.",
      },
      {
        title: "Access-controlled context",
        description:
          "Apply identity-aware filtering at retrieval time — not just at the UI — so RAG responses respect document classification, export-control flags, project NDAs, and clearance levels.",
      },
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
      {
        title: "Goldfire Chat RAG Rollout",
        industry: "Aerospace & Defense",
        scope:
          "Deployed Goldfire Chat with hybrid retrieval, reranking, and citation grounding across engineering procedures, standards, and lessons-learned for a Tier-1 OEM — wired to clearance-aware access controls.",
        duration: "14 weeks",
      },
      {
        title: "GraphRAG-Enabled Knowledge Platform",
        industry: "Oil & Gas",
        scope:
          "Built a GraphRAG layer over a 3M+ document corpus for a GCC NOC — linking assets, standards, suppliers, and lessons through a domain knowledge graph so agentic retrieval can answer multi-hop engineering questions.",
        duration: "20 weeks",
      },
      {
        title: "Glean + Goldfire Hybrid Search",
        industry: "EPC / Global Engineering",
        scope:
          "Integrated Glean for modern workplace search with Goldfire for engineering-domain depth across a global EPC firm — unified relevancy, shared identity, and a single answer surface for engineers.",
        duration: "18 weeks",
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
      {
        model: "RAG Architecture Pilot",
        description:
          "Time-boxed pilot to stand up a production-grade RAG architecture against a focused engineering corpus — hybrid retrieval, domain-tuned embeddings, reranking, citation grounding, and a measured evaluation harness — to de-risk the full enterprise build.",
        typicalDuration: "8-12 weeks",
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
    nextStep: {
      eyebrow: "Need to decide before you deliver?",
      title: "Knowledge Management Strategy",
      description:
        "If maturity, GenAI architecture, governance, and KPI decisions aren't yet signed off, start with our KM Strategy advisory — Nonaka/SECI diagnostic, multi-framework maturity assessment (APQC KMCAT, Kulkarni-Freeze KMCA, Siemens KMMM), peer benchmarking, and a GenAI-ready operating model.",
      href: "/engineering/knowledge-management-strategy",
      ctaLabel: "See KM Strategy advisory →",
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Standards Advisory
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
