-- One-off content seed: publishes "The $3.2M Afternoon: Why Late Engineering Change
-- Is an Information-Topology Problem" — third long-form article on /insights.
-- Pillar: founder_pov.
--
-- Same rendering pattern as the GCC bifurcation and GenAI articles: two pull
-- quotes, three diagrams (stack + comparison + stack + sequence), Key Takeaways
-- callout, Sources & Notes tail.
--
-- Run once in the Supabase SQL Editor. Idempotent via slug uniqueness — re-running
-- fails. To replace, DELETE the row first or change the slug.

INSERT INTO public.articles (
  slug,
  title,
  body,
  excerpt,
  category,
  tags,
  author_name,
  status,
  published_at,
  pillar,
  meta_description,
  seo_keywords,
  linkedin_body,
  twitter_body
) VALUES (
  'late-change-cascade',
  'The $3.2M Afternoon: Why Late Engineering Change Is an Information-Topology Problem',
  $body$The fabricator's yard had been running for nine days when the revision notice landed. API 5L had updated a hardness clause that applied to roughly forty percent of the line pipe already in the spool shop. The change had been published six weeks earlier. The procurement team had registered it. The standards specialist had filed it. Nobody had told the spool shop. By the time the audit thread caught up, three production runs needed re-certification, two suppliers had to redo material test reports, and the programme had absorbed an unbudgeted $3.2 million in rework and schedule slippage (E1 — intelle.io estimate).

We have anonymised the example, but the shape of it is familiar to every engineering organisation we work with. A standards revision lands. A regulatory clause shifts. A supplier issues an obsolescence notice. The change itself is small. The cost is in everything downstream that does not learn about it in time.

The frustrating part is that the information was not missing. It was sitting in three different systems, owned by four different people, governed by a process that was never designed to propagate. The people did their jobs. The systems did not talk. That is the problem this article is about.

> The information was not missing. It was sitting in three different systems, owned by four different people, governed by a process that was never designed to propagate.

## The Rule of Ten — empirically priced

Engineering literature has named this effect for decades. The 1-10-100 quality cost model, often called the Rule of Ten, captures the empirical observation that a defect or change caught at the next phase of development costs roughly an order of magnitude more to absorb [1]. Caught at design review, it is one unit. Caught in prototype testing, ten units. Caught before tooling, a hundred. Caught after tooling, a thousand. Caught in production or in the field, ten thousand or worse.

```diagram-stack
{"title":"THE RULE OF TEN · COST CASCADE BY PHASE","subtitle":"Cost of absorbing a change grows roughly an order of magnitude per phase missed","layers":[{"name":"Design review","description":"1× baseline. The change is a stroke of the pen on the requirements baseline — taxonomy, sign-off, move on.","failRate":"low"},{"name":"Prototype testing","description":"10× cost. Iteration is still cheap; tooling has not committed. A bad assumption is still a paper exercise.","failRate":"medium"},{"name":"Pre-tooling and supplier qualification","description":"100× cost. Material lead times, qualification cycles, and supplier-side rework now enter the calculation.","failRate":"high"},{"name":"Production and field","description":"1,000–10,000× cost. Rework, audit-evidence reconstruction, schedule slippage, insurance exposure, customer credibility. Late changes live here.","failRate":"highest"}]}
```

The numbers are illustrative rather than absolute — actual values vary by industry, by programme scale, and by how integrated the toolchain already is. But the curve is consistent across the published manufacturing literature [1]. Specifically, post-tooling adjustments cost ten to twenty times more than pre-tooling changes, and engineering change orders together consume between thirty-three and fifty percent of engineering capacity in complex programmes [2]. In automotive programmes, ECOs account for twenty to fifty percent of total tooling budgets [3].

Those are not industry-marketing numbers. They are operating constraints. Every dollar that lives at the right side of the cost cascade is a dollar that should have been a hundredth of itself two phases earlier. The work of digital threading — and the rest of this piece — is making the left side of the cascade reachable for changes that, today, only get caught on the right.

## Why late changes happen — information topology, not discipline

The most common explanation for late engineering change is process discipline. Engineers did not raise the ECR. Standards specialists did not flag the revision. Suppliers did not read the notice. The fix, in this telling, is more discipline, more forms, more sign-offs.

This is wrong, or at best half right. In the dozens of engineering organisations we have walked through over the past two years (E2 — intelle.io estimate), the people are not the bottleneck. The bottleneck is **information topology** — the structural geometry of which system knows what, and how that knowledge propagates to the next system in the chain.

```diagram-comparison
{"title":"DISCIPLINE PROBLEM vs INFORMATION-TOPOLOGY PROBLEM","left":{"header":"What most organisations blame","items":[{"title":"Engineers did not raise the ECR","subtitle":"Process-discipline gap. The standard answer."},{"title":"Standards specialists did not flag the revision","subtitle":"Standards-team workload, never enough people."},{"title":"Suppliers did not read the notice","subtitle":"Supplier-compliance gap, addressed with more contractual language."},{"title":"The fix: more forms, more sign-offs","subtitle":"More discipline. Same topology. Same outcome."}]},"right":{"header":"What is actually broken","items":[{"title":"Standards live as PDFs on an intranet","subtitle":"Owned by the standards team. No change-event semantics."},{"title":"Requirements live in DOORS, Jama, Codebeamer, Polarion","subtitle":"Owned by systems engineering. Decoupled from standards."},{"title":"Product structure lives in Windchill, Teamcenter","subtitle":"Owned by mechanical and electrical leads. Decoupled from requirements."},{"title":"Five systems, four organisations, no shared change-event language","subtitle":"Each handoff is human-mediated, asynchronous, and lossy."}]}}
```

Consider the typical configuration in a mid-tier EPC or industrial scale-up. Standards live as PDFs on an intranet, managed by a small standards team. Requirements live in DOORS, Jama, Codebeamer, or Polarion, owned by systems engineering. The product structure lives in Windchill or Teamcenter, owned by mechanical and electrical leads. Manufacturing instructions live in MES, owned by operations. Supplier obligations live in a procurement portal, owned by sourcing. Audit evidence is reconstructed manually when an inspector arrives.

There are five different systems, four different organisations, and no shared change-event language between them. When API issues a revision, the standards team registers it. The registration is invisible to systems engineering until the next requirements baseline. The baseline is invisible to mechanical until the next design review. The design review is invisible to manufacturing until the next routing card. Each handoff is human-mediated, asynchronous, and lossy.

Empirically, sixty-two percent of all engineering changes are driven by external factors — customer feedback, regulatory updates, component obsolescence [4]. The change itself is exogenous. Discipline cannot prevent it. What discipline *can* do, when paired with the right information topology, is make sure that the propagation from the system that learned about the change to the systems that need to act on it takes hours, not weeks.

## What digital threading actually does

Digital threading is a practice, not a product. We define it precisely: an interlocking set of structured objects, traceability links, change events, and downstream notifications that together make engineering change propagate automatically across the systems where engineers and suppliers actually work.

Four capabilities sit at the heart of the practice. **First, structured requirement objects** — every clause of a governing standard, every internal specification, every regulation is decomposed from PDF prose into citable objects with edition history, applicability metadata, and unique identifiers. **Second, bidirectional traceability** — every design artefact, BOM line, procedure, supplier obligation, and inspection record carries a verifiable link back to the governing requirement object. **Third, change events** — when a requirement object changes, the system emits a structured event with edition delta, affected applicability, and the timestamp at which the change took effect. **Fourth, downstream notifications** — every system subscribed to that requirement object receives the event and surfaces it to the right owner in the right tool.

This is qualitatively different from what most organisations call PLM integration today. PLM integration typically means moving part numbers and BOM data between systems. Digital threading means moving change events — and the meaning behind them — across a much wider set of systems, including the standards repository and the supplier portal that PLM does not natively reach.

## The connector layer across the toolchain

Vendor literature from PTC [5], Siemens [6], and Aras [7] converges on the same basic message: each PLM platform provides closed-loop change management within its own boundaries, and each does so well. PTC Windchill PDMLink ships closed-loop change processes aligned to the CMII industry standard [8]. Siemens Teamcenter, Polarion, and the broader Xcelerator stack now position the digital thread as a strategic narrative [6]. Aras Innovator is explicit about CMII alignment and configuration-management governance [7].

What none of these platforms can do alone is close the loop across the standards layer that lives outside them. This is where the connector layer matters.

```diagram-stack
{"title":"THE CONNECTOR LAYER · FIVE LAYERS, ONE CHANGE-EVENT BUS","subtitle":"Each layer keeps its native data model; the bus carries change events between them","layers":[{"name":"Layer 1 · Standards repository","description":"API, ASME, NACE, IEC, MIL-STD, plus internal specs. Standards modelled as governed objects with edition history and applicability mappings. The layer where exogenous change first arrives.","failRate":"low"},{"name":"Layer 2 · Requirements management","description":"IBM DOORS, Jama Connect, PTC Codebeamer, Siemens Polarion. Structured requirement objects with bidirectional traceability back to the governing standard.","failRate":"low"},{"name":"Layer 3 · PLM and PDM","description":"PTC Windchill, Siemens Teamcenter, Aras Innovator. Closed-loop change management aligned to CMII. BOM lines, parts, ECOs.","failRate":"medium"},{"name":"Layer 4 · Manufacturing execution","description":"MES, ERP, IBM Maximo. Routings, work instructions, inspection plans, asset-lifecycle workflows.","failRate":"high"},{"name":"Layer 5 · Supplier and service","description":"Procurement portals, supplier flow-down, field operations and MOC. The thread closes the loop from service back to design.","failRate":"highest"}]}
```

The architecture is simple in shape. Five layers — standards repository, requirements management, PLM and PDM, manufacturing execution, supplier and service — sit alongside each other, each with its own data model and operational owner. A change-event bus runs between them, carrying edition history, applicability mapping, and bidirectional traceability links. When a clause changes in the standards layer, the bus carries the change event to every other layer that has subscribed to that clause. The traceability links propagated through the bus tell each system exactly which artefacts inside it are affected, and which owners need to know.

The platforms we wire into this bus are the ones our customers already run. On the requirements side, IBM DOORS, Jama Connect, PTC Codebeamer, Siemens Polarion. On the PLM and PDM side, PTC Windchill, Siemens Teamcenter, Aras Innovator. On the manufacturing and asset side, MES, ERP, IBM Maximo. On the standards and engineering-content side, platforms like Accuris Goldfire and Accuris Thread bring the unique capability of treating standards as governed objects with native change-event semantics [9]. intelle.io is vendor-neutral; the right combination depends on what the customer already operates and what they are willing to procure.

## Three propagation patterns that recover most of the cost

Once the connector layer is in place, the question becomes which cascades to wire first. We have found that three patterns deliver the majority of the recoverable cost in the first eighteen months of a digital-threading practice. They are not the only patterns — but if you only have budget for three, these are the three.

```diagram-sequence
{"title":"THREE PROPAGATION PATTERNS · WIRE THESE FIRST","steps":[{"label":"Pattern 1","title":"Standards revision cascade","description":"When an SDO issues a clause revision, the connector layer detects the edition delta, traces it through every requirement object that referenced the prior clause, and propagates change events to every BOM line, procedure, MOC record, and supplier obligation that inherited the requirement. Audit-evidence trail is generated as a by-product.","accentColor":"teal"},{"label":"Pattern 2","title":"Supplier flow-down","description":"A specification delta reaches the supplier before they commit to material. The connector monitors ratified specs in PLM, identifies affected supplier line items, posts the delta to the supplier portal, and requires acknowledgement with impact assessment before procurement closes. Suppliers stop hearing about changes from incident reports.","accentColor":"blue"},{"label":"Pattern 3","title":"MOC and operational change","description":"Field MOC requests fan out to engineering, procurement, and manufacturing execution. Closed-loop verification holds the change until every downstream consumer accepts or rejects. In aerospace operations, comparable thread implementations have been cited as enabling ~30% reductions in unscheduled maintenance [10] — a comparable scale of benefit applies in energy and heavy industry (E3 — intelle.io estimate).","accentColor":"violet"}]}
```

The **standards revision cascade** is the highest-leverage pattern in regulated industries. When API, ASME, NACE, IEC, or any SDO issues a clause revision, the connector layer detects the edition delta, traces it through the requirement objects that referenced the prior clause, and propagates a change event to every BOM line, procedure, MOC record, and supplier obligation that inherited the requirement. Owners receive notifications inside the tools they already use. The audit-evidence trail is generated as a by-product, rather than reconstructed under pressure when an inspector arrives.

The **supplier flow-down pattern** addresses the most expensive late-change scenario we encounter: a specification delta that reaches the supplier after they have committed to material. The connector layer monitors ratified specification changes in PLM, identifies the affected supplier line items, posts the delta to the supplier portal, and requires an acknowledgement with impact assessment before the procurement record is closed. Quality and procurement records update automatically. Suppliers stop hearing about changes from incident reports.

The **MOC and operational change pattern** closes the loop in the other direction — from service back to design and supply. When field operations raise a management-of-change request against an asset or procedure, the connector layer retrieves the linked design intent and the governing standards, fans the impact out to engineering, procurement, and the manufacturing-execution layer, and holds the change in a closed-loop verification state until each downstream consumer has accepted or rejected the proposed disposition. In aerospace operations, comparable digital-thread implementations have been cited as enabling thirty-percent reductions in unscheduled maintenance [10], a comparable scale of benefit when applied to operating assets in energy and heavy industry (E3 — intelle.io estimate).

## Discipline meets thread — why CMII still matters

A connector layer without operating discipline is plumbing. Discipline without a connector layer is paperwork. The two combine to produce operational maturity.

CMII, the configuration-management standard that emerged from aerospace and defence in the 1980s and that today underpins Windchill PDMLink, Aras Innovator, and other closed-loop change platforms [8], remains the operating discipline that makes the thread trustworthy. CMII insists on data integrity, up-front planning, and continuous process improvement. The CMII research community has measured that organisations practising disciplined closed-loop change management can reduce scrap and rework by up to thirty percent [11], and that the cost of intervention — the cost of fixing problems that should not have happened — typically consumes more than fifty percent of organisational resources in environments where the discipline is missing [11].

Digital threading does not replace CMII. It gives CMII a wider operating surface. The same discipline that already governs change inside Windchill now governs change across the standards layer, the requirements layer, the manufacturing layer, and the supplier portal — because all of those layers share the same change-event semantics. Auditors notice. Insurers notice. Engineering leadership notices.

> A connector layer without operating discipline is plumbing. Discipline without a connector layer is paperwork. The two combine to produce operational maturity.

## What measurable looks like

Boards do not fund digital threading on principle. They fund it on numbers. The KPIs we instrument every engagement against fall into four categories — speed, accuracy, propagation completeness, and operational outcome.

On **speed**: time-to-extract a clause from a published standard into a structured requirement object; time from a standards revision being issued to a downstream owner being notified; ECO cycle time from raise-to-close. Targets we hold ourselves to: ninety-percent reduction on time-to-extract; same-day notification on critical clause revisions; ECO cycle-time reductions of thirty to fifty percent in the first year (E4 — intelle.io estimate).

On **accuracy**: first-pass extraction accuracy for requirement decomposition; trace-link completeness across the lifecycle; defect-escape rate from one phase to the next. We instrument first-pass accuracy at ninety-two percent against a human-reviewed gold set (E5 — intelle.io estimate) and continue to climb with feedback loops.

On **propagation completeness**: percentage of standards revisions with full downstream notification within the target SLA; percentage of supplier flow-down events acknowledged inside the contractual window; percentage of MOCs with closed-loop verification before rollout. The intermediate goal is not perfection. It is visibility into what is propagating and what is not.

On **operational outcome**: scrap and rework percentages; audit-evidence reconstruction time; insurance-driven incident frequency; unscheduled-maintenance hours on instrumented assets. These are the metrics boards funded the programme for. Northrop Grumman's published BOM-unification work reported engineering rework dropping from approximately twenty percent to less than one percent [12] — a directional anchor for what mature thread implementations have achieved in adjacent industries.

## From thirty-day pilot to twelve-month embed

We sequence digital-threading engagements in three arcs. The arc names matter less than the discipline of sequencing.

The **thirty-day pilot** covers one standards corpus, one engineering domain, one requirements tool, and one PLM environment. The deliverables are an extracted and structured slice of the corpus, traceability links to a defined subset of the engineering artefacts, and a change-event bus prototype (through an API layer) wired between two systems. The pilot's purpose is to demonstrate the cost-recovery thesis on a contained surface so that the funding case for the embed phase is empirical, not theoretical.

The **two-to-nine-month rollout** expands the corpus, the engineering domains, the connected tools, and the propagation patterns. Standards revision cascade is wired first because it is the highest-leverage pattern. Supplier flow-down follows because supplier-driven late changes are the most expensive class. MOC propagation closes the loop. By the end of this arc, the practice is operating in production across one business unit or one major programme.

The **nine-to-twelve-month embed** is where the practice becomes operational rather than project. KPIs are integrated into engineering and operations dashboards. CMII discipline is harmonised with the new propagation patterns. Audit-evidence generation is automated. The connector layer becomes part of the normal IT operating envelope, with the same observability, security, and change-management governance as any other production system.

We are honest about what this arc costs. The taxonomy work in the pilot is unglamorous and intensive — extracting a standards corpus into structured objects with revision history is the kind of work that does not show in screenshots but determines whether the thread holds. The change-management discipline still needs to be earned across the operating units. Vendor selection is consequential and we lead the customer through it on evidence, not on preference.

## The honest cost of not doing this

If we did nothing different, the cost cascade would continue to operate. ECOs would continue to consume between thirty-three and fifty percent of engineering capacity in complex programmes [2]. Late-stage changes would continue to cost ten to twenty times what they would have cost two phases earlier [1]. Audit-evidence trails would continue to be reconstructed under pressure. The cost of intervention would continue to consume more than fifty percent of organisational resources [11]. Engineering teams would continue to feel that they are spending the majority of their time fighting fires they did not start.

Digital threading is not a silver bullet. It does not eliminate the exogenous changes — standards revisions, supplier failures, regulatory shifts, customer-driven modifications — that drive sixty-two percent of all engineering changes in the first place [4]. It does something more modest and more valuable: it makes those changes cheap to absorb. A change that is propagated to every downstream consumer within hours, with structured impact information and a traceable audit trail, lives near the left side of the Rule-of-Ten cost cascade rather than the right.

That is the offer. It is not the offer of zero change. It is the offer of change without surprise.

## Key Takeaways

- Late-stage engineering changes are an information-topology problem, not a discipline problem. The Rule of Ten makes the cost cascade empirical: each phase a change misses costs an order of magnitude more.
- Digital threading is a practice, not a product. It is the connector layer that propagates change events across standards, requirements, PLM, manufacturing, and supplier portals — using the platforms your engineers already run.
- Three propagation patterns recover most of the cost: standards revision cascade, supplier flow-down, and MOC operational change. Wire these first.
- CMII discipline still matters. The thread without discipline is plumbing; discipline without the thread is paperwork. Together they produce operational maturity.
- The honest case is not zero change. It is change without surprise — propagated in hours instead of weeks, lived at the left side of the cost cascade instead of the right.

*intelle.io provides [Digital Threading & Traceability](/engineering/plm-integration) implementation, consulting, and ongoing support. If you are weighing a thirty-day pilot, [book a discovery call](/book).*

## Sources & notes

**External sources**

[1] 1-10-100 / Rule of Ten quality cost model — cost of detecting a defect rises by ~10× per successive phase — [WorkClout](https://www.workclout.com/blog/1-10-100-rule-cost-of-quality).

[2] ECO benchmarking — engineering change orders as a percentage of new product development cost — [APQC](https://www.apqc.org/what-we-do/benchmarking/open-standards-benchmarking/measures/engineering-change-order-eco-costs).

[3] Engineering Change Order best practices — ECOs as a share of tooling budget; post-tooling cost multiplier — [Innovation.world](https://innovation.world/engineering-change-order/).

[4] Engineering change drivers — externally-driven change share of total ECOs — [Innovation.world](https://innovation.world/engineering-change-order/).

[5] Why Companies Must Prioritise Digital Thread; What is an ECO; Engineering Change Management Process Overview — [PTC](https://www.ptc.com).

[6] Digital thread — redefining digital transformation; design-to-manufacturing alignment — [Siemens Digital Industries Software](https://www.sw.siemens.com).

[7] CMII Configuration Management for PLM software — [Aras](https://aras.com/en/glossary/configuration-management).

[8] Configuration Management and the Digital Thread — CMII / EIA-649 alignment — [CMstat](https://cmstat.com/cmsights-news-posts/configuration-management-and-the-digital-thread).

[9] Goldfire Cognitive Search; Goldfire Chat API for engineering RAG; Rethinking Engineering Change Order Management — [Accuris](https://accuristech.com/solutions/goldfire/).

[10] Digital thread in aerospace operations — reductions in unscheduled maintenance and operational improvements — [Cognizant](https://www.cognizant.com/us/en/insights/insights-blog/digital-thread-aerospace).

[11] CMII / IpX research — resource consumption on intervention; closed-loop scrap and rework reductions up to 30% — [IpX (Institute for Process Excellence)](https://ipxeu.com).

[12] Lockheed Martin Aeronautics digital thread modernisation; Northrop Grumman BOM unification — engineering rework drop from ~20% to <1% — [DXC Technology](https://dxc.com/insights/customer-stories/digital-thread-helps-lockheed-martin-aeronautics-modernize-aircraft-manufacturing).

**intelle.io estimates**

[E1] $3.2M composite late-change cost figure for the opening scenario. Anonymised composite drawn from observed late-stage rework events across upstream and EPC programmes; not a single named project.

[E2] Pattern frequency — "dozens of engineering organisations walked through over the past two years". Refers to intelle.io's diagnostic and advisory engagements; the underlying client list is confidential.

[E3] Comparable 30%-scale benefit from MOC and operational thread implementations in energy and heavy industry. Inferred from cross-industry digital-thread benefit comparisons; not a single named case study.

[E4] Target KPIs — 90% time-to-extract reduction, same-day notification, 30–50% ECO cycle-time reduction in year one. Targets intelle.io commits to on engagements, calibrated against published industry benchmarks and our delivered work.

[E5] 92% first-pass extraction accuracy for requirement decomposition. Measured against an internal human-reviewed gold-set corpus; varies by SDO and standard density.
$body$,
  'Late engineering changes are an information-topology problem, not a discipline problem. The Rule of Ten makes the cost cascade empirical. Here is why digital threading turns weeks of change propagation into hours — and which three patterns to wire first.',
  'insight',
  ARRAY['digital-thread','engineering-change-management','cmii','rule-of-ten','standards-revision-cascade','supplier-flow-down','moc','founder-pov','plm','requirements-management','industrial-engineering'],
  'Arnab Ghosh',
  'published',
  now(),
  'founder_pov',
  'Late engineering changes are an information-topology problem, not a discipline problem. The Rule of Ten makes it empirical — and digital threading is how you bend the cost cascade.',
  ARRAY['digital thread','engineering change management','rule of ten','CMII','standards revision cascade','supplier flow-down','MOC','PLM integration','requirements traceability','Windchill','Teamcenter','DOORS','Codebeamer','Polarion','Accuris Thread'],
  $li$The fabricator's yard had been running for nine days when the revision notice landed.

API 5L had updated a hardness clause that applied to roughly 40% of the line pipe already in the spool shop.

The change had been published six weeks earlier. Procurement registered it. The standards specialist filed it.

Nobody told the spool shop.

Three production runs needed re-certification. Two suppliers had to redo material test reports. The programme absorbed an unbudgeted $3.2M in rework and schedule slippage.

The frustrating part: the information was not missing. It was sitting in three different systems, owned by four different people, governed by a process that was never designed to propagate.

This is the heart of the late-change problem most engineering organisations carry. The 1-10-100 Rule of Ten makes the cost cascade empirical — each phase a change misses costs roughly an order of magnitude more to absorb.

▸ Caught at design review: 1× cost.
▸ Caught in prototype: 10×.
▸ Caught pre-tooling: 100×.
▸ Caught in production or field: 1,000–10,000×.

ECOs consume 33–50% of engineering capacity in complex programmes. Sixty-two percent of all engineering changes are driven by external factors no amount of discipline prevents — standards revisions, regulatory updates, component obsolescence.

The fix is not more discipline. It is information topology.

Digital threading is the practice. The connector layer is the architecture: standards, requirements, PLM, manufacturing, supplier portal — five layers, one change-event bus.

Three propagation patterns recover most of the cost in the first 18 months:

→ Standards revision cascade
→ Supplier flow-down
→ MOC and operational change

CMII discipline still matters. A thread without discipline is plumbing. Discipline without a thread is paperwork. Together they produce operational maturity.

The honest case is not zero change. It is change without surprise — propagated in hours instead of weeks, lived at the left side of the cost cascade instead of the right.

Read the full piece at intelle.io/insights/late-change-cascade

#DigitalThread #EngineeringChangeManagement #PLM #CMII #EngineeringIntelligence$li$,
  'Late engineering changes are an information-topology problem, not a discipline problem. The Rule of Ten makes the cost cascade empirical. Digital threading bends it — change without surprise. intelle.io/insights/late-change-cascade'
);
