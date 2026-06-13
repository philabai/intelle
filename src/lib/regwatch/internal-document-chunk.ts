/**
 * Split an internal document's plain body text into overlapping chunks for
 * embedding. Char-based windows (≈ tokens × 4) keep it dependency-free; the
 * overlap preserves context that straddles a boundary so retrieval doesn't miss
 * a clause split across two chunks.
 */

const CHUNK_CHARS = 2_000; // ≈ 500 tokens
const OVERLAP_CHARS = 200;
const MAX_CHUNKS = 40; // safety cap for very long SOPs

export function chunkBodyText(text: string): string[] {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length === 0) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_CHARS, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - OVERLAP_CHARS;
  }
  return chunks;
}
