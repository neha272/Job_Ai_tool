import { htmlToPlain } from "@/lib/html";
import type { NormalizedPosting } from "./types";

interface AshbyJob {
  id: string;
  title: string;
  location?: string | { name?: string };
  jobUrl: string;
  applyUrl?: string;
  descriptionHtml?: string; // real HTML (not entity-escaped)
  descriptionPlain?: string;
  isListed?: boolean;
}

export function parseAshby(data: unknown, token: string): NormalizedPosting[] {
  const jobs = (data as { jobs?: AshbyJob[] })?.jobs ?? [];
  return jobs
    .filter((j) => j.isListed !== false)
    .map((j) => ({
      source: "ashby",
      externalId: String(j.id),
      company: token,
      title: j.title,
      location:
        typeof j.location === "string"
          ? j.location
          : (j.location?.name ?? null),
      url: j.jobUrl,
      applyUrl: j.applyUrl ?? j.jobUrl,
      descriptionHtml: j.descriptionHtml ?? "",
      descriptionPlain:
        j.descriptionPlain ?? htmlToPlain(j.descriptionHtml ?? ""),
    }));
}

// Public, unauthenticated posting API. Best-effort — the API path could change,
// so callers should treat a failure here as non-fatal for the whole run.
export async function fetchAshby(token: string): Promise<NormalizedPosting[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
    token,
  )}?includeCompensation=true`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Ashby "${token}": HTTP ${res.status}`);
  return parseAshby(await res.json(), token);
}
