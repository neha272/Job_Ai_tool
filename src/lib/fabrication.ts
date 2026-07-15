import { extractResumeFacts } from "@/lib/resume-facts";

export interface FabricationFlags {
  /** Proper nouns in the tailored résumé whose every word is absent from the base. */
  properNouns: string[];
  /** Numbers in the tailored résumé not present in the base. */
  numbers: string[];
}

interface StoredFacts {
  properNouns?: string[];
  numbers?: string[];
}

/**
 * Flags anything in the tailored résumé that looks fabricated — a proper noun
 * or number that isn't traceable to the base résumé's facts. Word-level
 * comparison for proper nouns keeps multi-word phrasing changes from
 * false-flagging (only an entirely-new capitalized token is flagged).
 */
export function findFabrications(
  baseFactsJson: string | null | undefined,
  tailoredTex: string,
): FabricationFlags {
  let base: StoredFacts = {};
  try {
    base = JSON.parse(baseFactsJson || "{}") as StoredFacts;
  } catch {
    base = {};
  }

  const baseWords = new Set<string>();
  for (const phrase of base.properNouns ?? []) {
    for (const word of phrase.split(/\s+/)) {
      if (word) baseWords.add(word.toLowerCase());
    }
  }
  const baseNumbers = new Set((base.numbers ?? []).map(String));

  const tailored = extractResumeFacts(tailoredTex);

  const properNouns = tailored.properNouns.filter((phrase) => {
    const words = phrase
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter(Boolean);
    return words.length > 0 && words.every((w) => !baseWords.has(w));
  });

  const numbers = tailored.numbers.filter((n) => !baseNumbers.has(String(n)));

  return { properNouns, numbers };
}

export function hasFabrications(flags: FabricationFlags): boolean {
  return flags.properNouns.length > 0 || flags.numbers.length > 0;
}
