-- Update internal markdown links from the legacy /engineering/knowledge-management
-- slug to the new /engineering/knowledge-management-implementation slug, so the
-- GenAI in Engineering article (and any future articles using the same link) resolve
-- directly without going through the 308 redirect declared in next.config.ts.
--
-- Match strategy: replace `/engineering/knowledge-management)` (with the closing
-- markdown-link paren) so we never accidentally substitute the new slugs
-- `knowledge-management-strategy` or `knowledge-management-implementation` —
-- those are followed by additional path characters, not `)`.

UPDATE articles
SET body = REPLACE(
  body,
  '/engineering/knowledge-management)',
  '/engineering/knowledge-management-implementation)'
)
WHERE body LIKE '%/engineering/knowledge-management)%';
