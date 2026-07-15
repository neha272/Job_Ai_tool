import type { Page } from "playwright";

export type WallReason =
  | "recaptcha"
  | "hcaptcha"
  | "cloudflare"
  | "login"
  | null;

// DETECT ONLY — never solve or bypass. Inspects cross-origin frames (where
// captchas render) plus the page title and a password field for login walls.
export async function detectWall(page: Page): Promise<WallReason> {
  const frameHit = (needle: string) =>
    page.frames().some((f) => f.url().includes(needle));

  if (frameHit("recaptcha/api2") || frameHit("google.com/recaptcha")) {
    return "recaptcha";
  }
  if (frameHit("hcaptcha.com")) return "hcaptcha";
  if (frameHit("challenges.cloudflare.com")) return "cloudflare";

  const title = (await page.title().catch(() => "")) || "";
  if (/just a moment|checking your browser|attention required/i.test(title)) {
    return "cloudflare";
  }

  const passwordFields = await page
    .locator('input[type="password"]')
    .count()
    .catch(() => 0);
  if (passwordFields > 0) return "login";

  return null;
}

export function wallMessage(reason: WallReason): string {
  switch (reason) {
    case "recaptcha":
    case "hcaptcha":
      return "A CAPTCHA is on the page — solve it in the open browser window, then click Open & fill again.";
    case "cloudflare":
      return "A Cloudflare challenge is on the page — clear it in the browser window, then click Open & fill again.";
    case "login":
      return "This page needs you to log in — sign in in the browser window (your session is remembered), then click Open & fill again.";
    default:
      return "";
  }
}
