-- One-off content seed: publishes the "GenAI in Engineering. Where it works, where it fails."
-- service-spotlight article directly into the articles table.
--
-- Run once in the Supabase SQL Editor. Idempotent via slug uniqueness — re-running with
-- the same slug will fail (intentional, to avoid silent overwrites). To replace, DELETE
-- the row first or change the slug.

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
  'genai-in-engineering',
  'GenAI in Engineering. Where it works, where it fails.',
  $body$A Chief Digital Officer at a GCC national oil company called us last quarter with a problem that is becoming routine. Thirty-two GenAI proposals on the desk. A board committee that has read the McKinsey number — $390 billion to $550 billion of incremental value for energy and materials — and wants a credible plan inside ninety days. An internal pilot from the prior year that produced a polished demo, a Teams channel full of screenshots, and zero production users six months later. The question was direct: which three pilots do we fund, and which twenty-nine do we kill?

That conversation is the reason for this piece. After two years of GenAI pilots across upstream, downstream, defence, and medical devices, the pattern of what works and what fails is no longer ambiguous. The interesting failures cluster in a small number of categories, and they are almost never about the model. They are about the corpus the model is asked to reason over, the workflow it is asked to slot into, and the assumption — usually unspoken — that fluency is the same thing as engineering judgment.

This is a [Service Spotlight](/research/ai-digitalization) on how we run GenAI engagements: where we tell clients to start, where we refuse to play, and what the deliverable actually looks like at week eight.

## The pilot graveyard nobody puts in the deck

Every Tier-1 strategy deck you have seen on industrial AI shows the same hockey stick. McKinsey's most recent gen AI in industrials work projects $390–550 billion of incremental value across agriculture, chemicals, energy, and materials. BCG's industrial AI surveys have, for several cycles now, reported that 70–80% of executives say GenAI is a top-three priority and that productivity uplifts of 30–40% are within reach inside three years. ADNOC's AIQ joint venture with G42 has announced a portfolio of upstream and energy applications. Aramco Digital has communicated similar ambitions around generative models for subsurface, drilling, and operations.

None of those numbers is wrong. They are also not what is happening in the field.

> Roughly two thirds of the engineering GenAI pilots we have reviewed in the GCC and India over the last eighteen months are stalled at proof-of-concept or quietly mothballed. The reason is almost always one of three things — and none of them is the foundation model.

What is happening in the field is that roughly two thirds of the engineering GenAI pilots we have reviewed in the GCC and India over the last eighteen months are stalled at proof-of-concept or quietly mothballed. The demos are real. The screenshots are real. The internal users — the engineers and operators the tool was supposed to serve — are not opening it. The reason is almost always one of three things, and none of them is the foundation model.

First, the corpus the system is asked to reason over is not retrieval-ready. Standards live as scanned PDFs with watermarks. P&IDs are TIFFs with no semantic layer. Vendor manuals are inconsistently tagged. Tribal knowledge sits in PowerPoint decks on shared drives that were last reorganised in 2017. No model — not GPT-4, not Claude, not Gemini, not a 70B open-weights fine-tune — rescues a corpus that cannot be retrieved against.

Second, the workflow integration is missing. The pilot is a chat window. The engineer's actual workflow is in Teamcenter, Windchill, IBM DOORS, or a refinery DCS. A chat window that sits beside the workflow, demanding context-switching, will lose to the existing workflow every time, regardless of how clever the answers are.

Third, the success metric was never agreed. "Engineer productivity" is not a metric. "Time to close a non-conformance report against API 650, measured against the prior six-month baseline" is a metric. Most pilots cannot tell you which of those two they are optimising, and so cannot tell you whether they worked.

## Where GenAI actually works in engineering today

Strip away the demos and the LinkedIn theatre, and there is a smaller, more boring set of use cases where GenAI is genuinely earning its keep in 2026.

```diagram-comparison
{"title":"WHERE GenAI WORKS — AND WHERE IT FAILS · AS OF 2026","left":{"header":"WHERE IT EARNS ITS KEEP","items":[{"title":"Standards & regulatory traceability","subtitle":"API, ASME, ISO, MIL-STD, FDA, EU MDR. 60–75% reduction in time-to-clause when the corpus is prepared correctly."},{"title":"Engineering knowledge search & reuse","subtitle":"15–40 years of project deliverables on file shares. 20–30% reduction in early-stage design effort."},{"title":"Document generation against templates","subtitle":"ITPs, MOCs, deviation reports, FAT/SAT, audits. Half-day saved per draft — first draft for engineer to correct, not final document for regulator."},{"title":"Predictive maintenance reasoning","subtitle":"GenAI as the reasoning layer over a deterministic alarm. Pulls maintenance history, standards envelope, OEM bulletin, action."},{"title":"Patent & IP triage","subtitle":"First-pass landscape and competitor disclosure review. Weeks → days. Doesn't replace practitioner judgment; changes cost structure."}]},"right":{"header":"WHERE WE REFUSE TO PLAY","items":[{"title":"Where a wrong answer is unbounded","subtitle":"Sizing relief valves. Structural margins. Control narratives. Plausibility ≠ correctness. We decline these scopes."},{"title":"Greenfield 'AI co-pilot for engineers'","subtitle":"Horizontal 'ask anything about engineering' assistants. Too broad, too varied, no workflow to anchor adoption. Successful pilots are narrow."},{"title":"Unstructured analogue data","subtitle":"Hand-drawn isometrics. Marked-up 1990s revamps. Scanned vendor mail. Cleaning economics worse than the use-case economics. Revisit in two years."},{"title":"Anything sold as 'replace the engineer'","subtitle":"Culturally toxic; the engineer ensures the pilot fails. Pilots that succeed are sold as 'the engineer's first draft' — hands stay on the deliverable."}]}}
```

### Standards and regulatory traceability

This is the strongest category we see, and the one where industrial AI returns measurable value fastest. Engineers spend extraordinary amounts of time navigating API, ASME, ISO, IEC, MIL-STD, FDA, and EU MDR libraries — finding the right clause, comparing revisions, mapping requirements across jurisdictions. A retrieval-augmented system grounded on a properly chunked, properly tagged standards corpus reduces the time-to-first-answer on a standards query from hours to minutes. We have measured 60–75% reductions in time-to-clause on engagements where the corpus was prepared correctly. The model contribution to that number is small. The corpus preparation is most of the work, which is why we keep separating [Standards & Regulations](/research/standards) research from the AI engagement itself.

### Engineering knowledge search and reuse

Most engineering organisations have somewhere between fifteen and forty years of project deliverables sitting on file shares — calculation sheets, design basis memos, FEED reports, lessons-learned write-ups, vendor evaluations. Senior engineers can find what they need by phoning two colleagues. Junior engineers cannot, and so the same calculations get redone. Semantic search over the project archive, with citation back to source documents, is producing 20–30% reductions in early-stage design effort on the engagements we have visibility into. This is the centre of gravity for our [Knowledge Management](/engineering/knowledge-management) work.

### Document generation against templates

ITPs, MOCs, deviation reports, audit responses, FAT/SAT documentation. These are template-driven, evidence-dense documents where a draft assembled from project context plus standards references can save engineers half a day each time. The trick is that the model writes a first draft for an engineer to correct, not a final document for a regulator to read. Confusing those two uses is how organisations end up with regulatory exposure.

### Predictive maintenance reasoning layers

GenAI is not replacing the physics-based and statistical models that drive predictive maintenance — those models continue to do the heavy lifting on vibration, thermography, and process telemetry. Where GenAI adds value is as a reasoning layer over the alarm: pulling the relevant maintenance history, the equipment's standards envelope, the OEM bulletin, and producing a prioritised action recommendation for the operator. This is the territory the SAE-published work on cognitive operations addresses directly — combining deterministic signal processing with language-model reasoning over the surrounding evidence.

### Patent and IP triage

For technology scouting and competitive monitoring, GenAI compresses the first-pass triage of patent landscapes and competitor disclosures from weeks to days. It does not replace the practitioner judgment in our [Patent & IP Intelligence](/research/patent-ip) deliverables, but it changes the cost structure of monitoring.

## Where it fails — and why the failures look the same

The failures cluster as cleanly as the successes.

### Anywhere a wrong answer is expensive and unbounded

Asking a general-purpose LLM to size a relief valve, calculate a structural margin, or specify a control narrative is a bad idea today and will remain a bad idea for the foreseeable future. Not because the model cannot produce a plausible answer — it can — but because the answer is plausible whether or not it is correct, and the consequences of being wrong in those domains are not bounded. The category error is treating fluency as competence. We refuse these scopes when clients propose them.

### Pure greenfield "AI co-pilot for engineers"

The pilots that try to build a horizontal "ask anything about engineering" assistant almost always stall. The corpus is too broad, the user intent is too varied, the failure modes are too many, and there is no specific workflow to anchor adoption. The successful pilots are narrow: one document type, one decision, one workflow.

### Anywhere the data is unstructured analogue

Hand-drawn isometrics. Marked-up drawings from a 1990s revamp. Scanned vendor correspondence. The model can read these, badly. The economics of cleaning the corpus are usually worse than the economics of the AI use case. We tell clients to leave these alone for now and revisit when document AI for engineering drawings has matured another two years.

### Anything sold as "replace the engineer"

Beyond being culturally toxic in any operating environment we have seen, this framing produces pilots whose success criterion is implicitly "the engineer is no longer needed", which means the engineer has every reason to ensure the pilot fails. The pilots that succeed are sold as "the engineer's first draft", and the engineer's hands stay on the deliverable.

## The corpus problem: why retrieval beats reasoning in industrial AI

The single most important point in this piece is the one nobody wants to fund. GenAI pilots in engineering rise or fall on the quality of the retrieval corpus, not the quality of the model.

> GenAI pilots in engineering rise or fall on the quality of the retrieval corpus, not the quality of the model.

```diagram-stack
{"title":"WHY MOST GenAI PILOTS FAIL — THE STACK BENEATH THE MODEL","subtitle":"Pilots fail at the layers below the model, not at the model itself.","layers":[{"name":"MODEL","description":"GPT, Claude, Gemini, open-weights — fungible. Rarely the bottleneck.","failRate":"low"},{"name":"WORKFLOW INTEGRATION","description":"Sits inside Teamcenter, Windchill, DOORS, DCS — not a side chat window.","failRate":"high"},{"name":"RETRIEVAL SYSTEM","description":"Semantic chunking. Metadata. Eval set of real engineering queries.","failRate":"high"},{"name":"CORPUS — the foundation","description":"Clean text, preserved figures/tables, controlled vocabulary, jurisdiction tags.","failRate":"highest"}]}
```

A retrieval-ready corpus has, at minimum: clean text extraction with figures and tables preserved as structured objects; semantic chunking that respects clause and section boundaries rather than arbitrary token windows; metadata tagging (standard, revision, jurisdiction, equipment class, project, discipline); a controlled vocabulary that maps the organisation's terms to standards-body terms; and an evaluation set of real engineering queries with known correct answers, so you can measure whether changes to the system are improving or degrading retrieval.

Building this for a 50,000-document standards and project archive is six to twelve weeks of work for a small team. It is not glamorous. It does not demo well. It is also the single highest-leverage investment an engineering organisation can make in industrial AI, and it has the useful property of paying back even if the GenAI strategy changes — a clean, tagged corpus is an asset under any model regime.

This is why we structure GenAI engagements around the corpus first. Clients sometimes push back; they want to see a chat interface in week two. We will show one — built against a small, hand-curated subset of the corpus, to demonstrate the shape of the answer we are aiming for. We will not scale that interface across the full archive until the corpus work is done, because we have watched what happens when teams skip that step.

## What to try first: a 90-day sequence

For the CDO with thirty-two proposals on the desk, here is the sequence we recommend.

```diagram-sequence
{"title":"THE 90-DAY GenAI PILOT SEQUENCE · intelle.io","steps":[{"label":"WEEKS 1–2","title":"Scope compression","description":"One document class. One decision. One named user. Written in one sentence.","accentColor":"teal"},{"label":"WEEKS 3–6","title":"Corpus preparation","description":"Ingest, clean, chunk, tag. Build the 50–150 evaluation queries, validated by senior engineers.","accentColor":"blue"},{"label":"WEEKS 7–10","title":"Retrieval system + thin UI","description":"Build RAG against the prepared corpus. Wrap in the workflow tool — no standalone chat.","accentColor":"violet"},{"label":"WEEKS 11–13","title":"Supervised pilot","description":"5–15 named engineers. Daily feedback loop. Track unprompted reuse — not survey scores.","accentColor":"pink"}]}
```

### Weeks 1–2: scope compression

Pick one document class and one decision. Not "engineering knowledge" — "API 650 compliance queries on storage tank projects in the Middle East business unit, supporting the lead mechanical engineer's pre-IFC review." If you cannot write the use case in one sentence with named documents and a named user, you are not ready to build.

### Weeks 3–6: corpus preparation

Ingest, clean, chunk, and tag the relevant document set. Build the evaluation set — typically 50 to 150 real queries from the named users, with answers validated by senior engineers. This is the work most pilots skip and most failures trace back to.

### Weeks 7–10: retrieval system and thin UI

Build the retrieval-augmented system against the prepared corpus. Wrap it in the thinnest possible UI — ideally an integration into the workflow tool the engineers already use, not a standalone chat. Run the evaluation set. Tune. Run it again.

### Weeks 11–13: supervised pilot with named users

Five to fifteen named engineers, two to four weeks, with a daily feedback loop and a metric agreed in week one. Track time-to-answer, accuracy of citations, and — most importantly — frequency of unprompted reuse. If engineers are not coming back to the tool of their own accord by week three, the tool is not working, regardless of what the satisfaction survey says.

At the end of ninety days you have either a system that has earned a path to production, or a clean, well-documented kill decision with reusable corpus assets. Both are valid outcomes. The pilots that linger in zombie state for another nine months are the expensive ones.

## What we deliver — and what we don't do

Because this is a [Service Spotlight](/research/ai-digitalization), the engagement shape matters.

### What you get

A use-case scoping memo at week two, written for an engineering audience, with the named document class, named users, named decision, and the metric we will measure against. A prepared corpus at week six — cleaned, chunked, tagged, with a documented schema you own. An evaluation set of 50–150 validated queries that becomes a permanent regression suite for any future AI work. A working retrieval system integrated into one workflow tool by week ten. A pilot report at week thirteen with adoption telemetry, accuracy metrics, and a go/no-go recommendation written in the language a steering committee can act on. Knowledge transfer to your internal team throughout — we do not build dependencies we cannot exit.

### What we don't do

We do not build greenfield foundation models. We do not sell GPU capacity. We do not write production engineering calculations through an LLM and we will decline scopes that request it. We do not run twelve-month proof-of-concepts; if we cannot show value in ninety days on a properly scoped use case, the use case is wrong. We do not wrap a chat UI around an unprepared corpus and call it a pilot, regardless of how much the steering committee wants to see one in week two.

The engagements run four to fourteen weeks depending on corpus size and integration complexity. Most sit between eight and ten. The deliverable shape is consistent across [AI & Digitalization](/research/ai-digitalization) work and the [Knowledge Management](/engineering/knowledge-management) implementation that often follows.

## What could prove this view wrong

Two developments would change the analysis.

The first is meaningful improvement in document AI for engineering drawings — specifically the ability to extract structured data from P&IDs, isometrics, and marked-up drawings at production accuracy. Several teams are working on this. If it lands at scale in the next eighteen months, the corpus economics shift, and a much wider range of legacy documents becomes addressable. We are watching this closely under [Technology Scouting](/research/technology-scouting) and have a different view on which approaches will mature first.

The second is the arrival of agentic systems that can reliably chain multi-step engineering reasoning under verification. Today's models hallucinate at every step of a chain, and the errors compound. If verification layers — formal methods, physics-based check models, deterministic standards engines — become robust enough to be wrapped around generative steps, the bounded-correctness problem softens, and use cases we currently decline become tractable. We do not expect this in 2025. We may revisit in 2026.

If either of those happens, the advice in this piece needs revision. Until they do, the corpus-first, scope-narrow, workflow-integrated, ninety-day discipline is the posture that returns capital.

## Key Takeaways

- Most engineering GenAI pilots fail at the corpus and workflow layers, not the model layer. The model is rarely the bottleneck.
- GenAI earns its keep today in standards traceability, knowledge search and reuse, template-driven document generation, predictive-maintenance reasoning layers, and patent triage. Most other claims should be treated as marketing.
- Refuse scopes where a wrong answer is unbounded — sizing, structural margins, control narratives. Fluency is not competence.
- A retrieval-ready corpus is the highest-leverage investment in industrial AI, and it pays back under any future model regime.
- Run ninety-day pilots with one document class, one decision, one user group, one metric. Kill the rest.
- Measure adoption by unprompted reuse, not satisfaction surveys.

*intelle.io runs scoped GenAI engagements through [AI & Digitalization Research](/research/ai-digitalization) and [Knowledge Management](/engineering/knowledge-management). If you are weighing a 2026 pilot portfolio, [book a discovery call](/book).*
$body$,
  'Two years of GenAI pilots across O&G, defence, and MedDev. The pattern is clear — and it isn''t the model.',
  'insight',
  ARRAY['industrial-ai','genai','ai-pilots','corpus-preparation','knowledge-management','noc','ai-readiness','service-spotlight'],
  'Arnab Ghosh',
  'published',
  now(),
  'service_spotlight',
  'After two years of GenAI pilots in O&G, defence, and MedDev: two-thirds stall — and it''s never the foundation model. Where it works, where it fails, and the 90-day playbook.',
  ARRAY['industrial AI consultancy','GenAI engineering pilot','AI readiness assessment engineering','industrial AI vendor evaluation','GenAI in oil and gas engineering','cognitive operations platform','engineering AI corpus preparation','90-day AI pilot engineering'],
  $li$Two years. Hundreds of GenAI proposals across O&G, defence, MedDev.

The pattern of what works and what fails is no longer ambiguous.

Two-thirds of engineering GenAI pilots in the GCC and India are stalled at proof-of-concept or quietly mothballed. The reason is almost never the foundation model.

It is one of three things:
▸ The corpus the system is asked to reason over isn't retrieval-ready.
▸ The pilot is a chat window, not an integration into Teamcenter / Windchill / DOORS / DCS.
▸ The success metric was never agreed.

Where GenAI is genuinely earning its keep today:
→ Standards traceability — 60-75% reductions in time-to-clause
→ Engineering knowledge search and reuse — 20-30% off early-stage design effort
→ Template-driven document generation (ITPs, MOCs, FAT/SAT)
→ Predictive maintenance reasoning layers
→ Patent and IP triage

Where we refuse to play:
→ Anywhere a wrong answer is unbounded (relief valves, structural margins, control narratives)
→ Horizontal "AI co-pilot for engineers" (no workflow anchor)
→ Unstructured analogue data
→ Anything sold as "replace the engineer"

The single most important point: GenAI pilots rise or fall on corpus quality, not model quality. A retrieval-ready corpus is six to twelve weeks of unglamorous work for a 50,000-document archive. It is also the highest-leverage investment in industrial AI — and it pays back under any future model regime.

Read the full piece — including the 90-day pilot sequence we recommend — at intelle.io/insights/genai-in-engineering

#EngineeringIntelligence #IndustrialAI #EnergyTransition$li$,
  'Two-thirds of engineering GenAI pilots stall — and it''s almost never the model. It''s the corpus, the workflow, and the missing success metric. intelle.io/insights/genai-in-engineering'
);
