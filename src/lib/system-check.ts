import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { hasAnthropic, OLLAMA_URL, OLLAMA_MODEL } from "@/lib/llm/config";

const execFileAsync = promisify(execFile);

export type CheckStatus = "ok" | "warn" | "error";

export interface CheckItem {
  key: string;
  label: string;
  status: CheckStatus;
  /** Human-readable current state. Never contains secret values. */
  detail: string;
  /** What to do about it, when not ok. */
  hint?: string;
}

export interface SystemCheckResult {
  checkedAt: string;
  items: CheckItem[];
}

async function checkTectonic(): Promise<CheckItem> {
  try {
    const { stdout, stderr } = await execFileAsync("tectonic", ["--version"], {
      timeout: 8000,
    });
    const version = (stdout || stderr).trim().split("\n")[0] || "installed";
    return {
      key: "tectonic",
      label: "Tectonic (LaTeX → PDF)",
      status: "ok",
      detail: version,
    };
  } catch {
    return {
      key: "tectonic",
      label: "Tectonic (LaTeX → PDF)",
      status: "error",
      detail: "Not found on PATH.",
      hint: "Required from Phase 1. Install with: brew install tectonic",
    };
  }
}

function checkPlaywrightBrowsers(): CheckItem {
  const cacheDir = join(homedir(), "Library", "Caches", "ms-playwright");
  try {
    const entries = readdirSync(cacheDir);
    const chromium = entries.filter(
      (e) => e.startsWith("chromium") || e.startsWith("chrome"),
    );
    if (chromium.length > 0) {
      return {
        key: "playwright",
        label: "Playwright browser (portal automation)",
        status: "ok",
        detail: `Found: ${chromium.join(", ")}`,
      };
    }
    return {
      key: "playwright",
      label: "Playwright browser (portal automation)",
      status: "warn",
      detail: "Cache exists but no Chromium/Chrome build found.",
      hint: "Set up in Phase 3: npx playwright install chrome",
    };
  } catch {
    return {
      key: "playwright",
      label: "Playwright browser (portal automation)",
      status: "warn",
      detail: "Not installed yet.",
      hint: "Set up in Phase 3: npx playwright install chrome",
    };
  }
}

async function checkDatabase(): Promise<CheckItem> {
  try {
    await prisma.profile.count();
    return {
      key: "database",
      label: "Database (SQLite via Prisma)",
      status: "ok",
      detail: "Connected; schema is migrated.",
    };
  } catch (err) {
    return {
      key: "database",
      label: "Database (SQLite via Prisma)",
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error.",
      hint: "Run: npx prisma migrate dev",
    };
  }
}

// The AI model can come from Anthropic (if a key is set) or a local Ollama model.
async function checkLlm(): Promise<CheckItem> {
  if (hasAnthropic()) {
    return {
      key: "llm",
      label: "AI model (tailoring + scoring)",
      status: "ok",
      detail: "Anthropic (Claude) — API key set.",
    };
  }
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name?: string }> };
      const names = (data.models ?? []).map((m) => m.name ?? "");
      const present = names.some((n) => n === OLLAMA_MODEL || n.startsWith(OLLAMA_MODEL));
      if (present) {
        return {
          key: "llm",
          label: "AI model (tailoring + scoring)",
          status: "ok",
          detail: `Local model — Ollama "${OLLAMA_MODEL}" (no API key needed).`,
        };
      }
      return {
        key: "llm",
        label: "AI model (tailoring + scoring)",
        status: "warn",
        detail: `Ollama is running but "${OLLAMA_MODEL}" isn't pulled.`,
        hint: `ollama pull ${OLLAMA_MODEL}`,
      };
    }
  } catch {
    // fall through to the warning below
  }
  return {
    key: "llm",
    label: "AI model (tailoring + scoring)",
    status: "warn",
    detail: "No AI model available.",
    hint: "Start Ollama (ollama serve) or set ANTHROPIC_API_KEY in .env.",
  };
}

/** Reports only whether SMTP is set — never the values. */
function checkSmtp(): CheckItem {
  const present = (v?: string) => typeof v === "string" && v.trim().length > 0;
  const smtp =
    present(process.env.SMTP_USER) &&
    present(process.env.SMTP_PASS) &&
    present(process.env.MAIL_FROM);
  return {
    key: "smtp",
    label: "SMTP (email sending)",
    status: smtp ? "ok" : "warn",
    detail: smtp ? "Configured." : "Not fully configured.",
    hint: smtp
      ? undefined
      : "Required only to auto-send email. Set SMTP_USER, SMTP_PASS, MAIL_FROM in .env",
  };
}

export async function getSystemCheck(): Promise<SystemCheckResult> {
  const [tectonic, database, llm] = await Promise.all([
    checkTectonic(),
    checkDatabase(),
    checkLlm(),
  ]);
  const items: CheckItem[] = [
    tectonic,
    database,
    llm,
    checkPlaywrightBrowsers(),
    checkSmtp(),
  ];
  return { checkedAt: new Date().toISOString(), items };
}
