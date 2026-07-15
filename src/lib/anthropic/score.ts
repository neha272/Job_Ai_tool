import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropic, SCORE_MODEL } from "./client";
import { logger } from "@/lib/logger";

const ScoreSchema = z.object({
  fit: z.number().int(),
  reasons: z.array(z.string()),
});

export interface FitScore {
  fit: number; // 0-100
  reasons: string[];
}

// Cheap/fast fit scoring with Haiku 4.5 + structured output.
// No `effort` (unsupported on Haiku 4.5) and no thinking — a quick judgement.
export async function scoreFit(
  baseTex: string,
  jobText: string,
): Promise<FitScore> {
  const client = getAnthropic();
  const res = await client.messages.parse({
    model: SCORE_MODEL,
    max_tokens: 512,
    output_config: { format: zodOutputFormat(ScoreSchema) },
    system:
      "You rate how well a candidate's résumé fits a job posting on a 0–100 scale. Be calibrated (most real applications land 30–80) and terse. Base the score only on evidence in the résumé; do not assume skills that aren't shown.",
    messages: [
      {
        role: "user",
        content: [
          "RÉSUMÉ:",
          baseTex.slice(0, 20000),
          "",
          "JOB POSTING:",
          jobText.slice(0, 20000),
          "",
          "Return `fit` (integer 0–100) and up to 3 short `reasons`.",
        ].join("\n"),
      },
    ],
  });
  if (!res.parsed_output) {
    logger.warn("score", "no structured output", { stop: res.stop_reason });
    return { fit: 0, reasons: [] };
  }
  const fit = Math.max(0, Math.min(100, Math.round(res.parsed_output.fit)));
  return { fit, reasons: res.parsed_output.reasons.slice(0, 5) };
}
