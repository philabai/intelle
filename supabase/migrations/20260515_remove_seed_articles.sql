-- Remove the three placeholder/seed articles that were originally inserted via
-- supabase/schema.sql. These were thin sample articles used to scaffold the
-- /insights page; we're now keeping only the two long-form authored pieces
-- (the GenAI-in-engineering piece and the GCC bifurcation piece).

DELETE FROM public.articles
WHERE slug IN (
  'energy-transition-gcc-2026',
  'ai-engineering-documentation-2026',
  'standards-compliance-digital-transformation'
);
