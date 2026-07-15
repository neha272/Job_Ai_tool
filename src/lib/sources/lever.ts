import { htmlToPlain } from "@/lib/html";
import type { NormalizedPosting } from "./types";

interface LeverPosting {
  id: string;
  text: string; // the title
  categories?: { location?: string };
  hostedUrl: string;
  applyUrl?: string;
  description?: string; // styled HTML (already real HTML)
  descriptionPlain?: string;
}

export function parseLever(data: unknown, token: string): NormalizedPosting[] {
  const arr = Array.isArray(data) ? (data as LeverPosting[]) : [];
  return arr.map((p) => ({
    source: "lever",
    externalId: String(p.id),
    company: token,
    title: p.text,
    location: p.categories?.location ?? null,
    url: p.hostedUrl,
    applyUrl: p.applyUrl ?? p.hostedUrl,
    descriptionHtml: p.description ?? "",
    descriptionPlain: p.descriptionPlain ?? htmlToPlain(p.description ?? ""),
  }));
}

// US host first, then EU (EU-hosted tenants are only reachable via api.eu.lever.co).
export async function fetchLever(token: string): Promise<NormalizedPosting[]> {
  for (const host of ["https://api.lever.co", "https://api.eu.lever.co"]) {
    const arr = await fetchLeverHost(host, token);
    if (arr !== null) return parseLever(arr, token);
  }
  throw new Error(`Lever "${token}": not found on US or EU host.`);
}

async function fetchLeverHost(
  host: string,
  token: string,
): Promise<unknown[] | null> {
  const limit = 100;
  const all: unknown[] = [];
  let skip = 0;
  while (true) {
    const url = `${host}/v0/postings/${encodeURIComponent(
      token,
    )}?mode=json&skip=${skip}&limit=${limit}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return skip === 0 ? null : all;
    const batch = await res.json();
    if (!Array.isArray(batch)) return skip === 0 ? null : all;
    all.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }
  return all;
}
