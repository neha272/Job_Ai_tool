import "server-only";
import { generateText } from "@/lib/llm";
import {
  TAILOR_SYSTEM,
  FIX_LATEX_SYSTEM,
  buildTailorUserPrompt,
  buildFixPrompt,
  TEX_BEGIN,
  TEX_END,
  CHANGES_BEGIN,
  CHANGES_END,
} from "./prompts";
import { logger } from "@/lib/logger";

export interface ResumeChange {
  section: string;
  what: string;
  why: string;
}
export interface TailorResult {
  revisedTex: string;
  changes: ResumeChange[];
}

function between(s: string, a: string, b: string): string {
  const i = s.indexOf(a);
  if (i < 0) return "";
  const start = i + a.length;
  const j = s.indexOf(b, start);
  return (j < 0 ? s.slice(start) : s.slice(start, j)).trim();
}

function extractTex(raw: string): string {
  let tex = between(raw, TEX_BEGIN, TEX_END);
  if (!tex) {
    // Fallback if the model skipped the markers but returned a document.
    const m = raw.match(/\\documentclass[\s\S]*\\end\{document\}/);
    if (m) tex = m[0].trim();
  }
  // Strip accidental code fences.
  return tex
    .replace(/^```(?:latex|tex)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function parseChanges(raw: string): ResumeChange[] {
  if (!raw) return [];
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((c) => c && typeof c === "object")
        .map((c) => ({
          section: String(c.section ?? ""),
          what: String(c.what ?? ""),
          why: String(c.why ?? ""),
        }))
        .filter((c) => c.what);
    }
  } catch {
    // changes are informational — a parse failure is non-fatal
  }
  return [];
}

export async function tailorResume(
  baseTex: string,
  jobText: string,
): Promise<TailorResult> {
  logger.info("tailor", "tailoring resume", { jobChars: jobText.length });
  const raw = await generateText({
    system: TAILOR_SYSTEM,
    prompt: buildTailorUserPrompt(baseTex, jobText),
    maxTokens: 32000,
    tier: "quality",
  });
  const revisedTex = extractTex(raw);
  if (revisedTex.length < 20) {
    throw new Error(
      "The model didn't return usable LaTeX. On the local model, try a longer-context model (e.g. `qwen2.5:7b`) or set ANTHROPIC_API_KEY.",
    );
  }
  const changes = parseChanges(between(raw, CHANGES_BEGIN, CHANGES_END));
  logger.info("tailor", "tailored", { changes: changes.length });
  return { revisedTex, changes };
}

export async function fixLatexError(
  tex: string,
  errorLog: string,
): Promise<{ revisedTex: string; fixSummary: string }> {
  logger.info("tailor", "fixing latex error");
  const raw = await generateText({
    system: FIX_LATEX_SYSTEM,
    prompt: buildFixPrompt(tex, errorLog),
    maxTokens: 32000,
    tier: "quality",
  });
  const revisedTex = extractTex(raw);
  if (revisedTex.length < 20) {
    throw new Error("The model didn't return a usable LaTeX fix.");
  }
  return { revisedTex, fixSummary: "Auto-corrected a LaTeX compile error." };
}
