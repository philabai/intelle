-- ===========================================================================
-- RegWatch — Evidence analysis Phase C (video) schema additions
-- ---------------------------------------------------------------------------
-- Adds:
--   - analysis_transcript text (Whisper output, segment-timestamps inline)
--   - analysis_keyframe_count int (how many frames we extracted and sent
--     to Claude vision — surfaced in the UI as "Analysed N frames")
--   - analysis_video_duration_sec int (so the UI can render the scrubber
--     even when the source video is too large to inline-render)
--
-- All nullable; existing rows untouched.
-- ===========================================================================

alter table regwatch.obligation_evidence_files
  add column if not exists analysis_transcript text;

alter table regwatch.obligation_evidence_files
  add column if not exists analysis_keyframe_count int;

alter table regwatch.obligation_evidence_files
  add column if not exists analysis_video_duration_sec int;
