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
-- Seed data: sample articles
-- ============================================
INSERT INTO public.articles (slug, title, body, excerpt, category, tags, status, published_at) VALUES
(
  'energy-transition-gcc-2026',
  'The GCC Energy Transition: Opportunities and Challenges in 2026',
  E'## Overview\n\nThe Gulf Cooperation Council (GCC) countries are at a pivotal moment in their energy transition journey. With ambitious national visions and massive investments in renewable energy, hydrogen, and carbon capture technologies, the region is positioning itself as a global leader in sustainable energy.\n\n## Key Trends\n\n### Hydrogen Economy\nSaudi Arabia and the UAE are making significant investments in green hydrogen production, with NEOM''s green hydrogen plant expected to produce 600 tonnes per day.\n\n### Solar and Wind\nThe region continues to set world records for solar tariffs, with projects achieving costs below $0.02/kWh.\n\n### Carbon Capture\nCCUS deployment is accelerating across the GCC, with multiple large-scale projects in development.\n\n## Implications for Industry\n\nOrganizations operating in or supplying to the GCC energy sector need to understand these shifts and position themselves accordingly.',
  'An analysis of the energy transition landscape across GCC countries, covering hydrogen, renewables, and CCUS developments.',
  'insight',
  ARRAY['energy', 'gcc', 'hydrogen', 'renewables'],
  'published',
  now()
),
(
  'ai-engineering-documentation-2026',
  'How GenAI is Transforming Engineering Documentation',
  E'## The Documentation Challenge\n\nEngineering organizations generate vast amounts of technical documentation -- from design specifications to compliance reports. Managing this knowledge has traditionally been a manual, time-consuming process.\n\n## GenAI Applications\n\n### Automated Standards Mapping\nAI can now automatically map internal procedures against applicable industry standards, identifying gaps and compliance risks.\n\n### Intelligent Search\nSemantic search powered by large language models enables engineers to find relevant information across thousands of documents in seconds.\n\n### Document Generation\nGenAI tools can draft technical reports, compliance documentation, and design reviews based on structured inputs.\n\n## Implementation Considerations\n\nOrganizations should approach AI adoption strategically, focusing on use cases with clear ROI and manageable risk.',
  'Exploring practical applications of Generative AI in engineering documentation, standards management, and knowledge retrieval.',
  'insight',
  ARRAY['ai', 'genai', 'engineering', 'documentation'],
  'published',
  now()
),
(
  'standards-compliance-digital-transformation',
  'Digital Transformation of Standards Compliance',
  E'## The Shift from Manual to Digital\n\nStandards compliance has historically been a paper-heavy, manual process. But digital transformation is changing how organizations manage their regulatory obligations.\n\n## Key Technologies\n\n- **Requirements Management Tools**: Automated extraction and tracking of standards requirements\n- **PLM Integration**: Embedding compliance checks into product lifecycle workflows\n- **AI-Powered Gap Analysis**: Using machine learning to identify compliance gaps across large document sets\n\n## Best Practices\n\n1. Start with a standards portfolio audit\n2. Map standards to engineering workflows\n3. Implement digital tracking and reporting\n4. Establish continuous monitoring processes',
  'How digital tools are transforming the way engineering organizations manage standards compliance and regulatory requirements.',
  'whitepaper',
  ARRAY['standards', 'compliance', 'digital-transformation'],
  'published',
  now()
);
