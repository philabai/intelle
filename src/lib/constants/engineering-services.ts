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
  // 2. Digital Threading & Traceability
  // ---------------------------------------------------------------------------
  {
    id: "plm-integration",
    title: "Digital Threading & Traceability",
    shortTitle: "Digital Threading",
    description:
      "Every design decision in an engineering organisation must trace back to a governing standard, regulation, or internal requirement — and every revision of that source cascades into inspections, procedures, supplier obligations, and MOC. We deliver the digital-threading practice that makes that cascade automatic: decomposing standards into structured, traceable requirement objects and wiring them into the RM/PLM/ALM tools your engineers already run. Anywhere a clause from a standard or regulation needs to be referenced by your toolchain, we ship the integration end-to-end.",
    href: "/engineering/plm-integration",
    icon: "GitMerge",
    digitalThreadDiagram: true,
    tldr: [
      "Engineering change management — when a standard, regulation, or internal requirement changes, downstream impact must be visible immediately, not at the next audit.",
      "Digital threading — automated decomposition of standards into structured, citable requirement objects (requirements, prohibitions, guidance, engineering information) with edition history and applicability mapping.",
      "Connector layer into your RM/PLM/ALM stack — PTC Codebeamer, PTC Windchill, Siemens Polarion, IBM DOORS, Jama Connect, Siemens Teamcenter, IBM Maximo.",
      "Outcomes — 90% time-to-extract reduction, 92% first-pass accuracy, proactive MOC instead of reactive, continuous audit conformance.",
    ],
    deliverables: [
      "Engineering change-management diagnostic — how standards changes propagate today, and where they break",
      "Standards corpus inventory and digital-thread information architecture",
      "Configured digital-thread tenant onboarded with SDO and internal-standards content",
      "API connectors into the customer's RM/PLM/ALM tools (REQIF / JSON / CSV exchange)",
      "MOC change-cascade workflow with downstream-impact notifications and supplier flow-down",
      "Operational runbook, KPI dashboard, and ongoing-support handover",
    ],
    focusAreas: [
      "Digital-thread platform implementation and support",
      "API connector engineering for RM/PLM/ALM",
      "Engineering change management and MOC workflow design",
      "Standards as governed objects — edition history, applicability mapping, change events",
      "Bidirectional traceability across the engineering lifecycle",
      "Requirements decomposition, enrichment, similarity analysis",
    ],
    methodology: [
      {
        step: "Sponsor alignment and charter",
        description:
          "Align with the VP Engineering / Head of Digital Transformation / Head of Requirements sponsor on scope, in-scope engineering domains, in-scope RM/PLM/ALM systems, and the steering rhythm.",
      },
      {
        step: "Engineering change-management diagnostic",
        description:
          "Map the current-state — how a standard revision propagates today across design, procurement, fabrication, MOC, supplier flow-down, and audit. Identify the chokepoints where impact is invisible until too late, and size the cost.",
      },
      {
        step: "Standards corpus inventory",
        description:
          "Catalogue which SDOs are in scope (API, ISO, NACE, Mil-Specs, ASME, IEC, AIA) plus internal standards, design guides, and best practices. Map each to engineering domain, asset class, and the systems it must reach.",
      },
      {
        step: "Target architecture",
        description:
          "Design the end-to-end target: digital-thread tenant + connector layer + downstream RM/PLM/ALM systems wired together. Confirm identity, access controls, data residency, and audit-evidence requirements.",
      },
      {
        step: "Platform deployment and corpus onboarding",
        description:
          "Configure the digital-thread tenant, upload SDO and internal-standards content, validate decomposition accuracy against engineer-reviewed samples, and tune the requirement-extraction profile.",
      },
      {
        step: "Connector engineering",
        description:
          "Build the API integrations into named RM/PLM/ALM systems (e.g., PTC Codebeamer and IBM Maximo for an O&G NOC, or IBM DOORS Next and PTC Windchill for an A&D programme). REQIF / JSON exchange contracts, change-event subscriptions, identity propagation.",
      },
      {
        step: "MOC workflow and change-cascade activation",
        description:
          "Wire change events to downstream workflows — inspection plans, procedure updates, supplier obligations, audit evidence. Test the cascade against representative standard revisions before go-live.",
      },
      {
        step: "Adoption, KPI baseline, and ongoing support",
        description:
          "Power-user training, KPI baseline (extraction cycle time, MOC backlog burn-down, audit-evidence completeness, requirements-rework rate), operational handover to the customer's IT and Engineering Operations teams, and ongoing platform + connector support.",
      },
    ],
    whoItsFor: [
      "VP / Head of Systems Engineering on complex programmes (defence primes, energy capital projects, NPI)",
      "VP / Head of Requirements Management responsible for bidirectional traceability and configuration management",
      "VP / Head of Process Engineering and Engineering Standards owning standards adherence",
      "Head of Digital Transformation / Digital Innovation moving the engineering organisation from document-based to model-based (MBSE)",
      "Asset & Integrity leaders in O&G, Nuclear, and Energy needing standards-aware MOC, inspection, and supplier flow-down",
    ],
    expectedOutcomes: [
      {
        title: "90% time saved on requirements identification & extraction",
        description:
          "Automated decomposition replaces weeks of manual reading, copying, and re-keying. Engineers get their time back for the engineering decisions they were hired to make.",
      },
      {
        title: "92% first-pass accuracy on extracted requirements",
        description:
          "Versus a ~70% manual industry baseline. Fewer missed clauses, fewer mis-transcribed values, fewer late-stage change orders driven by requirements errors caught after design.",
      },
      {
        title: "Proactive MOC and continuous audit conformance",
        description:
          "When a governing standard revises, the change propagates automatically to inspection plans, procedures, work instructions, and supplier obligations. Non-compliance avoidance is significant — published industry data places the cost of non-compliance at roughly 3× the cost of maintaining compliance.",
      },
      {
        title: "End-to-end traceability across the toolchain",
        description:
          "From a clause in API 510, ISO 14224, or your internal design guide, all the way down to an inspection plan, a work order, a CAD assembly, or a supplier qualification record — visible, queryable, and audit-defensible across your RM, PLM, and ALM systems.",
      },
    ],
    engagementModels: [
      {
        model: "Discovery & Architecture",
        description:
          "Engineering change-management diagnostic + standards corpus inventory + target-architecture blueprint + sized business case. The right entry point before committing to full implementation.",
        typicalDuration: "4-6 weeks",
      },
      {
        model: "Digital-Thread Implementation",
        description:
          "Full platform tenant + connector layer into named RM/PLM/ALM systems + MOC and change-cascade workflows + adoption. The standard end-to-end engagement.",
        typicalDuration: "4-6 months",
      },
      {
        model: "Embedded Advisory & Connector Factory",
        description:
          "Fractional practice leadership embedded with engineering operations, additional connector builds for newly-in-scope systems, KPI reporting, and Tier-2/Tier-3 customer-success bridging.",
        typicalDuration: "6-12 months",
      },
    ],
    differentiators: [
      "Senior-practitioner-led digital-thread delivery practice — end-to-end from change-management diagnostic through connector engineering and operational handover. Not a generalist SI.",
      "Deep API integration practice into PTC Codebeamer, PTC Windchill, Siemens Polarion, Siemens Teamcenter, IBM DOORS, Jama Connect, and IBM Maximo — the RM/PLM/ALM tools our customers actually run.",
      "Engineering-change-management framing — we don't just ship connectors, we redesign the MOC and traceability operating model around them.",
      "Published author on Cognitive AI for engineering knowledge augmentation (SAE International). Vertical depth in Aerospace & Defense, Oil & Gas, Nuclear, and Energy.",
    ],
    implementationTimeline: [
      {
        phase: "Mobilisation",
        duration: "1-2 weeks",
        description:
          "Sponsor alignment, charter, in-scope engineering domains and RM/PLM/ALM systems confirmed, steering rhythm agreed.",
      },
      {
        phase: "Diagnose & Architect",
        duration: "3-4 weeks",
        description:
          "Engineering change-management diagnostic, standards corpus inventory, target architecture, and integration security model.",
      },
      {
        phase: "Deploy & Integrate",
        duration: "10-14 weeks",
        description:
          "Platform tenant configured and corpus onboarded; first two connectors engineered and integration-tested; MOC change-cascade workflow wired and validated against representative standard revisions.",
      },
      {
        phase: "Activate & Sustain",
        duration: "2-3 weeks + ongoing",
        description:
          "Power-user training, KPI baseline, operational handover, and ongoing platform + connector support.",
      },
    ],
    faqs: [
      {
        q: "Isn't this just another requirements management system?",
        a: "No. The digital-thread layer sits **upstream** of your RMS. It decomposes standards, regulations, and internal engineering content into structured requirement objects and threads them INTO your existing DOORS, Jama, Polarion, or Codebeamer — it never replaces them. The RMS you've already invested in continues to be the system of record for project requirements; the thread is what brings external and internal source requirements into it cleanly, with provenance preserved.",
      },
      {
        q: "What does \"standards as governed objects\" actually mean?",
        a: "Each standard, regulation, or internal design guide is registered as a versioned object with edition history, ICS codes, applicability mappings (asset class, site, supplier, project), traceability relationships, and change events. When a standard revises — say API 510 issues a new edition — your downstream systems are notified of exactly what's affected and where. Inspection plans, MOC workflows, procedures, and supplier obligations update accordingly. No more scrambling to find every reference before the next audit.",
      },
      {
        q: "Which RM/PLM/ALM tools do you build connectors for?",
        a: "Direct API integration experience with PTC Codebeamer, PTC Windchill, IBM DOORS, IBM DOORS Next, Jama Connect, Siemens Polarion, Siemens Teamcenter, and IBM Maximo. We evaluate other platforms (Dassault Systèmes ENOVIA, Aras Innovator, SAP PLM/EAM, Hexagon EAM, AVEVA APM, Bentley AssetWise) vendor-neutrally and partner with the platform's own delivery team or a trusted system integrator where it makes sense.",
      },
      {
        q: "Does this work for safety-critical and certification-heavy programmes (DO-178C, ISO 26262, IEC 61508, ASME, NRC)?",
        a: "Yes. Structured requirement objects, bidirectional traceability, and a continuous audit-evidence harness are exactly the patterns these certification regimes already demand. The digital thread doesn't replace your certification process — it makes the artefacts continuous rather than reconstructed under audit pressure. Several of our reference engagements are in DO-178C / DO-254 and nuclear regulatory environments.",
      },
      {
        q: "Can we thread our internal standards, design guides, and best practices — not just public SDO content?",
        a: "Yes. The decomposition engine works on internal documents alongside SDO content (Mil-Specs, AIA, ASME, ISO, API, NACE, IEC, regulator publications) with the same accuracy guarantees. For many enterprises, the highest-value corpus is internal — design guides, lessons-learned, and operator standards that no one else has indexed.",
      },
      {
        q: "Which platform do you deliver against?",
        a: "Our primary delivery platform is named in the Platform section above (with the full capability set, benefit numbers, and the connector layer we engineer on top). For the rest of this page we describe the *capability* — digital threading — because the value lives in the thread, not the brand. If you'd like a direct conversation about platform fit for your toolchain, the discovery call is the right next step.",
      },
      {
        q: "How do we measure success?",
        a: "Cycle time on requirements extraction, MOC backlog burn-down, supplier-flow-down adherence, audit-evidence completeness, requirements-rework rate at design and verification stages, and the platform-published metrics (90% time-to-extract reduction, 92% first-pass accuracy). The KPI dashboard is baselined during Discovery and reported through go-live and steady-state operations.",
      },
    ],
    platformSpotlight: {
      eyebrow: "Our primary platform",
      title: "The digital-threading platform we deliver",
      subtitle:
        "Decompose. Enrich. Thread. Every engineering decision back to its governing standard, every revision propagated forward.",
      positioningStatement:
        "Our delivery is anchored on Accuris Thread — the engineering-domain platform that decomposes standards, regulations, and internal engineering content into structured requirement objects and threads them into the toolchain you already run. We sell, implement, and support it end to end, including the API connector layer that makes those requirements first-class citizens inside your PLM, RMS, and ALM. For the rest of this page, we describe the capability rather than the platform — because what matters to your engineers is the thread, not the brand.",
      benefits: [
        { metric: "90%", label: "Time saved on requirements identification and extraction" },
        { metric: "92%", label: "First-pass accuracy (vs ~70% manual baseline)" },
        { metric: "$M", label: "Saved annually in time, error avoidance, and capital exposure" },
        { metric: "3×", label: "Cost asymmetry — non-compliance vs maintaining compliance" },
        { metric: "80%", label: "Of large-scale incidents driven by disconnected MOC" },
        { metric: "5 min", label: "Saved per requirement, customer-cited" },
      ],
      benefitsSource:
        "Outcome ranges published by the platform vendor; mapped to intelle.io delivery on representative engagements across A&D, O&G, Nuclear, and Energy.",
      capabilities: [
        {
          title: "Decompose unstructured content into structured objects",
          description:
            "Standards, codes, regulations, design guides, and handbooks are decomposed into four object types — requirements, prohibitions, guidance, engineering information — each enriched with metadata and addressable individually.",
        },
        {
          title: "Smart-search Requirement Viewer",
          description:
            "Semantic search across the decomposed corpus, with automatic detection of normative language (\"should\", \"must\", \"shall\") and direct linkback to the source passage. Engineers verify in context, not in a guessed-at section number.",
        },
        {
          title: "Similarity Analysis across documents",
          description:
            "Compare requirements between versions of a standard, or between entirely separate documents, with up to five documents viewed side-by-side. The fastest way to understand what a revision has actually changed.",
        },
        {
          title: "Requirements Library + API",
          description:
            "All requirement objects live in a searchable, filterable library, with bulk export in CSV, REQIF, and JSON formats and an API for integration into downstream systems.",
        },
        {
          title: "Engineering-domain NLP",
          description:
            "Two-plus decades of natural-language processing tuned to engineering syntax — technical terminology across oil & gas, aerospace & defence, manufacturing, and energy. Generic enterprise NLP misses this depth.",
        },
        {
          title: "Customer-hosted, access-controlled deployment",
          description:
            "SaaS, customer-hosted, or fully on-premise — designed around export-control, ITAR, sovereign-deployment, and clearance requirements that real engineering programmes face.",
        },
      ],
      addon: {
        badge: "Integration Layer",
        title: "The connector layer — standards as live, governed objects",
        subtitle:
          "Where decomposition becomes integration. The layer intelle.io engineers on top of the platform, into the engineering toolchain your teams already run.",
        capabilities: [
          {
            title: "Standards as governed objects",
            description:
              "Each standard or regulation registered as a versioned object with edition history, ICS codes, applicability mapping (asset class, site, supplier, project), and traceability relationships.",
          },
          {
            title: "Automated change propagation",
            description:
              "When a governing standard revises, the change event propagates through the connector layer into PLM, RMS, EAM, and MOC workflows. Affected equipment records, inspection plans, procedures, and supplier obligations surface for review before the change becomes a safety event.",
          },
          {
            title: "Supplier flow-down via traceability, not PDFs",
            description:
              "Requirements flow to suppliers as structured objects with provenance, not as document attachments. Compliance gaps surface at the design stage, not at delivery or audit.",
          },
          {
            title: "Audit conformance as a system state",
            description:
              "Audit-readiness is continuously maintained by the toolchain, not reconstructed under deadline pressure before a regulator inspection. The cost-of-non-compliance asymmetry (roughly 3×) is the business case in one number.",
          },
        ],
      },
      closingNote:
        "Digital threading is the capability. Our job is to land it inside the engineering toolchain your teams already run — PTC Codebeamer, PTC Windchill, Siemens Polarion, Siemens Teamcenter, IBM DOORS, Jama Connect, IBM Maximo — which is where the value lives.",
    },
    nextStep: {
      eyebrow: "Pair with the knowledge layer",
      title: "Knowledge Management Solutions Implementation",
      description:
        "Once the digital thread is in place, the requirements-rich content corpus it produces is the highest-value input for engineering knowledge search. Our KM Solutions Implementation practice picks up the same corpus and makes it AI-searchable with grounded, cited GenAI — no re-baselining required.",
      href: "/engineering/knowledge-management-implementation",
      ctaLabel: "Explore KM Solutions Implementation →",
    },
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
      addon: {
        badge: "GenAI Layer",
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
        title: "50-Year Well-File Goldfire Knowledge Corpus",
        industry: "GCC National Oil Company",
        scope:
          "Built a Goldfire-powered semantic knowledge corpus for a GCC national oil company covering 50 years of well-file data, OpenText-scanned image archives (OCR-recovered drilling reports, mud logs, well completion records), internal engineering standards, and the international standards portfolio (API, ISO, NACE). Engineers now ask natural-language questions across the full subsurface, drilling, and completions history in seconds — replacing weeks of manual filing-cabinet retrieval. Measurable ROI on well-planning cycle time, lessons-learned reuse, and avoided rework.",
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
    icon: "Shield",
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
