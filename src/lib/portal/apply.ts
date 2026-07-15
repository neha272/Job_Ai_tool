import "server-only";
import type { Page, Frame, Locator } from "playwright";
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

type Target = Page | Frame;

// A form is "present" once we can see a file input or an email field.
const FIELD_PROBE =
  'input[type="file"], input[type="email"], input[name*="email" i], input[id*="email" i]';

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

  let wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled: [], message: wallMessage(wall) };

  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  // Find the form; if none, the form may be behind an "Apply" button.
  let target = await findFormTarget(page);
  if (!target) {
    await tryClickApply(page);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    target = await findFormTarget(page);
  }

  wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled: [], message: wallMessage(wall) };

  if (!target) {
    return {
      status: "filled",
      filled: [],
      message:
        "Opened the page, but I couldn't find an application form to fill automatically. Complete and submit it in the browser window.",
    };
  }

  const filled = await autofill(target, profile);
  if (pdfPath && (await uploadResume(target, pdfPath))) filled.push("résumé");

  wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled, message: wallMessage(wall) };

  logger.info("portal", "filled", { count: filled.length });
  return {
    status: "filled",
    filled,
    message: filled.length
      ? `Filled ${filled.join(", ")}. Review the open browser window, complete anything left, and click Submit yourself.`
      : "Opened the form but couldn't map its fields. Fill and submit it in the browser window.",
  };
}

// Search the main frame and any iframes (Greenhouse embeds a form in an iframe).
async function findFormTarget(page: Page): Promise<Target | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const f of page.frames()) {
      const n = await f.locator(FIELD_PROBE).count().catch(() => 0);
      if (n > 0) return f;
    }
    await page.waitForTimeout(1500);
  }
  return null;
}

async function tryClickApply(page: Page): Promise<void> {
  const candidates: Locator[] = [
    page.getByRole("link", { name: /apply/i }).first(),
    page.getByRole("button", { name: /apply/i }).first(),
    page.locator('a:has-text("Apply"), button:has-text("Apply")').first(),
  ];
  for (const c of candidates) {
    try {
      if ((await c.count()) && (await c.isVisible({ timeout: 500 }).catch(() => false))) {
        await c.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1500);
        return;
      }
    } catch {
      /* try next */
    }
  }
}

async function autofill(target: Target, profile: ApplyProfile): Promise<string[]> {
  const filled: string[] = [];
  const parts = profile.fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const d = profile.details;

  const fields: Array<{ label: string; phrases: string[]; attrs: string[]; value: string }> = [
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

  const used = new Set<string>();
  for (const f of fields) {
    if (!f.value.trim()) continue;
    if (await fillOne(target, f.phrases, f.attrs, f.value, used)) filled.push(f.label);
  }
  return filled;
}

async function fillOne(
  target: Target,
  phrases: string[],
  attrs: string[],
  value: string,
  used: Set<string>,
): Promise<boolean> {
  const tryFill = async (loc: Locator): Promise<boolean> => {
    try {
      if (!(await loc.count())) return false;
      if (!(await loc.isEditable({ timeout: 500 }).catch(() => false))) return false;
      const key = await fieldKey(loc);
      if (used.has(key)) return false;
      await loc.fill(value, { timeout: 2000 });
      used.add(key);
      return true;
    } catch {
      return false;
    }
  };

  for (const phrase of phrases) {
    const byLabel = target
      .getByLabel(new RegExp(phrase.replace(/\s+/g, "\\s*"), "i"))
      .first();
    if (await tryFill(byLabel)) return true;
  }
  for (const attr of attrs) {
    const sel = [
      `input[name*="${attr}" i]`,
      `input[id*="${attr}" i]`,
      `input[placeholder*="${attr}" i]`,
      `input[aria-label*="${attr}" i]`,
    ].join(",");
    if (await tryFill(target.locator(sel).first())) return true;
  }
  return false;
}

async function fieldKey(loc: Locator): Promise<string> {
  const name = await loc.getAttribute("name").catch(() => null);
  const id = await loc.getAttribute("id").catch(() => null);
  return name || id || Math.random().toString(36).slice(2);
}

async function uploadResume(target: Target, pdfPath: string): Promise<boolean> {
  try {
    const fileInput = target.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(pdfPath, { timeout: 5000 });
      return true;
    }
  } catch {
    /* no file input */
  }
  return false;
}
