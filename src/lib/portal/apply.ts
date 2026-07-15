import "server-only";
import type { Page } from "playwright";
import { getPortalContext } from "./browser";
import { detectWall, wallMessage } from "./detect";
import { logger } from "@/lib/logger";

export interface ApplyProfile {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  details: Record<string, string>;
}

export interface ApplyResult {
  status: "filled" | "needs_you" | "error";
  wall?: string;
  filled: string[];
  message: string;
}

export async function openAndFill(
  applyUrl: string,
  pdfPath: string | null,
  profile: ApplyProfile,
): Promise<ApplyResult> {
  const ctx = await getPortalContext();
  const page = await ctx.newPage();

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (e) {
    return {
      status: "error",
      filled: [],
      message: `Couldn't open the page: ${
        e instanceof Error ? e.message : "navigation failed"
      }`,
    };
  }

  // Pause at any wall before touching the page.
  let wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled: [], message: wallMessage(wall) };

  const filled = await autofill(page, profile);
  if (pdfPath) {
    const ok = await uploadResume(page, pdfPath);
    if (ok) filled.push("résumé");
  }

  // A wall may appear only after interaction.
  wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled, message: wallMessage(wall) };

  logger.info("portal", "filled", { count: filled.length });
  return {
    status: "filled",
    filled,
    message: filled.length
      ? `Filled ${filled.join(", ")}. Review the open browser window, complete anything left, and click Submit yourself.`
      : "Opened the page — I couldn't map its fields automatically. Fill and submit it in the browser window.",
  };
}

async function autofill(page: Page, profile: ApplyProfile): Promise<string[]> {
  const filled: string[] = [];
  const parts = profile.fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const d = profile.details;

  const targets: Array<{ label: string; phrases: string[]; attrs: string[]; value: string }> = [
    { label: "first name", phrases: ["first name", "given name"], attrs: ["first"], value: first },
    { label: "last name", phrases: ["last name", "family name", "surname"], attrs: ["last", "surname"], value: last },
    { label: "full name", phrases: ["full name", "your name", "name"], attrs: ["fullname", "full_name"], value: profile.fullName },
    { label: "email", phrases: ["email"], attrs: ["email"], value: profile.email },
    { label: "phone", phrases: ["phone", "mobile"], attrs: ["phone", "mobile", "tel"], value: profile.phone ?? "" },
    { label: "LinkedIn", phrases: ["linkedin"], attrs: ["linkedin"], value: profile.linkedinUrl ?? "" },
    { label: "GitHub", phrases: ["github"], attrs: ["github"], value: d.github ?? "" },
    { label: "website", phrases: ["portfolio", "website", "personal site"], attrs: ["website", "portfolio", "url"], value: d.portfolio ?? "" },
    { label: "location", phrases: ["location", "city"], attrs: ["location", "city"], value: d.location ?? "" },
  ];

  const done = new Set<string>(); // avoid filling two labels into the same field
  for (const t of targets) {
    if (!t.value.trim()) continue;
    const ok = await fillOne(page, t.phrases, t.attrs, t.value, done);
    if (ok) filled.push(t.label);
  }
  return filled;
}

async function fillOne(
  page: Page,
  phrases: string[],
  attrs: string[],
  value: string,
  done: Set<string>,
): Promise<boolean> {
  // 1) by accessible label text
  for (const phrase of phrases) {
    try {
      const el = page
        .getByLabel(new RegExp(phrase.replace(/\s+/g, "\\s*"), "i"))
        .first();
      if ((await el.count()) && (await el.isEditable({ timeout: 400 }).catch(() => false))) {
        const key = await fieldKey(el);
        if (!done.has(key)) {
          await el.fill(value, { timeout: 2000 });
          done.add(key);
          return true;
        }
      }
    } catch {
      /* try next */
    }
  }
  // 2) by name / id / placeholder / aria-label substring
  for (const attr of attrs) {
    const sel = [
      `input[name*="${attr}" i]`,
      `input[id*="${attr}" i]`,
      `input[placeholder*="${attr}" i]`,
      `input[aria-label*="${attr}" i]`,
    ].join(",");
    try {
      const el = page.locator(sel).first();
      if ((await el.count()) && (await el.isEditable({ timeout: 400 }).catch(() => false))) {
        const key = await fieldKey(el);
        if (!done.has(key)) {
          await el.fill(value, { timeout: 2000 });
          done.add(key);
          return true;
        }
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

async function fieldKey(el: import("playwright").Locator): Promise<string> {
  const name = await el.getAttribute("name").catch(() => null);
  const id = await el.getAttribute("id").catch(() => null);
  return name || id || Math.random().toString(36).slice(2);
}

async function uploadResume(page: Page, pdfPath: string): Promise<boolean> {
  try {
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(pdfPath, { timeout: 5000 });
      return true;
    }
  } catch {
    /* no file input found */
  }
  return false;
}
