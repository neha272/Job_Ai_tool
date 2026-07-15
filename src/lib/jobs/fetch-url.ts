import "server-only";
import { decode } from "he";

// LinkedIn/Indeed prohibit automated access. We only ever fetch a single page a
// user explicitly pastes (that's just reading a page); such jobs are marked
// sourceRestricted so the automated submit path is blocked (Phase 3).
const RESTRICTED_HOSTS = ["linkedin.com", "indeed.com"];

export function isRestrictedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return RESTRICTED_HOSTS.some((r) => host === r || host.endsWith(`.${r}`));
  } catch {
    return false;
  }
}

export async function fetchJobText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; JobCopilot/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch the page (HTTP ${res.status}).`);
  }
  const html = await res.text();
  return htmlToText(html);
}

/** Very small HTML → text extraction; good enough for a pasted job URL. */
function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  s = s
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decode(s);
  return s
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
