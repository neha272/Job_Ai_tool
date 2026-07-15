import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

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
  // Playwright caches browsers here on macOS. The npm package + browsers are
  // installed in Phase 3, so absence is a warning, not an error.
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

/** Reports only whether a var is set — never its value. */
function checkEnv(): CheckItem[] {
  const present = (v?: string) => typeof v === "string" && v.trim().length > 0;
  const anthropic = present(process.env.ANTHROPIC_API_KEY);
  const smtp =
    present(process.env.SMTP_USER) &&
    present(process.env.SMTP_PASS) &&
    present(process.env.MAIL_FROM);
  return [
    {
      key: "anthropic",
      label: "Anthropic API key",
      status: anthropic ? "ok" : "warn",
      detail: anthropic ? "Set." : "Not set.",
      hint: anthropic
        ? undefined
        : "Required from Phase 1 (tailoring + scoring). Add ANTHROPIC_API_KEY to .env",
    },
    {
      key: "smtp",
      label: "SMTP (email sending)",
      status: smtp ? "ok" : "warn",
      detail: smtp ? "Configured." : "Not fully configured.",
      hint: smtp
        ? undefined
        : "Required from Phase 1 (email method). Set SMTP_USER, SMTP_PASS, MAIL_FROM in .env",
    },
  ];
}

export async function getSystemCheck(): Promise<SystemCheckResult> {
  const [tectonic, database] = await Promise.all([
    checkTectonic(),
    checkDatabase(),
  ]);
  const items: CheckItem[] = [
    tectonic,
    database,
    checkPlaywrightBrowsers(),
    ...checkEnv(),
  ];
  return { checkedAt: new Date().toISOString(), items };
}
