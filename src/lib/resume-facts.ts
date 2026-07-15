/**
 * Extracts the "facts" from a résumé's LaTeX source — proper nouns and numbers —
 * used as the baseline for the no-fabrication check. The base résumé's facts are
 * stored (as JSON) at upload time; a tailored résumé is later compared against
 * them so anything new (an employer, metric, skill…) can be flagged.
 *
 * Pure and deterministic so it's easy to unit-test.
 */

export interface ResumeFacts {
  /** Unique proper nouns / capitalized tokens (original casing kept). */
  properNouns: string[];
  /** Unique numeric tokens, e.g. "40", "3.8", "2023", "10+". */
  numbers: string[];
}

/** Strip LaTeX markup down to readable text, keeping the words inside commands. */
export function stripLatex(tex: string): string {
  return (
    tex
      // drop comments (unescaped %)
      .replace(/(?<!\\)%.*$/gm, " ")
      // drop control words: \textbf, \section, \item, \begin ...
      .replace(/\\[a-zA-Z@]+\*?/g, " ")
      // drop escaped specials: \&, \%, \_, \\, \#, \$ ...
      .replace(/\\[^a-zA-Z]/g, " ")
      // drop optional args and their contents: [scale=0.9]
      .replace(/\[[^\]\n]*\]/g, " ")
      // drop braces, math delimiters and table/format chars, keep inner text
      .replace(/[{}$&~^|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function dedupePreserveCase(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

export function extractResumeFacts(tex: string): ResumeFacts {
  const text = stripLatex(tex);

  // Proper nouns: runs of capitalized/initial-cap or all-caps tokens
  // (e.g. "Washington University", "Python", "AWS", "C++").
  const properNounRe =
    /\b[A-Z][A-Za-z0-9.+#]*(?:\s+(?:of|and|the|for)?\s*[A-Z][A-Za-z0-9.+#]*)*\b/g;
  const rawProper = (text.match(properNounRe) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  // Numbers: integers/decimals with optional grouping and a trailing + (e.g. "10+").
  const numberRe = /\b\d[\d,]*(?:\.\d+)?\+?/g;
  const rawNumbers = (text.match(numberRe) ?? []).map((s) =>
    s.replace(/,/g, ""),
  );

  return {
    properNouns: dedupePreserveCase(rawProper).slice(0, 1000),
    numbers: dedupePreserveCase(rawNumbers).slice(0, 1000),
  };
}
