import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { GenerateOpts, Tier } from "./config";

const QUALITY_MODEL = "claude-opus-4-8";
const CHEAP_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

// Structured JSON output — for small, backslash-free shapes (e.g. fit scores).
export async function anthropicStructured<T extends z.ZodTypeAny>(
  opts: GenerateOpts<T>,
): Promise<z.infer<T> | null> {
  const messages = [{ role: "user" as const, content: opts.prompt }];
  const res =
    opts.tier === "quality"
      ? await getClient().messages.parse({
          model: QUALITY_MODEL,
          max_tokens: opts.maxTokens,
          thinking: { type: "adaptive" },
          output_config: { effort: "high", format: zodOutputFormat(opts.schema) },
          system: opts.system,
          messages,
        })
      : await getClient().messages.parse({
          model: CHEAP_MODEL,
          max_tokens: opts.maxTokens,
          output_config: { format: zodOutputFormat(opts.schema) },
          system: opts.system,
          messages,
        });
  return res.parsed_output ?? null;
}

// Free-form text output — for LaTeX-heavy generation, parsed via markers so
// backslashes never have to survive JSON escaping.
export async function anthropicText(opts: {
  system: string;
  prompt: string;
  maxTokens: number;
  tier: Tier;
}): Promise<string> {
  const messages = [{ role: "user" as const, content: opts.prompt }];
  const res =
    opts.tier === "quality"
      ? await getClient().messages.create({
          model: QUALITY_MODEL,
          max_tokens: opts.maxTokens,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          system: opts.system,
          messages,
        })
      : await getClient().messages.create({
          model: CHEAP_MODEL,
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages,
        });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
