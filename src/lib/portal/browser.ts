import "server-only";
import path from "node:path";
import type { BrowserContext } from "playwright";

// Persistent profile so ATS logins carry over between runs. Gitignored.
const USER_DATA_DIR = path.join(process.cwd(), ".userdata", "portal");

const g = globalThis as unknown as { __portalCtx?: BrowserContext };

// One shared, visible browser context. Headed by default so you can watch,
// solve CAPTCHAs/logins, and click Submit yourself. Set PORTAL_HEADLESS=1 for
// automated testing.
export async function getPortalContext(): Promise<BrowserContext> {
  if (g.__portalCtx) return g.__portalCtx;
  const { chromium } = await import("playwright");
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: process.env.PORTAL_HEADLESS === "1",
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  g.__portalCtx = ctx;
  ctx.on("close", () => {
    if (g.__portalCtx === ctx) g.__portalCtx = undefined;
  });
  return ctx;
}

export async function closePortalContext(): Promise<void> {
  if (g.__portalCtx) {
    await g.__portalCtx.close().catch(() => {});
    g.__portalCtx = undefined;
  }
}
