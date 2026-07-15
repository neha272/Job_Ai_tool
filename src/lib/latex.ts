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
}

/** Compiles LaTeX to PDF with Tectonic. `id` namespaces the output directory. */
export async function compileLatex(
  tex: string,
  id: string,
): Promise<CompileResult> {
  const outDir = path.join(STORAGE_DIR, id);
  await mkdir(outDir, { recursive: true });
  const texPath = path.join(outDir, "resume.tex");
  await writeFile(texPath, tex, "utf8");

  try {
    // --untrusted: the .tex is model-generated, so harden the engine.
    await execFileAsync(
      "tectonic",
      ["-X", "compile", texPath, "--outdir", outDir, "--keep-logs", "--untrusted"],
      { timeout: 90_000, maxBuffer: 10 * 1024 * 1024 },
    );
    const pdfPath = path.join(outDir, "resume.pdf");
    await access(pdfPath); // throws if Tectonic exited 0 but produced no PDF
    logger.info("latex", "compiled", { id });
    return { ok: true, pdfPath };
  } catch (err) {
    const e = err as { stderr?: string; message?: string; code?: unknown };
    const log = String(e.stderr || e.message || "Unknown Tectonic error");
    logger.warn("latex", "compile failed", { id, code: String(e.code ?? "") });
    return { ok: false, log };
  }
}
