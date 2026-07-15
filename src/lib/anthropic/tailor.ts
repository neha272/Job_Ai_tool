import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropic, TAILOR_MODEL } from "./client";
import { TAILOR_SYSTEM, buildTailorUserPrompt, FIX_LATEX_SYSTEM } from "./prompts";
import { logger } from "@/lib/logger";

const ChangeSchema = z.object({
  section: z.string(),
  what: z.string(),
  why: z.string(),
});

const TailorSchema = z.object({
  revisedTex: z.string(),
  changes: z.array(ChangeSchema),
});

export type ResumeChange = z.infer<typeof ChangeSchema>;
export type TailorResult = z.infer<typeof TailorSchema>;

const FixSchema = z.object({
  revisedTex: z.string(),
  fixSummary: z.string(),
});

export async function tailorResume(
  baseTex: string,
  jobText: string,
): Promise<TailorResult> {
  const client = getAnthropic();
  logger.info("tailor", "tailoring resume", { jobChars: jobText.length });
  const res = await client.messages.parse({
    model: TAILOR_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(TailorSchema) },
    system: TAILOR_SYSTEM,
    messages: [{ role: "user", content: buildTailorUserPrompt(baseTex, jobText) }],
  });
  if (!res.parsed_output) {
    throw new Error(
      res.stop_reason === "refusal"
        ? "The model declined to tailor this résumé."
        : "Tailoring returned no structured output.",
    );
  }
  logger.info("tailor", "tailored", { changes: res.parsed_output.changes.length });
  return res.parsed_output;
}

export async function fixLatexError(
  tex: string,
  errorLog: string,
): Promise<{ revisedTex: string; fixSummary: string }> {
  const client = getAnthropic();
  logger.info("tailor", "fixing latex error");
  const res = await client.messages.parse({
    model: TAILOR_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(FixSchema) },
    system: FIX_LATEX_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          "This LaTeX failed to compile with Tectonic.",
          "",
          "<error>",
          errorLog.slice(0, 6000),
          "</error>",
          "",
          "<latex>",
          tex,
          "</latex>",
          "",
          'Return the corrected complete LaTeX in "revisedTex" and a one-line "fixSummary". Do not change any résumé facts.',
        ].join("\n"),
      },
    ],
  });
  if (!res.parsed_output) throw new Error("LaTeX fix returned no output.");
  return res.parsed_output;
}
