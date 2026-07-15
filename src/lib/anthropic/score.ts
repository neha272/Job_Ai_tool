import "server-only";
import { z } from "zod";
import { generateStructured } from "@/lib/llm";
import { logger } from "@/lib/logger";

const ScoreSchema = z.object({
  fit: z.number().int(),
  reasons: z.array(z.string()),
});

export interface FitScore {
  fit: number; // 0-100
  reasons: string[];
}

// Cheap/fast fit scoring (Haiku on Anthropic, or the local model).
export async function scoreFit(
  baseTex: string,
  jobText: string,
): Promise<FitScore> {
  const out = await generateStructured({
    system:
      "You rate how well a candidate's résumé fits a job posting on a 0–100 scale. Be calibrated (most real applications land 30–80) and terse. Base the score only on evidence in the résumé; do not assume skills that aren't shown.",
    prompt: [
      "RÉSUMÉ:",
      baseTex.slice(0, 20000),
      "",
      "JOB POSTING:",
      jobText.slice(0, 20000),
      "",
      "Return `fit` (integer 0–100) and up to 3 short `reasons`.",
    ].join("\n"),
    schema: ScoreSchema,
    maxTokens: 512,
    tier: "cheap",
  });
  if (!out) {
    logger.warn("score", "no structured output");
    return { fit: 0, reasons: [] };
  }
  const fit = Math.max(0, Math.min(100, Math.round(out.fit)));
  return { fit, reasons: out.reasons.slice(0, 5) };
}
