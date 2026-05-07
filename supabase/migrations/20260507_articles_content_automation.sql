-- Content automation columns for the articles table.
-- Adds: content pillar, SEO fields, scheduled publish, social variants (LinkedIn/X via Buffer),
-- generation provenance.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS pillar TEXT
    CHECK (pillar IN ('industry_insight','service_spotlight','founder_pov','case_archetype','resource')),
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS linkedin_body TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linkedin_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linkedin_buffer_post_id TEXT,

  ADD COLUMN IF NOT EXISTS twitter_body TEXT,
  ADD COLUMN IF NOT EXISTS twitter_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS twitter_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS twitter_buffer_post_id TEXT,

  ADD COLUMN IF NOT EXISTS generation_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

-- Allow 'scheduled' as a status value alongside the existing draft/published/archived.
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft','scheduled','published','archived'));

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON public.articles(scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_articles_linkedin_scheduled
  ON public.articles(linkedin_scheduled_at)
  WHERE linkedin_scheduled_at IS NOT NULL AND linkedin_published_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_articles_twitter_scheduled
  ON public.articles(twitter_scheduled_at)
  WHERE twitter_scheduled_at IS NOT NULL AND twitter_published_at IS NULL;
