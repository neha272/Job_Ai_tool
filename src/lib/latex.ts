import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";

const execFileAsync = promisify(execFile);

// Gitignored; compiled résumé PDFs live here, one directory per resume id.
const STORAGE_DIR = path.join(process.cwd(), "storage", "resumes");

export interface CompileResult {
  ok: boolean;
  pdfPath?: string;
  log?: string;
  notes?: string[];
}

/**
 * Make LaTeX safe for Tectonic (XeTeX). Résumé templates (e.g. "Jake's Resume")
 * commonly use bits that crash or error under XeTeX:
 *  - `fontawesome5` aborts XeTeX when its OTF fonts aren't installed.
 *  - `\input{glyphtounicode}` / `\pdfgentounicode` are pdfTeX-only primitives.
 * We strip these at compile time only — the stored résumé is left untouched.
 */
export function sanitizeForTectonic(tex: string): { tex: string; notes: string[] } {
  const notes: string[] = [];
  let out = tex;

  if (/\\usepackage(\[[^\]]*\])?\{fontawesome5\}/.test(out)) {
    out = out.replace(/\\usepackage(\[[^\]]*\])?\{fontawesome5\}[ \t]*\r?\n?/g, "");
    // Stub the used \fa* icon commands (fa + Uppercase) so nothing is undefined.
    const names = new Set<string>();
    for (const m of out.matchAll(/\\(fa[A-Z][A-Za-z]*)\b/g)) names.add(m[1]);
    if (names.size > 0) {
      const defs = [...names]
        .map((n) => `\\providecommand{\\${n}}[1][]{}`)
        .join("\n");
      out = out.replace(/(\\documentclass[^\n]*\r?\n)/, `$1${defs}\n`);
    }
    notes.push("Removed FontAwesome icons (unsupported by the local PDF engine).");
  }

  if (/\\input\{glyphtounicode\}|\\pdf(gen|glyph)tounicode/.test(out)) {
    out = out.replace(/\\input\{glyphtounicode\}[ \t]*\r?\n?/g, "");
    out = out.replace(/^.*\\pdf(gen|glyph)tounicode.*\r?\n?/gm, "");
    notes.push("Removed pdfTeX-only glyphtounicode directives.");
  }

  // LLMs often emit unescaped & in prose (a "misplaced alignment tab" error).
  // Escape bare & outside tabular-like environments, where & is real alignment.
  {
    const blocks: string[] = [];
    const envRe =
      /\\begin\{(tabular\*?|tabularx|array|longtable|align\*?|matrix|split|cases)\}[\s\S]*?\\end\{\1\}/g;
    const masked = out.replace(envRe, (x) => {
      blocks.push(x);
      return `@@JCBLK${blocks.length - 1}@@`;
    });
    const escaped = masked.replace(/(?<!\\)&/g, "\\&");
    if (escaped !== masked) notes.push("Escaped unescaped & characters in text.");
    out = escaped.replace(/@@JCBLK(\d+)@@/g, (_, i) => blocks[Number(i)]);
  }

  return { tex: out, notes };
}

export async function compileLatex(
  tex: string,
  id: string,
): Promise<CompileResult> {
  const outDir = path.join(STORAGE_DIR, id);
  await mkdir(outDir, { recursive: true });
  const { tex: safeTex, notes } = sanitizeForTectonic(tex);
  const texPath = path.join(outDir, "resume.tex");
  await writeFile(texPath, safeTex, "utf8");

  try {
    // --untrusted: the .tex is model-generated. Generous timeout: first compiles
    // download packages from the network.
    await execFileAsync(
      "tectonic",
      ["-X", "compile", texPath, "--outdir", outDir, "--keep-logs", "--untrusted"],
      { timeout: 180_000, maxBuffer: 12 * 1024 * 1024 },
    );
    const pdfPath = path.join(outDir, "resume.pdf");
    await access(pdfPath);
    logger.info("latex", "compiled", { id, sanitized: notes.length });
    return { ok: true, pdfPath, notes };
  } catch (err) {
    const e = err as {
      stderr?: string;
      stdout?: string;
      message?: string;
      code?: unknown;
      killed?: boolean;
      signal?: string;
    };
    let log: string;
    if (e.killed || e.signal) {
      log = `Tectonic stopped (${e.signal || "timeout"}). First compiles can be slow while packages download — try again.`;
    } else {
      log =
        firstError(`${e.stdout ?? ""}\n${e.stderr ?? ""}`) ||
        String(e.message || "Unknown Tectonic error");
    }
    logger.warn("latex", "compile failed", {
      id,
      code: String(e.code ?? ""),
      signal: String(e.signal ?? ""),
    });
    return { ok: false, log, notes };
  }
}

function firstError(output: string): string {
  const lines = output.split("\n");
  const idx = lines.findIndex((l) =>
    /^error:|^!|Undefined control sequence|Emergency stop|Runaway/.test(l),
  );
  if (idx < 0) return output.trim().slice(0, 800);
  return lines.slice(idx, idx + 6).join("\n").trim();
}
