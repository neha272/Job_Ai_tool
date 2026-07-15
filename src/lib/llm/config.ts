import type { z } from "zod";

// "quality" → best model (Opus on Anthropic); "cheap" → fast/cheap (Haiku).
// On the local provider there's a single model, so the tier is informational.
export type Tier = "quality" | "cheap";

export interface GenerateOpts<T extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: T;
  maxTokens: number;
  tier: Tier;
}

export function hasAnthropic(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export const OLLAMA_URL =
  process.env.OLLAMA_URL?.trim() || "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "llama3";
export const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX) || 8192;

export function providerName(): string {
  return hasAnthropic()
    ? "Anthropic (Claude)"
    : `Local model (Ollama: ${OLLAMA_MODEL})`;
}
