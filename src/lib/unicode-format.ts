/**
 * LinkedIn / X don't accept HTML, but rendering Unicode Mathematical
 * Alphanumeric Symbols produces visual bold/italic in the feed. Mappings cover
 * basic Latin letters and digits; anything else passes through untouched
 * (including punctuation, accented letters, and emoji).
 *
 * Note: these characters are inaccessible to screen readers. Use sparingly.
 */

const A_UPPER = "A".charCodeAt(0);
const Z_UPPER = "Z".charCodeAt(0);
const A_LOWER = "a".charCodeAt(0);
const Z_LOWER = "z".charCodeAt(0);
const ZERO = "0".charCodeAt(0);
const NINE = "9".charCodeAt(0);

function transform(
  s: string,
  upperBaseCp: number,
  lowerBaseCp: number,
  digitBaseCp: number | null
): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (cp >= A_UPPER && cp <= Z_UPPER) {
      out += String.fromCodePoint(upperBaseCp + (cp - A_UPPER));
    } else if (cp >= A_LOWER && cp <= Z_LOWER) {
      out += String.fromCodePoint(lowerBaseCp + (cp - A_LOWER));
    } else if (digitBaseCp != null && cp >= ZERO && cp <= NINE) {
      out += String.fromCodePoint(digitBaseCp + (cp - ZERO));
    } else {
      out += ch;
    }
  }
  return out;
}

/** Mathematical Bold: 𝐀-𝐙 𝐚-𝐳 𝟎-𝟗 */
export function toUnicodeBold(s: string): string {
  return transform(s, 0x1d400, 0x1d41a, 0x1d7ce);
}

/** Mathematical Italic: 𝐴-𝑍 𝑎-𝑧 (italic block has no digits — leave as ASCII).
 *  Note: italic 'h' has a special code point (U+210E) instead of the regular block. */
export function toUnicodeItalic(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (ch === "h") {
      out += "ℎ";
    } else if (cp >= A_UPPER && cp <= Z_UPPER) {
      out += String.fromCodePoint(0x1d434 + (cp - A_UPPER));
    } else if (cp >= A_LOWER && cp <= Z_LOWER) {
      out += String.fromCodePoint(0x1d44e + (cp - A_LOWER));
    } else {
      out += ch;
    }
  }
  return out;
}
