import type { IndustryInfo } from "../types";

export const INDUSTRIES: IndustryInfo[] = [
  {
    id: "oil-gas",
    title: "Oil & Gas",
    description:
      "Deep expertise across upstream, midstream, and downstream operations built on a decade of direct engagement with national oil companies, international oil companies, and energy majors. We understand the engineering realities behind the numbers -- from API 650 tank design to ADNOC's downstream expansion strategy.",
    href: "/industries/oil-gas",
    icon: "Flame",
    heroSubtitle: "Upstream, Midstream & Downstream Intelligence",
    standards: ["API", "ASME", "ASTM", "NACE", "ISO 14001"],
    clients: ["Aramco", "ADNOC", "Shell", "Chevron", "SABIC"],
    challenges: [
      {
        title: "Decarbonization Under Production Pressure",
        description:
          "Operators face mounting pressure to reduce Scope 1 and 2 emissions while maintaining production targets. Balancing net-zero commitments with shareholder returns requires strategic clarity on which transition pathways are economically viable.",
      },
      {
        title: "Digital Maturity Gap in Operations",
        description:
          "Despite significant investment in digital technologies, most upstream and downstream operations remain at early maturity levels. AI and machine learning pilots often fail to scale beyond proof-of-concept, leaving ROI unrealized.",
      },
      {
        title: "Multi-Geography Standards Harmonization",
        description:
          "Operators working across GCC, Asia-Pacific, and Western markets face a patchwork of API, ASME, EN, and national standards. Inconsistent application creates compliance risk and procurement inefficiency.",
      },
      {
        title: "Workforce Knowledge Retention",
        description:
          "The great crew change continues to drain institutional knowledge from engineering organizations. Decades of operational experience walk out the door with retiring engineers, and current knowledge management systems fail to capture tacit expertise.",
      },
    ],
    trends: [
      {
        title: "Green Hydrogen Production at Scale",
        description:
          "The GCC is positioning itself as a global hydrogen export hub. Saudi Arabia's NEOM green hydrogen project and the UAE's hydrogen strategy signal massive production ambitions that will reshape energy trade flows.",
        stat: "600 tonnes/day",
        statSource: "NEOM green hydrogen plant target capacity",
      },
      {
        title: "AI-Driven Predictive Maintenance",
        description:
          "Process industries are deploying machine learning models for equipment failure prediction, moving from time-based to condition-based maintenance. The IEA estimates that digital technologies could reduce upstream operating costs by 10-20%.",
        stat: "10-20%",
        statSource: "IEA estimated upstream cost reduction from digital",
      },
      {
        title: "CCUS Deployment Acceleration",
        description:
          "Carbon capture, utilization, and storage is moving from pilot to commercial scale. The Global CCS Institute tracks over 40 operational CCUS facilities worldwide, with a pipeline of 300+ projects in various stages of development.",
        stat: "300+",
        statSource: "Global CCS Institute project pipeline",
      },
      {
        title: "Methane Emissions Monitoring",
        description:
          "Satellite and IoT-based methane detection is becoming a regulatory requirement, not just best practice. IOGP member companies are committed to near-zero methane emissions through the Oil and Gas Methane Partnership 2.0 (OGMP 2.0).",
        stat: "Near-zero",
        statSource: "IOGP/OGMP 2.0 target commitment",
      },
    ],
    howWeHelp: [
      {
        title: "Energy Transition Roadmaps",
        description:
          "We develop tailored decarbonization pathways grounded in operational reality -- not generic consulting frameworks. Our analysis covers hydrogen, CCUS, renewables, and electrification scenarios specific to your asset portfolio.",
        serviceHref: "/research/energy",
      },
      {
        title: "Standards Compliance Across Geographies",
        description:
          "We map the full standards landscape for multi-geography operations, identifying harmonization opportunities and compliance gaps across API, ASME, EN, and national codes.",
        serviceHref: "/research/standards",
      },
      {
        title: "AI Adoption Readiness Assessment",
        description:
          "We evaluate where AI and digital technologies can deliver real ROI in your operations -- not just what vendors promise, but what actually works in process industry environments.",
        serviceHref: "/research/ai-digitalization",
      },
      {
        title: "Knowledge Management for Engineering",
        description:
          "We deploy semantic search and knowledge management platforms that capture and surface institutional expertise before it walks out the door.",
        serviceHref: "/engineering/knowledge-management-implementation",
      },
    ],
    relevantServices: [
      {
        serviceId: "energy",
        serviceType: "research",
        relevance: "Energy transition, hydrogen, CCUS, and GCC market intelligence",
      },
      {
        serviceId: "standards",
        serviceType: "research",
        relevance: "API/ASME/ASTM standards mapping and compliance advisory",
      },
      {
        serviceId: "ai-digitalization",
        serviceType: "research",
        relevance: "AI adoption in upstream and downstream operations",
      },
      {
        serviceId: "workbench-adoption",
        serviceType: "engineering",
        relevance: "Standards management platform deployment and adoption",
      },
      {
        serviceId: "compliance-advisory",
        serviceType: "engineering",
        relevance: "Engineering compliance and standards strategy",
      },
    ],
    keyStats: [
      {
        value: "$528B",
        label: "Global upstream O&G investment (2024)",
        source: "IEA World Energy Investment",
      },
      {
        value: "700+",
        label: "Active API standards and recommended practices",
        source: "American Petroleum Institute",
      },
      {
        value: "$180B+",
        label: "GCC planned energy investment through 2030",
        source: "MEED Projects",
      },
      {
        value: "11+",
        label: "Years serving O&G engineering organizations",
        source: "intelle.io track record",
      },
    ],
    useCases: [
      {
        title: "Standards Landscape Mapping for a NOC",
        description:
          "A GCC national oil company entering a new downstream product line needed a comprehensive map of every applicable API, ASME, and ASTM standard -- with gap analysis against their existing internal standards library.",
        outcome:
          "Identified 47 missing standards and 12 outdated revisions, enabling compliant product launch.",
      },
      {
        title: "AI Readiness Assessment for Downstream Operations",
        description:
          "An international oil company wanted to understand where AI could deliver measurable ROI in their refining and petrochemical operations, beyond the vendor hype.",
        outcome:
          "Prioritized 5 high-value AI use cases with realistic implementation roadmaps and expected payback periods.",
      },
      {
        title: "Knowledge Management Deployment for a Global EPC",
        description:
          "A leading engineering, procurement, and construction firm needed to capture and surface 30 years of project knowledge across 12 offices worldwide.",
        outcome:
          "Deployed semantic search across 2M+ technical documents, reducing average search time from 45 minutes to under 3 minutes.",
      },
    ],
    standardsDetail: [
      {
        code: "API 650",
        fullName: "Welded Tanks for Oil Storage",
        relevance: "Critical for tank farm design, procurement, and inspection compliance across upstream and downstream facilities.",
      },
      {
        code: "ASME BPVC",
        fullName: "Boiler and Pressure Vessel Code",
        relevance: "Governs the design, fabrication, and inspection of pressure equipment used throughout oil and gas processing.",
      },
      {
        code: "ASTM D4177",
        fullName: "Standard Practice for Automatic Sampling of Petroleum",
        relevance: "Essential for custody transfer measurement and quality control in crude and refined product handling.",
      },
      {
        code: "NACE MR0175",
        fullName: "Sulfide Stress Cracking Resistant Metallic Materials",
        relevance: "Mandatory for materials selection in sour service environments across upstream production and midstream transport.",
      },
      {
        code: "ISO 14001",
        fullName: "Environmental Management Systems",
        relevance: "Framework for environmental management increasingly required by NOCs and IOCs across all operational segments.",
      },
    ],
  },
  {
    id: "aerospace-defense",
    title: "Aerospace & Defense",
    description:
      "Supporting mission-critical engineering programs with standards compliance, technology scouting, and AI adoption research. From DO-178C certification for flight-critical software to MIL-STD compliance for defense platforms, we bring practitioner-grade intelligence to the most demanding engineering environments.",
    href: "/industries/aerospace-defense",
    icon: "Plane",
    heroSubtitle: "Mission-Critical Engineering Intelligence",
    standards: ["MIL-STD", "DO-178C", "AS9100", "ITAR", "FAR/DFARS"],
    clients: ["Boeing", "NASA", "SpaceX", "Lockheed Martin"],
    challenges: [
      {
        title: "ITAR Compliance Complexity",
        description:
          "International Traffic in Arms Regulations create significant friction for global defense programs. Managing ITAR-controlled technical data across international partnerships requires rigorous processes that most organizations struggle to maintain.",
      },
      {
        title: "DO-178C Certification Cost and Timeline",
        description:
          "Airborne software certification under DO-178C (and DO-254 for hardware) remains one of the most expensive and time-consuming aspects of avionics development. At Design Assurance Level A, every line of code requires full traceability.",
      },
      {
        title: "Supply Chain DFARS Compliance",
        description:
          "Defense Federal Acquisition Regulation Supplement (DFARS) requirements, including CMMC 2.0 cybersecurity maturity, are pushing compliance obligations deep into the supply chain. Many Tier 2 and Tier 3 suppliers lack the resources to comply.",
      },
      {
        title: "Model-Based Systems Engineering Adoption",
        description:
          "The shift from document-centric to model-based engineering (MBSE) is mandated by the DoD's Digital Engineering Strategy, but adoption across the industrial base remains uneven and challenging.",
      },
    ],
    trends: [
      {
        title: "Digital Twin Adoption in Defense Programs",
        description:
          "The DoD's Digital Engineering Strategy is driving adoption of digital twins for weapon systems, enabling virtual testing and simulation that reduces development time and cost.",
        stat: "$1.7T",
        statSource: "Global defense spending (SIPRI, 2024)",
      },
      {
        title: "Autonomous Systems Standards Development",
        description:
          "As autonomous air, ground, and maritime vehicles move from R&D to deployment, the industry is racing to develop certification standards for AI-enabled autonomous decision-making.",
        stat: "SAE/EUROCAE",
        statSource: "Working groups on AI certification frameworks",
      },
      {
        title: "Space Commercialization and NewSpace Standards",
        description:
          "The commercial space industry is growing rapidly, but standards for commercial launch systems, satellite manufacturing, and in-orbit servicing are still maturing.",
        stat: "$630B",
        statSource: "Global space economy (Space Foundation, 2024)",
      },
      {
        title: "AI/ML Certification Frameworks",
        description:
          "SAE International (ARP6983) and EUROCAE (ED-324) are developing frameworks for certifying machine learning in safety-critical aerospace applications -- a fundamental shift in how we assure airborne software.",
        stat: "ARP6983",
        statSource: "SAE emerging standard for AI in aerospace",
      },
    ],
    howWeHelp: [
      {
        title: "Standards Mapping for Defense Programs",
        description:
          "We map every applicable MIL-STD, DO-standard, and AS standard for your program, identifying compliance requirements and creating traceability matrices.",
        serviceHref: "/research/standards",
      },
      {
        title: "Technology Scouting for Defense Primes",
        description:
          "We identify emerging technologies, evaluate dual-use innovations, and scout startups with defense-relevant capabilities.",
        serviceHref: "/research/technology-scouting",
      },
      {
        title: "Patent Landscape for Dual-Use Technologies",
        description:
          "We analyze the IP landscape around critical defense technologies -- from autonomous systems to directed energy -- helping you understand competitive positioning.",
        serviceHref: "/research/patent-ip",
      },
      {
        title: "PLM Integration for Requirements Traceability",
        description:
          "We implement requirements management workflows that trace from system requirements through verification, ensuring DO-178C and MIL-STD compliance evidence is always current.",
        serviceHref: "/engineering/plm-integration",
      },
    ],
    relevantServices: [
      {
        serviceId: "standards",
        serviceType: "research",
        relevance: "MIL-STD, DO-178C, AS9100 compliance mapping",
      },
      {
        serviceId: "technology-scouting",
        serviceType: "research",
        relevance: "Emerging defense technology and startup scouting",
      },
      {
        serviceId: "patent-ip",
        serviceType: "research",
        relevance: "IP landscape for dual-use and defense technologies",
      },
      {
        serviceId: "plm-integration",
        serviceType: "engineering",
        relevance: "Requirements traceability and certification evidence",
      },
      {
        serviceId: "compliance-advisory",
        serviceType: "engineering",
        relevance: "Defense program compliance strategy",
      },
    ],
    keyStats: [
      {
        value: "$2.4T",
        label: "Global military expenditure (2024)",
        source: "SIPRI",
      },
      {
        value: "630B",
        label: "Global space economy value",
        source: "Space Foundation",
      },
      {
        value: "5,000+",
        label: "Active MIL-STD and MIL-SPEC documents",
        source: "Defense Standardization Program",
      },
      {
        value: "Level A-E",
        label: "DO-178C Design Assurance Levels we support",
        source: "RTCA",
      },
    ],
    useCases: [
      {
        title: "MIL-STD Compliance Mapping for a New Platform",
        description:
          "A defense prime contractor needed to identify and map every applicable MIL-STD and MIL-SPEC for a new ground vehicle platform, including environmental, electromagnetic, and safety standards.",
        outcome:
          "Delivered a comprehensive compliance matrix covering 120+ applicable standards with gap analysis against existing qualifications.",
      },
      {
        title: "Technology Scouting for Autonomous UAV Subsystems",
        description:
          "A Tier 1 defense contractor needed to identify commercial technology providers for autonomous sense-and-avoid, edge computing, and secure communications subsystems.",
        outcome:
          "Screened 85 companies across 4 technology domains, delivering 12 qualified candidates with validated technical capabilities.",
      },
    ],
    standardsDetail: [
      {
        code: "MIL-STD-810",
        fullName: "Environmental Engineering Considerations and Laboratory Tests",
        relevance: "Defines environmental test methods for defense equipment -- temperature, humidity, vibration, shock, and altitude.",
      },
      {
        code: "DO-178C",
        fullName: "Software Considerations in Airborne Systems and Equipment Certification",
        relevance: "The primary standard for certifying airborne software. Compliance is mandatory for FAA and EASA certification.",
      },
      {
        code: "AS9100",
        fullName: "Quality Management Systems for Aviation, Space, and Defense",
        relevance: "The aerospace industry's quality management standard, based on ISO 9001 with additional aerospace-specific requirements.",
      },
      {
        code: "ITAR",
        fullName: "International Traffic in Arms Regulations",
        relevance: "Controls the export of defense articles and services. Non-compliance carries severe criminal and civil penalties.",
      },
      {
        code: "DFARS 252.204-7012",
        fullName: "Safeguarding Covered Defense Information",
        relevance: "Cybersecurity requirements for defense contractors handling Controlled Unclassified Information (CUI).",
      },
    ],
  },
  {
    id: "medical-devices",
    title: "Medical Devices",
    description:
      "Navigating one of the most complex regulatory landscapes in engineering. We help device manufacturers understand and comply with FDA, EU MDR, and international standards -- from design controls under ISO 13485 to software lifecycle management under IEC 62304.",
    href: "/industries/medical-devices",
    icon: "Heart",
    heroSubtitle: "Regulatory Intelligence for Device Manufacturers",
    standards: ["ISO 13485", "FDA 21 CFR Part 820", "EU MDR", "IEC 62304"],
    clients: ["Device manufacturers worldwide"],
    challenges: [
      {
        title: "EU MDR Transition Complexity",
        description:
          "The transition from the Medical Devices Directive (MDD) to the Medical Device Regulation (EU MDR 2017/745) has created enormous compliance burden. Extended timelines have provided temporary relief, but the underlying technical documentation requirements remain significant.",
      },
      {
        title: "Software as Medical Device Classification",
        description:
          "The rise of AI/ML-based diagnostic and clinical decision support software has outpaced regulatory frameworks. FDA's PCCP (Predetermined Change Control Plan) and IMDRF's SaMD guidance are still evolving.",
      },
      {
        title: "FDA 510(k) and PMA Submission Burden",
        description:
          "The depth of clinical evidence, biocompatibility data, and design verification required for FDA submissions continues to increase. Organizations need strategic regulatory intelligence to navigate evolving expectations.",
      },
      {
        title: "Post-Market Surveillance Requirements",
        description:
          "Both FDA and EU MDR require robust post-market surveillance and vigilance reporting. Building systems that capture and analyze real-world performance data is a significant operational challenge.",
      },
    ],
    trends: [
      {
        title: "AI/ML-Based SaMD Regulatory Evolution",
        description:
          "FDA has authorized over 950 AI/ML-enabled medical devices, and regulatory frameworks for continuous learning systems are being developed under the Total Product Lifecycle approach.",
        stat: "950+",
        statSource: "FDA-authorized AI/ML medical devices",
      },
      {
        title: "Cybersecurity Standards for Connected Devices",
        description:
          "IEC 81001-5-1 (Health Software Security) and FDA's premarket cybersecurity guidance are making security-by-design a regulatory requirement, not just best practice.",
        stat: "IEC 81001-5-1",
        statSource: "New health software security standard",
      },
      {
        title: "Real-World Evidence Integration",
        description:
          "Regulators are increasingly accepting real-world data (RWD) and real-world evidence (RWE) to support regulatory decisions, expanding post-market evidence requirements.",
        stat: "RWE",
        statSource: "FDA Real-World Evidence Framework",
      },
      {
        title: "Digital Health and Remote Monitoring",
        description:
          "Connected devices, wearables, and remote patient monitoring create new regulatory categories and standards requirements around data integrity, interoperability, and clinical validation.",
        stat: "$350B+",
        statSource: "Global digital health market projection (2028)",
      },
    ],
    howWeHelp: [
      {
        title: "Regulatory Landscape Mapping",
        description:
          "We map the complete regulatory and standards landscape for your device category across target markets -- FDA, EU MDR, MDSAP, and beyond.",
        serviceHref: "/research/standards",
      },
      {
        title: "AI/ML Regulatory Strategy",
        description:
          "We help device companies navigate the evolving FDA and EU frameworks for AI/ML-based software as a medical device.",
        serviceHref: "/research/ai-digitalization",
      },
      {
        title: "Compliance Gap Analysis",
        description:
          "We audit your quality management system and design controls against ISO 13485, FDA QSR, and EU MDR technical documentation requirements.",
        serviceHref: "/engineering/compliance-advisory",
      },
    ],
    relevantServices: [
      {
        serviceId: "standards",
        serviceType: "research",
        relevance: "ISO 13485, EU MDR, FDA compliance mapping",
      },
      {
        serviceId: "ai-digitalization",
        serviceType: "research",
        relevance: "AI/ML regulatory strategy for SaMD",
      },
      {
        serviceId: "compliance-advisory",
        serviceType: "engineering",
        relevance: "QMS and design control compliance",
      },
    ],
    keyStats: [
      {
        value: "$600B+",
        label: "Global medical device market (2024)",
        source: "Fortune Business Insights",
      },
      {
        value: "950+",
        label: "FDA-authorized AI/ML medical devices",
        source: "FDA",
      },
      {
        value: "2027",
        label: "Final EU MDR transition deadline for legacy devices",
        source: "European Commission",
      },
      {
        value: "190+",
        label: "Countries recognizing ISO 13485",
        source: "ISO",
      },
    ],
    useCases: [
      {
        title: "EU MDR Gap Analysis for a Device Portfolio",
        description:
          "A mid-size device manufacturer needed to assess their entire portfolio of 35 Class IIa and IIb devices against EU MDR technical documentation requirements.",
        outcome:
          "Identified critical gaps in clinical evaluation, post-market surveillance, and UDI compliance, with a prioritized remediation roadmap.",
      },
      {
        title: "Standards Mapping for a Connected Monitoring Device",
        description:
          "A startup developing a wireless patient monitoring device needed to understand every applicable FDA guidance, IEC standard, and cybersecurity requirement before design freeze.",
        outcome:
          "Delivered a comprehensive standards map covering 28 applicable standards across safety, EMC, cybersecurity, and clinical validation.",
      },
    ],
    standardsDetail: [
      {
        code: "ISO 13485",
        fullName: "Medical Devices Quality Management Systems",
        relevance: "The foundation QMS standard for medical device design, development, production, and servicing worldwide.",
      },
      {
        code: "21 CFR 820",
        fullName: "FDA Quality System Regulation (QSR)",
        relevance: "US FDA's quality system requirements for medical devices, being harmonized with ISO 13485 under QMSR.",
      },
      {
        code: "EU MDR 2017/745",
        fullName: "European Medical Device Regulation",
        relevance: "The comprehensive EU framework replacing the MDD, with significantly enhanced requirements for clinical evidence and post-market surveillance.",
      },
      {
        code: "IEC 62304",
        fullName: "Medical Device Software Lifecycle Processes",
        relevance: "Defines the software development lifecycle requirements for medical device software, including safety classification.",
      },
    ],
  },
  {
    id: "manufacturing",
    title: "Manufacturing",
    description:
      "Supporting global OEMs, Tier 1 suppliers, and contract manufacturers with quality management, standards compliance, and digital transformation intelligence. From ISO 9001 quality systems to IATF 16949 automotive requirements, we help manufacturing organizations build and maintain competitive advantage through standards excellence.",
    href: "/industries/manufacturing",
    icon: "Settings",
    heroSubtitle: "Quality, Compliance & Digital Transformation",
    standards: ["ISO 9001", "ISO 14001", "IATF 16949", "ISO 45001"],
    clients: ["Global OEMs and suppliers"],
    challenges: [
      {
        title: "Quality Management Across Global Plants",
        description:
          "Maintaining consistent quality management systems across manufacturing facilities in different countries, each subject to local regulatory requirements, is a persistent operational challenge.",
      },
      {
        title: "Industry 4.0 ROI Uncertainty",
        description:
          "Despite significant investment in smart manufacturing, IoT, and digital twin technologies, many manufacturers struggle to demonstrate clear ROI. Pilot projects frequently fail to scale to production.",
      },
      {
        title: "Supply Chain Standards Harmonization",
        description:
          "Ensuring suppliers across multi-tier supply chains meet consistent quality and compliance standards is increasingly difficult. Automotive (IATF 16949), aerospace (AS9100), and general manufacturing (ISO 9001) each impose different requirements.",
      },
      {
        title: "ESG and Sustainability Reporting",
        description:
          "New regulatory requirements around carbon reporting (Scope 3), lifecycle assessment, and circular economy practices are creating compliance obligations that manufacturing organizations are not yet equipped to meet.",
      },
    ],
    trends: [
      {
        title: "Digital Thread and Digital Twin",
        description:
          "The digital thread -- connecting product data from design through manufacturing, operation, and service -- is becoming essential for traceability and continuous improvement.",
        stat: "$73B",
        statSource: "Global digital twin market projection (2027)",
      },
      {
        title: "Additive Manufacturing Qualification Standards",
        description:
          "As 3D printing moves from prototyping to production, standards for qualifying additively manufactured parts (ASTM F42, ISO/TC 261) are becoming critical for aerospace, medical, and automotive applications.",
        stat: "ASTM F42",
        statSource: "Additive Manufacturing standards committee",
      },
      {
        title: "Circular Economy and Lifecycle Assessment",
        description:
          "ISO 14040/14044 lifecycle assessment standards and emerging circular economy frameworks are driving manufacturers to design for recyclability and measure environmental impact across the full product lifecycle.",
        stat: "ISO 14040",
        statSource: "Lifecycle assessment methodology standard",
      },
      {
        title: "Industrial IoT Security Standards",
        description:
          "IEC 62443 (Industrial Automation Security) is becoming mandatory for connected manufacturing environments, adding cybersecurity to the already complex compliance landscape.",
        stat: "IEC 62443",
        statSource: "Industrial cybersecurity standard series",
      },
    ],
    howWeHelp: [
      {
        title: "Multi-Site QMS Harmonization",
        description:
          "We audit and harmonize quality management systems across global manufacturing footprints, ensuring consistent compliance with ISO 9001, IATF 16949, and customer-specific requirements.",
        serviceHref: "/engineering/compliance-advisory",
      },
      {
        title: "Digital Transformation Readiness",
        description:
          "We assess manufacturing organizations' digital maturity and identify where Industry 4.0 technologies can deliver measurable operational improvement.",
        serviceHref: "/research/ai-digitalization",
      },
      {
        title: "Standards Portfolio Optimization",
        description:
          "We audit standards subscriptions against actual engineering usage, identifying redundancies and gaps that affect both cost and compliance.",
        serviceHref: "/engineering/workbench-adoption",
      },
    ],
    relevantServices: [
      {
        serviceId: "standards",
        serviceType: "research",
        relevance: "ISO 9001, IATF 16949, ISO 14001 standards intelligence",
      },
      {
        serviceId: "ai-digitalization",
        serviceType: "research",
        relevance: "Industry 4.0 and digital maturity assessment",
      },
      {
        serviceId: "compliance-advisory",
        serviceType: "engineering",
        relevance: "QMS compliance and maturity assessment",
      },
      {
        serviceId: "workbench-adoption",
        serviceType: "engineering",
        relevance: "Standards management platform deployment",
      },
    ],
    keyStats: [
      {
        value: "1.2M+",
        label: "ISO 9001 certificates worldwide",
        source: "ISO Survey",
      },
      {
        value: "$15T",
        label: "Global manufacturing value added",
        source: "World Bank",
      },
      {
        value: "IATF 16949",
        label: "Required by all major automotive OEMs",
        source: "IATF",
      },
      {
        value: "IEC 62443",
        label: "Emerging requirement for smart factories",
        source: "IEC",
      },
    ],
    useCases: [
      {
        title: "Standards Harmonization for a Multi-Plant OEM",
        description:
          "A global industrial manufacturer with 8 plants across 5 countries needed to harmonize their quality documentation and standards library across ISO 9001, ISO 14001, and customer-specific automotive requirements.",
        outcome:
          "Consolidated 3 separate standards management systems into one, reducing redundant subscriptions by 30% and audit preparation time by 40%.",
      },
      {
        title: "Digital Maturity Assessment for Smart Manufacturing",
        description:
          "A Tier 1 automotive supplier wanted to benchmark their digital maturity against industry peers and develop a realistic Industry 4.0 roadmap.",
        outcome:
          "Identified 7 high-value digital use cases with clear ROI projections, prioritized into a 3-year implementation roadmap.",
      },
    ],
    standardsDetail: [
      {
        code: "ISO 9001",
        fullName: "Quality Management Systems Requirements",
        relevance: "The world's most widely adopted quality management standard, providing the foundation for quality systems across all manufacturing sectors.",
      },
      {
        code: "IATF 16949",
        fullName: "Automotive Quality Management System Standard",
        relevance: "Required by all major automotive OEMs for their supply chain. Extends ISO 9001 with automotive-specific process and product requirements.",
      },
      {
        code: "ISO 14001",
        fullName: "Environmental Management Systems",
        relevance: "Framework for environmental management that is increasingly required by customers and regulators in manufacturing supply chains.",
      },
      {
        code: "ISO 45001",
        fullName: "Occupational Health and Safety Management Systems",
        relevance: "The global standard for occupational health and safety, replacing OHSAS 18001 and increasingly expected by regulators and customers.",
      },
    ],
  },
];
