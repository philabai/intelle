-- intelle.io Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- ============================================
-- Articles table (Blog/Insights CMS)
-- ============================================
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  category TEXT NOT NULL DEFAULT 'insight'
    CHECK (category IN ('insight', 'case-study', 'whitepaper', 'news')),
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  author_name TEXT DEFAULT 'intelle.io',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Public read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

-- Service role has full access (admin API routes use service client)
CREATE POLICY "Service role full access on articles"
  ON public.articles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_category ON public.articles(category);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Contact submissions table
-- ============================================
CREATE TABLE public.contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  service_interest TEXT,
  message TEXT NOT NULL,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- No public access -- service role only
CREATE POLICY "Service role full access on contact_submissions"
  ON public.contact_submissions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX idx_contact_submissions_created ON public.contact_submissions(created_at DESC);

-- ============================================
-- Newsletter subscribers (optional, for future)
-- ============================================
CREATE TABLE public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on newsletter"
  ON public.newsletter_subscribers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- Set admin role for a user (run after creating user in Auth)
-- Replace 'your-admin-email@intelle.io' with actual email
-- ============================================
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'your-admin-email@intelle.io';

-- ============================================
-- Seed data: 10 deep articles
-- ============================================
INSERT INTO public.articles (slug, title, body, excerpt, category, tags, author_name, status, published_at) VALUES

-- ARTICLE 1: GCC Energy Transition (expanded)
(
  'energy-transition-gcc-2026',
  'The GCC Energy Transition: Opportunities and Challenges in 2026',
  E'## Overview\n\nThe Gulf Cooperation Council (GCC) countries are at a pivotal moment in their energy transition journey. With ambitious national visions and massive investments in renewable energy, hydrogen, and carbon capture technologies, the region is positioning itself as a global leader in sustainable energy -- while simultaneously maximizing the value of its hydrocarbon endowment.\n\nThis is not an either-or transition. It is a managed evolution, and organizations operating in or selling to the GCC energy sector need to understand its specific contours.\n\n## The Hydrogen Ambition\n\nSaudi Arabia''s NEOM green hydrogen project, developed by ACWA Power and Air Products, targets 600 tonnes per day of green hydrogen production -- making it one of the world''s largest facilities. The UAE''s hydrogen strategy aims for 1.4 million tonnes per annum by 2031, covering green, blue, and pink hydrogen pathways.\n\nFor organizations evaluating the hydrogen opportunity, the key questions are not whether hydrogen will scale, but which production pathway will dominate in which geography, and what the downstream offtake commitments look like.\n\n## Solar and Wind: Price Discovery Complete\n\nGCC solar tariffs have reached levels that make solar cost-competitive with gas-fired generation in most scenarios. DEWA''s Mohammed bin Rashid Solar Park and Saudi Arabia''s NEOM solar projects have set benchmark tariffs below $0.02/kWh. The focus is now shifting from price to execution: grid integration, storage coupling, and long-term performance guarantees.\n\nWind is earlier in its GCC journey, but Saudi Arabia''s National Renewable Energy Program includes significant onshore wind targets that will create supply chain opportunities.\n\n## CCUS: Moving from Pilot to Scale\n\nThe Global CCS Institute tracks over 300 CCUS projects worldwide in various development stages. In the GCC, ADNOC''s Al Reyadah facility in Abu Dhabi captures 800,000 tonnes of CO2 per year, and Saudi Aramco has announced expanded CCUS ambitions tied to its net-zero-by-2060 commitment.\n\nFor engineering service providers, the CCUS opportunity lies in project-specific technical studies: reservoir characterization, capture technology selection, pipeline routing, and monitoring protocols.\n\n## Carbon Markets and ESG\n\nThe UAE launched its voluntary carbon credit trading exchange (ACX) and the region is developing compliance carbon market frameworks. This creates demand for carbon accounting expertise, ESG reporting infrastructure, and emissions verification services.\n\n## Key Takeaways\n\n- The GCC energy transition is an evolution, not a revolution -- hydrocarbon and renewable strategies are running in parallel\n- Hydrogen standards (ISO/TC 197, IEC/TC 105) are still maturing, creating both risk and opportunity for early movers\n- CCUS is moving from demonstration to commercial deployment, requiring engineering-grade feasibility studies\n- Organizations should invest in understanding the specific regulatory and standards landscape of each GCC country, as frameworks differ significantly between Saudi Arabia, UAE, Qatar, and Oman\n\n*For bespoke intelligence on GCC energy markets, [contact our energy research team](/contact).*',
  'An analysis of the energy transition landscape across GCC countries, covering hydrogen production ambitions, renewable energy deployment, CCUS acceleration, and carbon market development.',
  'insight',
  ARRAY['energy', 'gcc', 'hydrogen', 'renewables', 'ccus'],
  'Arnab Ghosh',
  'published',
  now() - interval '1 day'
),

-- ARTICLE 2: GenAI Engineering Documentation (expanded)
(
  'ai-engineering-documentation-2026',
  'How GenAI is Transforming Engineering Documentation',
  E'## The Documentation Challenge\n\nEngineering organizations generate enormous volumes of technical documentation -- design specifications, compliance reports, test procedures, maintenance manuals, and standards interpretations. A typical aerospace program may involve 50,000+ pages of certification evidence. A refinery turnaround generates thousands of inspection reports.\n\nManaging this knowledge has traditionally been manual, time-consuming, and fragile. Engineers spend an estimated 30-40% of their time searching for information rather than engineering. When they can''t find existing work, they recreate it -- at significant cost.\n\n## Where GenAI Actually Works\n\nNot all GenAI applications are created equal in engineering. After evaluating dozens of implementations across regulated industries, we see three areas where GenAI is delivering measurable value:\n\n### 1. Automated Standards Mapping\n\nAI can now map internal engineering procedures against applicable industry standards (API, ASME, ISO, MIL-STD), identifying gaps, outdated references, and compliance risks. This was previously a multi-week manual exercise for a standards management team. With AI-assisted mapping, initial gap identification can be completed in days.\n\nThe critical requirement: the AI must understand domain-specific terminology. Generic language models confuse API 650 (welded tanks) with web APIs. Domain-tuned models, or retrieval-augmented generation (RAG) architectures grounded in standards databases, are essential.\n\n### 2. Semantic Search Across Technical Knowledge Bases\n\nSemantic search powered by large language models enables engineers to find relevant information using natural language queries across thousands of documents. Rather than keyword matching ("API 650 Section 5.6.2"), an engineer can ask "what are the welding requirements for carbon steel storage tanks in sour service?" and get relevant results from internal procedures, applicable standards, and historical project documents.\n\nOur experience deploying semantic search at engineering organizations shows that average search time drops from 30-45 minutes to under 3 minutes when the system is properly configured with domain-specific taxonomies.\n\n### 3. Draft Document Generation\n\nGenAI can draft technical reports, compliance documentation, design review meeting minutes, and change request descriptions based on structured inputs. The key word is "draft" -- human review remains essential in regulated environments, but the productivity gain from starting with a well-structured draft rather than a blank page is significant.\n\n## Where GenAI Fails in Engineering\n\nNot every use case works. We''ve seen failures in:\n\n- **Automated design calculations** -- LLMs are not calculators and should not be trusted for numerical engineering analysis\n- **Regulatory interpretation** -- determining whether a product meets a specific regulatory requirement requires judgment that AI cannot reliably provide\n- **Safety-critical decision support** -- DO-178C, IEC 62304, and similar standards require deterministic, verifiable processes that probabilistic AI models cannot satisfy\n\n## Implementation Recommendations\n\n1. **Start with search, not generation** -- semantic search has the highest ROI and lowest risk profile for engineering organizations\n2. **Invest in data quality** -- AI is only as good as the knowledge base it searches. Clean, tagged, and well-organized document repositories are prerequisites\n3. **Keep humans in the loop** -- especially in regulated industries, AI should augment human judgment, not replace it\n4. **Measure actual time savings** -- track search times, document creation times, and rework rates before and after AI deployment\n\n*For an assessment of AI opportunities specific to your engineering organization, [explore our AI & Digitalization Research services](/research/ai-digitalization).*',
  'A practitioner analysis of where Generative AI delivers real value in engineering documentation and where it falls short, based on real deployment experience.',
  'insight',
  ARRAY['ai', 'genai', 'engineering', 'documentation', 'semantic-search'],
  'Arnab Ghosh',
  'published',
  now() - interval '3 days'
),

-- ARTICLE 3: Standards Compliance Digital Transformation (expanded)
(
  'standards-compliance-digital-transformation',
  'The Standards Intelligence Gap: Why Most Companies Fly Blind',
  E'## The Problem No One Talks About\n\nMost engineering organizations spend significant budgets on standards subscriptions -- API, ASME, ISO, IEC, ASTM, MIL-STD. But few have a strategic approach to managing those standards. The typical pattern looks like this:\n\n- Standards are purchased reactively, usually when a specific project or customer requires them\n- There is no single inventory of which standards the organization holds, which versions are current, and which engineering functions use them\n- Standards compliance is checked manually, often by individual engineers who may or may not have access to the latest revision\n- When standards are updated, the organization learns about it months later -- sometimes only when a customer or regulator points it out\n\nThis is the standards intelligence gap, and it creates real business risk.\n\n## The Cost of Flying Blind\n\n### Compliance Risk\n\nUsing an outdated standard revision in a regulated industry can result in audit findings, product holds, customer rejections, or worse. In aerospace (AS9100) and medical devices (ISO 13485), standards currency is an auditable requirement.\n\n### Procurement Waste\n\nOrganizations routinely maintain overlapping or unused standards subscriptions because no one has a clear picture of what they have versus what they need. We routinely find 20-30% redundancy in enterprise standards portfolios.\n\n### Knowledge Fragmentation\n\nWhen standards knowledge lives in individual engineers'' heads rather than in organizational systems, it walks out the door with every retirement, resignation, or reorganization.\n\n### Missed Regulatory Signals\n\nNew standards and revisions often signal upcoming regulatory changes. Organizations that don''t systematically scan for standards updates miss early warning signals that could affect product development timelines and market access.\n\n## What a Modern Standards Intelligence Practice Looks Like\n\n### 1. Standards Portfolio Audit\n\nStart by building a complete inventory: what standards do you hold, what versions, who uses them, and for what purpose? Map this against your product portfolio and regulatory requirements to identify gaps and redundancies.\n\n### 2. Workflow Integration\n\nStandards compliance should be embedded in existing engineering workflows -- design review gates, procurement processes, and quality checkpoints. If compliance checking is a separate activity, it will always be an afterthought.\n\n### 3. Digital Tracking and Alerts\n\nModern standards management platforms can automatically track revision updates, alert relevant stakeholders, and maintain compliance dashboards. The technology exists; the challenge is organizational adoption.\n\n### 4. Continuous Monitoring\n\nRegulatory horizon scanning should be a continuous process, not an annual exercise. New and revised standards from key SDOs (ISO, IEC, API, ASME) should be evaluated for business impact on a rolling basis.\n\n## The Organizational Challenge\n\nThe biggest barrier to effective standards intelligence is organizational, not technological. Standards management typically falls between engineering and legal/regulatory affairs, with neither team having full ownership. Creating a clear accountability structure -- whether through a dedicated standards management function or a cross-functional standards committee -- is the essential first step.\n\n## Key Takeaways\n\n- Most organizations lack visibility into their own standards portfolio and compliance status\n- The cost of this gap is measured in audit findings, procurement waste, and missed regulatory signals\n- Building a standards intelligence practice starts with a portfolio audit and ends with continuous monitoring\n- The organizational challenge (ownership and accountability) is bigger than the technology challenge\n\n*intelle.io offers [Standards & Regulatory Intelligence](/research/standards) services and [Engineering Compliance Advisory](/engineering/compliance-advisory) to help organizations close this gap.*',
  'Most engineering organizations lack strategic standards management, creating compliance risk, procurement waste, and regulatory blind spots. Here is how to build a standards intelligence practice.',
  'insight',
  ARRAY['standards', 'compliance', 'digital-transformation', 'engineering'],
  'Arnab Ghosh',
  'published',
  now() - interval '5 days'
),

-- ARTICLE 4: Hydrogen Standards for NOCs
(
  'hydrogen-standards-nocs-2026',
  'What NOCs Should Know About Hydrogen Standards in 2026',
  E'## The Standards Landscape is Still Forming\n\nNational oil companies entering the hydrogen economy face a standards landscape that is still under active development. Unlike mature hydrocarbon operations where API, ASME, and national codes provide comprehensive coverage, hydrogen production, storage, transport, and end-use applications are governed by a patchwork of standards at varying levels of maturity.\n\nThis creates both risk and opportunity for NOCs. Risk, because building infrastructure against incomplete standards may require costly retrofits as regulations solidify. Opportunity, because organizations that engage early with standards development bodies can shape the frameworks that will govern the industry.\n\n## Key Standards Bodies and Their Work\n\n### ISO/TC 197: Hydrogen Technologies\n\nISO Technical Committee 197 is the primary international body for hydrogen standards. Key published standards include:\n\n- **ISO 19880 series** -- Hydrogen fueling stations\n- **ISO 22734** -- Hydrogen generators using water electrolysis\n- **ISO 16110** -- Hydrogen generators using fuel processing\n- **ISO 13985** -- Liquid hydrogen land vehicle fuel tanks\n\nSeveral critical standards are still in development, particularly around large-scale hydrogen transport and underground storage.\n\n### IEC/TC 105: Fuel Cell Technologies\n\nIEC Technical Committee 105 covers fuel cell standards for stationary, portable, and transport applications. The **IEC 62282 series** provides the framework for fuel cell safety, performance, and testing.\n\n### ASME and CGA\n\nASME provides pressure vessel and piping codes applicable to hydrogen service (ASME BPVC Section VIII, B31.12 Hydrogen Piping), while the Compressed Gas Association (CGA) provides guidelines for hydrogen safety and handling.\n\n### National and Regional Frameworks\n\nEach GCC country is developing its own hydrogen regulatory framework. Saudi Arabia''s standards body (SASO), the UAE''s ESMA, and Qatar''s QS are all working on national hydrogen standards that may reference or diverge from international frameworks.\n\n## What This Means for NOCs\n\n### 1. Standards Mapping Before Investment\n\nBefore committing capital to hydrogen projects, NOCs should commission a comprehensive standards landscape mapping exercise. This should identify every applicable standard for the planned hydrogen value chain -- production, compression, storage, transport, and end-use -- across target jurisdictions.\n\n### 2. Engage with Standards Development\n\nNOCs have the resources and technical expertise to participate in standards development through national mirror committees. This provides early visibility into upcoming requirements and the ability to influence frameworks.\n\n### 3. Plan for Standards Evolution\n\nDesign hydrogen infrastructure with flexibility for standards updates. Where standards are still developing, document design decisions and the standards basis used, so future compliance assessments have a clear baseline.\n\n### 4. Harmonization Challenges\n\nNOCs operating across multiple countries will face harmonization challenges as national hydrogen frameworks diverge. A proactive approach to mapping and managing these differences will reduce compliance costs.\n\n## Key Takeaways\n\n- Hydrogen standards are less mature than hydrocarbon standards -- design decisions made today may need to be revisited as frameworks solidify\n- ISO/TC 197 and IEC/TC 105 are the primary international bodies, but national frameworks are developing independently\n- Standards landscape mapping should precede hydrogen investment decisions\n- Early engagement with standards development bodies provides strategic advantage\n\n*For hydrogen standards intelligence tailored to your organization, [contact our energy research team](/contact).*',
  'The hydrogen standards landscape is still forming. Here is what national oil companies need to know about ISO/TC 197, IEC/TC 105, and national frameworks before committing capital.',
  'insight',
  ARRAY['hydrogen', 'standards', 'NOC', 'energy-transition', 'ISO'],
  'Arnab Ghosh',
  'published',
  now() - interval '7 days'
),

-- ARTICLE 5: Workbench Investment Underperforming
(
  'workbench-investment-underperforming',
  'Five Signs Your Engineering Workbench Investment is Underperforming',
  E'## You Bought the Platform. Are You Getting the Value?\n\nEngineering standards management platforms like Accuris Engineering Workbench represent significant enterprise investments. Yet in our experience working with 65+ enterprise customers, fewer than 30% achieve the ROI they expected at the time of purchase.\n\nThe platform isn''t the problem. The gap between purchasing a standards management tool and realizing its value is filled with workflow design, organizational change management, and ongoing optimization -- areas where most vendors offer limited support.\n\nHere are five signs that your investment is underperforming.\n\n## 1. Low Daily Active Usage\n\nIf your usage analytics show that fewer than 40% of licensed users access the platform weekly, you have an adoption problem. The most common causes:\n\n- Engineers don''t know the platform exists or what it does\n- Access requires too many clicks or a separate login\n- The platform doesn''t integrate with the tools engineers already use\n- Training was a one-time event rather than an ongoing program\n\nThe fix starts with understanding *why* engineers aren''t using the tool, not just *that* they aren''t.\n\n## 2. Standards Currency Drift\n\nIf your engineering teams are working from outdated standard revisions -- and discovering this only during audits or customer reviews -- your platform is not configured for proactive currency management. Modern standards management tools can alert stakeholders automatically when revisions are published. If this isn''t happening, the alerting workflows haven''t been set up.\n\n## 3. No Connection to Engineering Workflows\n\nA standards management platform that exists as a standalone reference library misses its primary value proposition. Standards should be embedded in design review gates, procurement approval workflows, and quality checkpoint processes. If your engineers still go to a separate system (or worse, a shared drive) to check standards applicability, the workflow integration hasn''t been completed.\n\n## 4. Compliance Reporting is Manual\n\nIf preparing for internal audits, customer reviews, or regulatory inspections requires your team to manually compile standards compliance evidence, you''re not using the platform''s reporting capabilities. Automated compliance dashboards and KPI tracking should be producing this evidence continuously.\n\n## 5. No Executive Visibility\n\nIf your engineering leadership cannot answer basic questions -- "How many standards do we manage?", "What percentage are current?", "Which functions have the highest compliance risk?" -- then the platform is not producing the management intelligence it should.\n\n## What to Do About It\n\nThe common thread across all five signs is the same: the platform was deployed but not *implemented*. Deployment is installing the software. Implementation is redesigning workflows, training users, integrating with existing systems, and establishing ongoing optimization.\n\nThe organizations that achieve full ROI from their standards management investment follow a structured adoption program:\n\n1. **Assessment** -- Understand current usage, identify gaps, map pain points\n2. **Workflow redesign** -- Embed standards into existing engineering processes\n3. **Training** -- Role-specific, ongoing, with champion programs\n4. **Configuration** -- Alerts, dashboards, reporting, integrations\n5. **Optimization** -- Quarterly reviews, usage analytics, continuous improvement\n\n*intelle.io has spent 11+ years helping enterprises maximize the value of their engineering standards platforms. [Learn about our Workbench Adoption services](/engineering/workbench-adoption) or [schedule a free diagnostic call](/contact).*',
  'Most enterprises achieve less than 30% of expected ROI from standards management platforms. Here are the warning signs and how to fix them.',
  'insight',
  ARRAY['workbench', 'adoption', 'ROI', 'engineering', 'standards'],
  'Arnab Ghosh',
  'published',
  now() - interval '10 days'
),

-- ARTICLE 6: Patent Landscape Analysis
(
  'patent-landscape-analysis-guide',
  'Patent Landscape Analysis: When and Why It Matters',
  E'## What Is a Patent Landscape Analysis?\n\nA patent landscape analysis is a systematic examination of patent data within a specific technology area, market, or competitive domain. It maps the intellectual property terrain -- identifying who is patenting what, where, and how the landscape is evolving over time.\n\nUnlike a patentability search (which asks "is my invention novel?") or a freedom-to-operate study (which asks "can I sell this product without infringing?"), a landscape analysis asks the strategic question: "what does the IP map look like, and what does it tell us about competitive dynamics and innovation opportunities?"\n\n## When Organizations Need One\n\n### Before Major R&D Investment\n\nBefore committing significant R&D budget to a technology area, a landscape analysis reveals who the major players are, where the patent density is highest, and where white space exists. This prevents duplicating existing IP and helps focus R&D investment on areas where differentiation is achievable.\n\n### During M&A Due Diligence\n\nWhen evaluating acquisition targets, the quality and breadth of the target''s patent portfolio is a critical valuation factor. A landscape analysis can reveal whether the target''s IP is truly differentiated, whether it''s at risk from competitors'' portfolios, and whether there are gaps that would require post-acquisition investment.\n\n### For Competitive Intelligence\n\nPatent filings are one of the most reliable leading indicators of competitors'' technology strategies. A company''s patent portfolio reveals where they''re investing R&D, which markets they''re targeting (via filing jurisdictions), and how their innovation focus is shifting over time.\n\n### When Entering a New Technology Area\n\nOrganizations diversifying into new technology domains need to understand the existing IP landscape before designing products or processes. This is particularly critical in fields like autonomous systems, hydrogen technologies, and AI-enabled medical devices where patent density is rapidly increasing.\n\n## What a Good Landscape Analysis Looks Like\n\n### Data Scope\n\nA comprehensive analysis typically examines 1,000 to 10,000+ patent families across target patent offices (USPTO, EPO, WIPO, CNIPA, JPO, KIPO). The scope is defined by IPC/CPC classification codes, keyword strategies, and assignee lists.\n\n### Key Outputs\n\n- **Filing trend analysis** -- how patenting activity has evolved over time, indicating technology maturity and investment levels\n- **Key player mapping** -- who holds the most patents, who is filing most actively, and who has the strongest portfolio quality\n- **Technology clustering** -- grouping patents by sub-technology area to reveal focus areas and white space\n- **Geographic analysis** -- where patents are filed reveals target markets and regulatory strategies\n- **Citation analysis** -- which patents are most cited (most influential) and which cite each other (technology lineages)\n- **White space identification** -- technology areas with low patent density that represent innovation opportunities\n\n### Strategic Interpretation\n\nThe difference between a useful landscape analysis and a data dump is strategic interpretation. Raw charts and tables are not actionable. The analysis should answer specific business questions: Where should we invest? Who should we watch? What should we avoid? Where can we establish IP leadership?\n\n## Common Mistakes\n\n1. **Too broad a scope** -- trying to map an entire technology field produces noise, not insight. Focus on the specific decision you need to make.\n2. **Over-reliance on automated tools** -- AI-based patent analytics tools are useful for initial screening but cannot replace human judgment in strategic interpretation\n3. **Ignoring non-patent literature** -- academic publications, conference proceedings, and technical reports provide essential context that patent data alone cannot\n4. **Point-in-time analysis** -- the landscape changes continuously. One-time analyses become stale within 6-12 months in fast-moving technology areas\n\n*intelle.io provides [Patent & IP Intelligence](/research/patent-ip) services for organizations that need strategic IP analysis with senior-level interpretation. [Schedule a consultation](/contact).*',
  'A practical guide to patent landscape analysis: when organizations need one, what it should include, and the common mistakes that undermine its value.',
  'whitepaper',
  ARRAY['patent', 'IP', 'landscape-analysis', 'innovation', 'R&D'],
  'Arnab Ghosh',
  'published',
  now() - interval '14 days'
),

-- ARTICLE 7: Technology Scouting for Defense
(
  'technology-scouting-defense-framework',
  'Technology Scouting for Defense: A Practitioner''s Framework',
  E'## The Scouting Challenge in Defense\n\nDefense primes and government agencies face a fundamental tension in technology scouting: they need to identify and adopt emerging commercial technologies to maintain competitive advantage, but their procurement processes, security requirements, and organizational cultures are designed for large, established suppliers.\n\nThe result is a growing gap between the pace of commercial innovation and the defense industrial base''s ability to absorb it. Startups with relevant dual-use technologies often lack the patience, ITAR awareness, or financial runway to navigate defense procurement. Defense primes lack the internal scouting infrastructure to systematically identify and evaluate early-stage technologies.\n\n## A Structured Scouting Framework\n\n### 1. Define the Technology Thesis\n\nEffective scouting starts with a clear technology thesis -- not a vague directive to "find innovative technologies" but a specific statement of what capability is needed, why existing solutions are insufficient, and what TRL range is acceptable.\n\nExample: "We need sense-and-avoid capabilities for Group 3 UAS operating in contested airspace, at TRL 4-6, compatible with SWaP-C constraints of platform X."\n\n### 2. Map the Innovation Landscape\n\nSystematically scan four domains:\n\n- **Commercial technology companies** -- startups and scaleups with dual-use potential\n- **University and national lab research** -- funded programs at TRL 1-4 that could be matured\n- **International innovation** -- allied nation capabilities (with ITAR/export control awareness)\n- **Adjacent industry applications** -- technologies from automotive, energy, or medical that could be adapted\n\n### 3. TRL-Based Evaluation\n\nThe NASA/DoD Technology Readiness Level framework provides a common language for evaluating technology maturity. For defense scouting, the most useful distinction is:\n\n- **TRL 1-3**: Basic research. Watch and track, but don''t engage for near-term programs\n- **TRL 4-6**: Demonstrated in lab or relevant environment. Prime candidates for SBIR/STTR or OTA engagement\n- **TRL 7-9**: Validated in operational environment. Ready for integration or acquisition consideration\n\n### 4. Qualification Beyond TRL\n\nTRL alone is insufficient. Defense-relevant technologies must also be evaluated on:\n\n- **Manufacturing readiness** -- Can it be produced at scale with defense-grade quality?\n- **Security posture** -- Can the company handle CUI/ITAR-controlled data?\n- **Supply chain resilience** -- Are critical components sourced from allied nations?\n- **Financial viability** -- Does the company have runway to survive a defense procurement timeline?\n\n### 5. Engagement Pathways\n\nOnce promising technologies are identified, the engagement pathway matters as much as the technology itself:\n\n- **SBIR/STTR** -- For early-stage companies needing funded development\n- **OTA (Other Transaction Authority)** -- For rapid prototyping outside traditional FAR/DFAR\n- **CRADA** -- For collaborative research with national labs\n- **Direct procurement** -- For TRL 7+ technologies ready for integration\n- **Strategic investment/acquisition** -- For technologies core to future platform architecture\n\n## Common Failure Modes\n\n- Scouting events (hackathons, pitch days) that generate excitement but no follow-through\n- Over-indexing on "cool technology" without assessing defense relevance and integration feasibility\n- Ignoring the startup''s business model -- a venture-backed startup optimizing for commercial scale may not be a viable defense supplier\n- Failing to designate an internal champion who owns the relationship post-scouting\n\n*intelle.io provides [Technology Scouting & Innovation Research](/research/technology-scouting) services for defense primes and government agencies. [Contact us](/contact) to discuss your scouting requirements.*',
  'A structured framework for defense technology scouting: from defining the technology thesis to TRL-based evaluation and engagement pathway selection.',
  'insight',
  ARRAY['technology-scouting', 'defense', 'TRL', 'innovation', 'aerospace'],
  'Arnab Ghosh',
  'published',
  now() - interval '18 days'
),

-- ARTICLE 8: Cognitive AI in Engineering
(
  'cognitive-ai-engineering',
  'Cognitive AI in Engineering: From Concept to Production',
  E'## Beyond the Hype\n\nThe term "Cognitive AI" describes systems that go beyond pattern recognition to emulate aspects of human reasoning -- contextual understanding, inference, and knowledge synthesis. In engineering contexts, this means AI systems that can understand the meaning of technical content, not just its keywords.\n\nHaving published research on this topic through SAE International ("Intelligent Energy: Cognitive AI to Augment Human Knowledge"), and having spent years building cognitive AI features into engineering intelligence products, I can share what works, what doesn''t, and what organizations should realistically expect.\n\n## What Cognitive AI Does in Engineering\n\n### Semantic Understanding of Technical Content\n\nTraditional search finds documents containing specific keywords. Cognitive AI understands that "welding requirements for carbon steel pressure vessels in corrosive service" relates to ASME BPVC Section VIII, NACE MR0175, and AWS D1.1 -- even if those specific terms don''t appear in the query.\n\nThis semantic understanding is the foundation of engineering knowledge management systems that actually work.\n\n### Requirements Extraction and Traceability\n\nCognitive AI can read standards documents and extract actionable requirements -- "shall" statements, test criteria, material specifications -- and map them against internal engineering procedures. This enables automated compliance gap identification at a scale that manual review cannot match.\n\n### Knowledge Synthesis Across Sources\n\nThe most powerful application is synthesizing knowledge from multiple sources -- combining information from standards, internal procedures, supplier specifications, and historical project data to answer complex engineering questions that span organizational boundaries.\n\n## The Implementation Reality\n\n### Data Quality is Everything\n\nCognitive AI is only as good as the knowledge base it operates on. Organizations with well-organized, tagged, and curated document repositories see dramatically better results than those with unstructured file shares.\n\nIn our experience, 60-70% of the effort in a successful cognitive AI deployment goes into data preparation, taxonomy design, and content curation. The remaining 30-40% is the AI technology itself.\n\n### Domain Specificity Matters\n\nGeneral-purpose AI models (GPT, Claude, etc.) have broad knowledge but lack deep understanding of engineering domains. The most effective engineering AI systems use domain-specific embeddings, industry-specific taxonomies, and retrieval-augmented generation (RAG) architectures that ground responses in authoritative technical content.\n\n### The Trust Problem\n\nEngineers are rightfully skeptical of AI-generated answers in safety-critical contexts. Building trust requires transparency (showing sources), accuracy metrics (measuring hallucination rates), and a clear delineation of what the AI can and cannot be relied upon for.\n\n### Organizational Change Management\n\nThe technology is the easy part. Getting engineers to change their information-seeking behavior -- from asking colleagues or searching shared drives to using an AI-powered knowledge system -- requires sustained change management effort.\n\n## Realistic Expectations\n\nWhat cognitive AI can deliver today:\n- 10x faster search across large technical document collections\n- Automated first-pass compliance gap identification\n- Draft document generation for structured content\n- Knowledge discovery across organizational silos\n\nWhat it cannot reliably deliver:\n- Safety-critical design decisions\n- Definitive regulatory compliance determinations\n- Numerical engineering calculations\n- Replacement for subject matter expertise\n\n## Key Takeaways\n\n- Cognitive AI in engineering is real and delivering value -- but the value is in augmenting human expertise, not replacing it\n- Data quality and domain specificity are more important than the underlying AI model\n- Successful deployments require 60-70% data/taxonomy work and 30-40% technology work\n- Start with search and gap analysis use cases before attempting more complex applications\n\n*intelle.io brings published expertise in Cognitive AI to every engagement. [Learn about our Knowledge Management services](/engineering/knowledge-management) or [explore our AI & Digitalization Research](/research/ai-digitalization).*',
  'Drawing on SAE-published research and years of product development experience, this article examines what Cognitive AI actually delivers in engineering environments and what organizations should realistically expect.',
  'whitepaper',
  ARRAY['cognitive-ai', 'engineering', 'knowledge-management', 'SAE', 'semantic-search'],
  'Arnab Ghosh',
  'published',
  now() - interval '21 days'
),

-- ARTICLE 9: Market Entry Research Mistakes
(
  'market-entry-research-mistakes',
  'Market Entry Research: What Most Consultants Get Wrong',
  E'## The Template Problem\n\nLarge consulting firms approach market entry research with templates. The deliverable looks professional -- 80 slides, executive summary, market sizing, competitive landscape, SWOT analysis. But the substance is often shallow: secondary data aggregated from publicly available sources, dressed up with proprietary formatting.\n\nThis is not a criticism of the individuals -- it''s a structural problem. Big firms staff market entry studies with junior analysts supervised by engagement managers who may have no direct experience in the target market. The economics of large firms require high leverage (junior-to-senior ratios), which means the work is done by people learning the market for the first time.\n\nFor a $200K engagement from a major firm, the client is paying for the brand, the process, and the slide quality. They are not necessarily paying for practitioner insight.\n\n## Five Common Mistakes\n\n### 1. Over-Reliance on Secondary Data\n\nSecondary market data (analyst reports, public filings, press releases) is necessary but not sufficient. It tells you what happened, not why it happened or what it means for your specific entry strategy. Primary research -- conversations with customers, channel partners, regulators, and competitors -- is where genuine insight lives.\n\n### 2. Ignoring Regulatory and Standards Barriers\n\nMarket sizing exercises that don''t account for regulatory barriers produce misleading TAM numbers. Entering the Saudi Arabian market for industrial equipment requires understanding SASO certification requirements. Entering the EU medical device market requires EU MDR compliance. These aren''t footnotes -- they are fundamental feasibility constraints.\n\n### 3. Generic Competitive Analysis\n\nListing competitors'' products, revenue, and employee count is not competitive analysis. Useful competitive intelligence answers: How do they sell? Who buys from them and why? What do their customers complain about? Where are they vulnerable? This requires talking to people, not scraping websites.\n\n### 4. Overlooking Channel Dynamics\n\nIn many B2B markets, the channel (distributors, system integrators, VARs) is as important as the end customer. Market entry research that focuses exclusively on end-user demand without understanding channel economics, partner requirements, and existing relationships misses a critical dimension.\n\n### 5. One-Size-Fits-All Recommendations\n\nA market entry strategy for a Fortune 500 company with an existing regional presence is fundamentally different from one for a mid-size company making its first international move. Generic recommendations that don''t account for the client''s specific resources, risk tolerance, and strategic context are not actionable.\n\n## What Good Market Entry Research Looks Like\n\n- **Starts with the decision** -- What specific decision will this research inform? Build the research design around that decision.\n- **Includes primary research** -- At minimum, 10-15 structured conversations with market participants (customers, competitors, channel partners, regulators)\n- **Addresses regulatory feasibility** -- Standards, certifications, and regulatory requirements mapped for each target market\n- **Provides actionable recommendations** -- Specific enough that the client can act on them, not generic strategic platitudes\n- **Honest about uncertainty** -- Clearly flags areas where data is thin and assumptions are required\n\n*intelle.io delivers [Market & Competitive Intelligence](/research/market-intelligence) and [Strategic Engagements](/research/strategic) informed by practitioner experience, not template consulting. [Let us know what decision you need to make](/contact).*',
  'Large consulting firms staff market entry studies with junior analysts using templates. Here are the five most common mistakes and what good market entry research actually looks like.',
  'insight',
  ARRAY['market-entry', 'strategic', 'consulting', 'competitive-intelligence'],
  'Arnab Ghosh',
  'published',
  now() - interval '25 days'
),

-- ARTICLE 10: EU MDR Transition Guide
(
  'eu-mdr-transition-medical-devices',
  'Navigating the EU MDR Transition: A Practical Guide for Device Manufacturers',
  E'## Where We Stand\n\nThe transition from the Medical Devices Directive (MDD 93/42/EEC) to the Medical Device Regulation (EU MDR 2017/745) has been one of the most significant regulatory upheavals in the medical device industry. Extended transition deadlines have provided temporary relief, but the underlying compliance burden remains substantial.\n\nFor device manufacturers -- particularly small and mid-size companies -- the EU MDR transition is not just a regulatory exercise. It is a strategic decision about which products to maintain in the EU market, which to withdraw, and how to allocate scarce regulatory affairs resources.\n\n## Key Differences from the MDD\n\n### Enhanced Clinical Evidence Requirements\n\nEU MDR significantly raises the bar for clinical evidence. Where the MDD allowed substantial reliance on equivalence claims and literature reviews, the MDR requires more robust clinical evaluation reports (CERs) with structured literature searches, clinical data analysis, and post-market clinical follow-up (PMCF) plans.\n\nFor Class III and implantable devices, clinical investigations may be required where equivalence cannot be demonstrated -- a major cost and timeline impact.\n\n### Expanded Scope and Reclassification\n\nSeveral device categories have been reclassified upward under EU MDR. Software as a Medical Device (SaMD), reprocessed single-use devices, and certain aesthetic devices now face more stringent classification rules.\n\n### Unique Device Identification (UDI)\n\nEU MDR mandates UDI implementation and registration in EUDAMED, requiring significant investment in labeling, database registration, and supply chain traceability.\n\n### Post-Market Surveillance (PMS)\n\nThe regulation dramatically expands PMS requirements, including periodic safety update reports (PSURs), trend reporting, and proactive complaint analysis. Building systems to capture and analyze post-market data is a significant operational challenge.\n\n### Technical Documentation Structure\n\nEU MDR specifies a more prescriptive technical documentation structure (Annexes II and III), requiring GSPR-based organization and full design history documentation.\n\n## Practical Steps for Manufacturers\n\n### 1. Portfolio Triage\n\nNot every legacy device justifies the investment required for EU MDR transition. Conduct a portfolio-level assessment: for each device, estimate the compliance cost, timeline, and remaining commercial value in the EU market. Make explicit keep/withdraw decisions.\n\n### 2. Gap Analysis Against Current Documentation\n\nFor devices you intend to maintain, conduct a detailed gap analysis of existing technical documentation against EU MDR Annex II/III requirements. Focus areas: clinical evaluation reports, risk management files, biocompatibility assessments, and PMS plans.\n\n### 3. Notified Body Capacity Planning\n\nNotified Body capacity remains constrained. If you have not already engaged a Notified Body for your MDR submissions, expect delays. Consider whether MDSAP certification can streamline your global regulatory strategy.\n\n### 4. EUDAMED and UDI Preparation\n\nBegin UDI implementation early. Coordinate with your labeling, supply chain, and IT teams to ensure UDI-DI assignment, EUDAMED registration readiness, and label updates are planned into production schedules.\n\n### 5. Build PMS Infrastructure\n\nDon''t treat PMS as a documentation exercise. Build the operational infrastructure -- complaint trending systems, PMCF study protocols, PSUR generation processes -- that will be required on an ongoing basis.\n\n## Key Takeaways\n\n- EU MDR transition is a strategic portfolio decision, not just a regulatory compliance exercise\n- Clinical evidence requirements are the most impactful change for most manufacturers\n- Notified Body capacity is a binding constraint -- plan engagement timelines accordingly\n- PMS infrastructure should be built as an operational capability, not a documentation exercise\n\n*intelle.io provides [Standards & Regulatory Intelligence](/research/standards) and [Compliance Advisory](/engineering/compliance-advisory) for medical device manufacturers navigating EU MDR and global regulatory requirements. [Schedule a consultation](/contact).*',
  'A practical guide for medical device manufacturers navigating the EU MDR transition, covering clinical evidence requirements, portfolio triage, and implementation planning.',
  'whitepaper',
  ARRAY['medical-devices', 'EU-MDR', 'standards', 'compliance', 'regulatory'],
  'Arnab Ghosh',
  'published',
  now() - interval '30 days'
);
