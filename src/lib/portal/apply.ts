import "server-only";
import type { Page, Frame, Locator } from "playwright";
import { getPortalContext } from "./browser";
import { detectWall, wallMessage } from "./detect";
import { generateText } from "@/lib/llm";
import { logger } from "@/lib/logger";

export interface ApplyProfile {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  details: Record<string, string>;
}

export interface CoverContext {
  resumeText: string;
  company: string;
  title: string;
  jobText: string;
}

export interface ApplyResult {
  status: "filled" | "needs_you" | "error";
  wall?: string;
  filled: string[];
  message: string;
}

type Target = Page | Frame;
const FIELD_PROBE =
  'input[type="file"], input[type="email"], input[name*="email" i], input[id*="email" i], textarea';

export async function openAndFill(
  applyUrl: string,
  pdfPath: string | null,
  profile: ApplyProfile,
  cover?: CoverContext,
): Promise<ApplyResult> {
  const ctx = await getPortalContext();
  const page = await ctx.newPage();

  try {
    await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (e) {
    return {
      status: "error",
      filled: [],
      message: `Couldn't open the page: ${e instanceof Error ? e.message : "navigation failed"}`,
    };
  }

  let wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled: [], message: wallMessage(wall) };

  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
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
        "Opened the page, but I couldn't find an application form to fill. Complete and submit it in the browser window.",
    };
  }

  const filled = await autofill(target, profile);
  if (pdfPath && (await uploadResume(target, pdfPath))) filled.push("résumé");
  if (cover && (await fillCoverLetter(target, cover))) filled.push("cover letter");

  wall = await detectWall(page);
  if (wall) return { status: "needs_you", wall, filled, message: wallMessage(wall) };

  logger.info("portal", "filled", { count: filled.length });
  return {
    status: "filled",
    filled,
    message: filled.length
      ? `Filled ${filled.join(", ")}. Review the browser window, complete anything left, and click Submit yourself.`
      : "Opened the form but couldn't map its fields. Fill and submit it in the browser window.",
  };
}

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

async function autofill(target: Target, p: ApplyProfile): Promise<string[]> {
  const parts = p.fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const d = p.details;

  // Order matters: more specific fields first so a generic keyword ("name",
  // "gender") doesn't claim a more specific control ("first name", "pronouns").
  const fields: { label: string; keywords: string[]; value: string }[] = [
    { label: "first name", keywords: ["first name", "given name", "first"], value: first },
    { label: "last name", keywords: ["last name", "family name", "surname", "last"], value: last },
    { label: "full name", keywords: ["full name", "your name", "legal name", "name"], value: p.fullName },
    { label: "email", keywords: ["email"], value: p.email },
    { label: "phone", keywords: ["phone", "mobile", "tel"], value: p.phone ?? "" },
    { label: "LinkedIn", keywords: ["linkedin"], value: p.linkedinUrl ?? "" },
    { label: "GitHub", keywords: ["github"], value: d.github ?? "" },
    { label: "website", keywords: ["portfolio", "website", "personal site"], value: d.portfolio ?? "" },
    { label: "country", keywords: ["country"], value: d.country ?? "" },
    { label: "location", keywords: ["location", "current city", "city"], value: d.location ?? "" },
    { label: "work authorization", keywords: ["authorized to work", "work authorization", "legally authorized"], value: d.workAuthorization ?? "" },
    { label: "sponsorship", keywords: ["sponsorship", "require sponsorship", "visa"], value: d.sponsorship ?? "" },
    { label: "relocate", keywords: ["relocate", "in-office", "in office", "onsite", "on-site"], value: d.relocate ?? "" },
    { label: "years experience", keywords: ["years of experience", "years experience"], value: d.yearsExperience ?? "" },
    { label: "pronouns", keywords: ["pronoun"], value: d.pronouns ?? "" },
    { label: "how heard", keywords: ["how did you hear", "referral source", "source"], value: d.heardAbout ?? "" },
    { label: "gender", keywords: ["gender"], value: d.gender ?? "" },
    { label: "hispanic/latino", keywords: ["hispanic", "latino"], value: d.hispanicLatino ?? "" },
    { label: "race", keywords: ["race", "ethnicity"], value: d.race ?? "" },
    { label: "veteran", keywords: ["veteran"], value: d.veteran ?? "" },
    { label: "disability", keywords: ["disability"], value: d.disability ?? "" },
  ];

  const used = new Set<string>();
  const filled: string[] = [];
  for (const f of fields) {
    if (!f.value.trim()) continue;
    if (await fillField(target, f.keywords, f.value, used)) filled.push(f.label);
  }
  return filled;
}

async function fillField(
  target: Target,
  keywords: string[],
  value: string,
  used: Set<string>,
): Promise<boolean> {
  // 1) by accessible label (matches text inputs AND <select>)
  for (const kw of keywords) {
    const loc = target.getByLabel(new RegExp(kw.replace(/\s+/g, "\\s*"), "i")).first();
    if (await handleControl(loc, value, used)) return true;
  }
  // 2) by attribute substring — inputs and selects
  for (const kw of keywords) {
    const attr = kw.replace(/\s+/g, "");
    const input = target
      .locator(`input[name*="${attr}" i], input[id*="${attr}" i], input[placeholder*="${attr}" i], input[aria-label*="${attr}" i]`)
      .first();
    if (await handleControl(input, value, used)) return true;
    const select = target
      .locator(`select[name*="${attr}" i], select[id*="${attr}" i], select[aria-label*="${attr}" i]`)
      .first();
    if (await handleSelect(select, value, used)) return true;
  }
  return false;
}

async function handleControl(loc: Locator, value: string, used: Set<string>): Promise<boolean> {
  try {
    if (!(await loc.count())) return false;
    const tag = ((await loc.evaluate((el) => el.tagName).catch(() => "")) as string) || "";
    if (tag === "SELECT") return handleSelect(loc, value, used);
    if (!(await loc.isEditable({ timeout: 400 }).catch(() => false))) return false;
    const key = await keyOf(loc);
    if (used.has(key)) return false;
    await loc.fill(value, { timeout: 2000 });
    used.add(key);
    return true;
  } catch {
    return false;
  }
}

async function handleSelect(loc: Locator, value: string, used: Set<string>): Promise<boolean> {
  try {
    if (!(await loc.count())) return false;
    const key = await keyOf(loc);
    if (used.has(key)) return false;
    const opts = await loc.locator("option").allTextContents();
    const vl = value.trim().toLowerCase();
    let idx = opts.findIndex((o) => o.trim().toLowerCase() === vl);
    if (idx < 0)
      idx = opts.findIndex(
        (o) => o.trim() && (o.toLowerCase().includes(vl) || vl.includes(o.trim().toLowerCase())),
      );
    if (idx < 0) return false;
    await loc.selectOption({ index: idx });
    used.add(key);
    return true;
  } catch {
    return false;
  }
}

async function keyOf(loc: Locator): Promise<string> {
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

async function fillCoverLetter(target: Target, cover: CoverContext): Promise<boolean> {
  // Only if the form actually asks for one.
  let field = target.getByLabel(/cover letter/i).first();
  if (!(await field.count().catch(() => 0))) {
    field = target
      .locator('textarea[name*="cover" i], textarea[id*="cover" i], textarea[aria-label*="cover" i]')
      .first();
  }
  if (!(await field.count().catch(() => 0))) return false;
  if (!(await field.isEditable({ timeout: 400 }).catch(() => false))) return false;

  try {
    const letter = await generateText({
      system:
        "You write concise, truthful cover letters. Use ONLY facts present in the résumé — never invent employers, skills, degrees, or metrics. Exactly 3 short paragraphs, plain text, no markdown, no bracketed placeholders.",
      prompt: [
        `Write a cover letter for the "${cover.title}" role at ${cover.company}.`,
        "",
        "RÉSUMÉ:",
        cover.resumeText.slice(0, 12000),
        "",
        "JOB DESCRIPTION:",
        cover.jobText.slice(0, 8000),
        "",
        "Return only the letter text.",
      ].join("\n"),
      maxTokens: 1400,
      tier: "quality",
    });
    if (letter.trim().length < 40) return false;
    await field.fill(letter.trim(), { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
