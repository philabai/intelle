-- ===========================================================================
-- Vantage — Original document capture (cached source PDF/HTML)
-- ---------------------------------------------------------------------------
-- Adds the storage hooks for the Original tab on the regulation reader.
-- The Original tab shows the canonical source document (PDF or HTML)
-- cached in Supabase Storage and rendered via the existing react-pdf
-- viewer used for internal-doc previews.
--
-- Capture is lazy: triggered on first viewer hit, stamped here. The
-- source_mime column also gets populated by connectors that sniff
-- Content-Type at crawl time (SASO's mixed PDF/HTML index, mostly).
-- ===========================================================================

-- Add capture columns to regulatory_items
alter table regwatch.regulatory_items
  add column if not exists original_storage_path  text,
  add column if not exists original_mime          text,
  add column if not exists original_size_bytes    bigint,
  add column if not exists original_captured_at   timestamptz,
  add column if not exists original_capture_error text,
  -- source_mime: connector-sniffed Content-Type, separate from the
  -- captured copy's mime so we can distinguish "what the publisher
  -- says it is" from "what we successfully cached".
  add column if not exists source_mime            text;

create index if not exists regulatory_items_no_original_idx
  on regwatch.regulatory_items (id)
  where original_storage_path is null and source_url is not null;

-- ---------------------------------------------------------------------------
-- Storage bucket: regwatch-public
-- ---------------------------------------------------------------------------
-- Public read for compliance evidence — cached source documents are
-- redistributions of explicitly-public government records. Signed URLs
-- still get used by the action for cache busting, but anonymous read
-- is fine because the underlying source is itself public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'regwatch-public',
  'regwatch-public',
  true,
  52428800, -- 50 MB ceiling — biggest regulator PDFs we've seen are ~30 MB
  array['application/pdf', 'text/html']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policy: anyone can read the bucket (it's public regulator docs)
drop policy if exists regwatch_public_read on storage.objects;
create policy regwatch_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'regwatch-public');

-- Policy: only service-role can write (the capture action runs server-side)
-- Nothing further needed — service_role bypasses RLS by default.

-- ---------------------------------------------------------------------------
-- Per-publisher kill-switch
-- ---------------------------------------------------------------------------
-- For the rare publisher that objects to redistribution we flip this
-- column and the action falls back to a "open at source" button instead
-- of capturing. Defaults to allowed; flip per-regulator on objection.
alter table regwatch.regulators
  add column if not exists disallow_original_capture boolean not null default false;
