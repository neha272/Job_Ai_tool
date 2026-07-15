import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton so importing this module doesn't throw at build time when the
// key is absent — it only throws when we actually try to call the API.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env, then restart the dev server.",
    );
  }
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

// High-quality tailoring; cheap/fast fit-scoring (scoring lands in Phase 2).
export const TAILOR_MODEL = "claude-opus-4-8";
export const SCORE_MODEL = "claude-haiku-4-5";
