/**
 * Splits an article body into the main content and the "Key Takeaways"
 * bullet list that we render as a styled callout panel.
 *
 * Looks for an H2 whose text is exactly "Key Takeaways" (case-insensitive)
 * and parses the immediately-following bulleted/numbered list. Anything after
 * the list is preserved as a `tail` (e.g. an italicised CTA paragraph).
 */
export function splitKeyTakeaways(markdown: string): {
  before: string;
  takeaways: string[] | null;
  tail: string;
} {
  const lines = markdown.split("\n");
  const headingIdx = lines.findIndex((l) =>
    /^##\s+key\s+takeaways\s*$/i.test(l.trim())
  );
  if (headingIdx === -1) return { before: markdown, takeaways: null, tail: "" };

  // Collect contiguous list items right after the heading (skipping blank lines).
  const items: string[] = [];
  let i = headingIdx + 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^\s*(?:[-*•▶▸]|\d+\.)\s+(.*)$/);
    if (!m) break;
    let text = m[1].trim();
    // Continuation lines (indented) — collapse into the current item.
    let j = i + 1;
    while (j < lines.length && /^\s{2,}\S/.test(lines[j])) {
      text += " " + lines[j].trim();
      j++;
    }
    items.push(text);
    i = j;
    while (i < lines.length && lines[i].trim() === "") i++;
  }

  const before = lines.slice(0, headingIdx).join("\n").trimEnd();
  const tail = lines.slice(i).join("\n").trim();
  return {
    before,
    takeaways: items.length ? items : null,
    tail,
  };
}
