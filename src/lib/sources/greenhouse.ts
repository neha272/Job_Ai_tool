import { decode } from "he";
import { htmlToPlain } from "@/lib/html";
import type { NormalizedPosting } from "./types";

interface GreenhouseJob {
  id: number;
  title: string;
  location?: { name?: string };
  absolute_url: string;
  content?: string | null;
}

// Greenhouse `content` is HTML that arrives entity-ENCODED (`<p>` → `&lt;p&gt;`).
// Decode exactly once to get real HTML; htmlToPlain then decodes the resulting
// markup's own entities once more (correct for the double-encoding).
export function parseGreenhouse(
  data: unknown,
  token: string,
): NormalizedPosting[] {
  const jobs = (data as { jobs?: GreenhouseJob[] })?.jobs ?? [];
  return jobs.map((j) => {
    const html = j.content ? decode(j.content) : "";
    return {
      source: "greenhouse",
      externalId: String(j.id),
      company: token,
      title: j.title,
      location: j.location?.name ?? null,
      url: j.absolute_url,
      applyUrl: j.absolute_url, // Greenhouse has no separate apply URL
      descriptionHtml: html,
      descriptionPlain: htmlToPlain(html),
    };
  });
}

export async function fetchGreenhouse(
  token: string,
): Promise<NormalizedPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    token,
  )}/jobs?content=true`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Greenhouse "${token}": HTTP ${res.status}`);
  return parseGreenhouse(await res.json(), token);
}
