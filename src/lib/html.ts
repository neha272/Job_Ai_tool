import { decode } from "he";

/**
 * Strip HTML down to readable plain text and decode entities once. Safe to run
 * on already-decoded HTML (Lever/Ashby) — it only decodes the entities present
 * in whatever markup it's given.
 */
export function htmlToPlain(html: string): string {
  if (!html) return "";
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
