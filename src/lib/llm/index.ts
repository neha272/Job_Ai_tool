import "server-only";
import type { z } from "zod";
import { hasAnthropic, type GenerateOpts, type Tier } from "./config";
import { anthropicStructured, anthropicText } from "./anthropic";
import { ollamaStructured, ollamaText } from "./ollama";

// Structured JSON — for small, backslash-free shapes (fit scores).
export async function generateStructured<T extends z.ZodTypeAny>(
  opts: GenerateOpts<T>,
): Promise<z.infer<T> | null> {
  return hasAnthropic() ? anthropicStructured(opts) : ollamaStructured(opts);
}

// Free-form text — for LaTeX-heavy generation (parsed via markers by callers).
export async function generateText(opts: {
  system: string;
  prompt: string;
  maxTokens: number;
  tier: Tier;
}): Promise<string> {
  return hasAnthropic() ? anthropicText(opts) : ollamaText(opts);
}

export { hasAnthropic, providerName } from "./config";
