-- Customer portal: engagements + document store.
-- Roles are stored on auth.users.raw_app_meta_data.role:
--   'admin'         - full access
--   'content_admin' - admin + content module
--   'researcher'    - upload to assigned engagements (future)
--   'customer'      - read their own engagements + visible documents
--
-- Run this in the Supabase SQL Editor after the content automation migration.

-- ============================================
-- Engagements: links a customer to a service
-- ============================================
CREATE TABLE IF NOT EXISTS public.engagements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('research', 'engineering')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagements_customer ON public.engagements(customer_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON public.engagements(status);

ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- Customer reads their own engagements
DROP POLICY IF EXISTS "Customers read own engagements" ON public.engagements;
CREATE POLICY "Customers read own engagements"
  ON public.engagements FOR SELECT
  USING (auth.uid() = customer_id);

-- Service role does everything (admin API uses service client)
DROP POLICY IF EXISTS "Service role full access on engagements" ON public.engagements;
CREATE POLICY "Service role full access on engagements"
  ON public.engagements FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Engagement documents: files researchers upload, customers download
-- ============================================
CREATE TABLE IF NOT EXISTS public.engagement_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,           -- storage path: engagement-files/{engagement_id}/{uuid}-{filename}
  file_name TEXT NOT NULL,           -- original filename for display
  file_size BIGINT,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'deliverable'
    CHECK (kind IN ('deliverable', 'draft', 'source', 'report', 'other')),
  title TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_visible_to_customer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_documents_engagement
  ON public.engagement_documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_engagement_documents_visible
  ON public.engagement_documents(engagement_id, is_visible_to_customer);

ALTER TABLE public.engagement_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read visible docs in own engagements"
  ON public.engagement_documents;
CREATE POLICY "Customers read visible docs in own engagements"
  ON public.engagement_documents FOR SELECT
  USING (
    is_visible_to_customer = true
    AND engagement_id IN (
      SELECT id FROM public.engagements WHERE customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on engagement_documents"
  ON public.engagement_documents;
CREATE POLICY "Service role full access on engagement_documents"
  ON public.engagement_documents FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- Storage bucket for engagement files
-- Note: Buckets and storage RLS are managed via Supabase Storage UI / SQL helpers.
-- Run these in the Supabase SQL Editor (they target the storage schema).
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('engagement-files', 'engagement-files', false)
ON CONFLICT (id) DO NOTHING;

-- Customers can read files in their own engagement folders.
-- File path convention: <engagement_id>/<uuid>-<filename>
DROP POLICY IF EXISTS "Customers read own engagement files"
  ON storage.objects;
CREATE POLICY "Customers read own engagement files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'engagement-files'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.engagements WHERE customer_id = auth.uid()
    )
  );

-- Service role full access (admin uploads via service client).
DROP POLICY IF EXISTS "Service role full access on engagement files"
  ON storage.objects;
CREATE POLICY "Service role full access on engagement files"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'engagement-files') WITH CHECK (bucket_id = 'engagement-files');
