import "server-only";
import { z } from "zod";
import {
  OLLAMA_URL,
  OLLAMA_MODEL,
  OLLAMA_NUM_CTX,
  type GenerateOpts,
  type Tier,
} from "./config";
import { logger } from "@/lib/logger";

function unreachable(e: unknown): Error {
  return new Error(
    `Local model unreachable at ${OLLAMA_URL}. Start Ollama (\`ollama serve\`) or set ANTHROPIC_API_KEY. (${
      e instanceof Error ? e.message : "connection failed"
    })`,
  );
}

async function ollamaChat(
  system: string,
  prompt: string,
  maxTokens: number,
  format?: unknown,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(300_000),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        ...(format ? { format } : {}),
        options: {
          num_ctx: OLLAMA_NUM_CTX,
          num_predict: maxTokens,
          temperature: 0.2,
        },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (e) {
    throw unreachable(e);
  }
  if (!res.ok) {
    throw new Error(
      `Ollama returned HTTP ${res.status}. Is the model "${OLLAMA_MODEL}" pulled? Try: ollama pull ${OLLAMA_MODEL}`,
    );
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// Structured JSON via Ollama's schema-constrained `format`.
export async function ollamaStructured<T extends z.ZodTypeAny>(
  opts: GenerateOpts<T>,
): Promise<z.infer<T> | null> {
  const content = await ollamaChat(
    opts.system,
    opts.prompt,
    opts.maxTokens,
    z.toJSONSchema(opts.schema),
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    logger.warn("ollama", "non-JSON response", { head: content.slice(0, 120) });
    return null;
  }
  const result = opts.schema.safeParse(parsed);
  if (!result.success) {
    logger.warn("ollama", "schema mismatch", {
      issues: result.error.issues.length,
    });
    return null;
  }
  return result.data;
}

// Free-form text (no `format`) — for LaTeX-heavy generation.
export async function ollamaText(opts: {
  system: string;
  prompt: string;
  maxTokens: number;
  tier: Tier;
}): Promise<string> {
  return ollamaChat(opts.system, opts.prompt, opts.maxTokens);
}
