import "server-only";
import { decode } from "he";
import { htmlToPlain } from "@/lib/html";

export interface ResolvedJob {
  source: "greenhouse" | "lever" | "ashby" | "manual";
  company: string;
  title: string;
  location: string | null;
  descriptionText: string;
  url: string;
  applyUrl: string | null;
  restricted: boolean;
}

const RESTRICTED = ["linkedin.com", "indeed.com"];
function isRestricted(host: string): boolean {
  return RESTRICTED.some((r) => host === r || host.endsWith(`.${r}`));
}

export async function resolveJob(rawUrl: string): Promise<ResolvedJob> {
  const url = rawUrl.trim();
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid job URL.");
  }
  const host = u.hostname.toLowerCase();
  const segs = u.pathname.split("/").filter(Boolean);

  try {
    // Embedded Greenhouse on a company domain (e.g. brex.com/careers/ID?gh_jid=ID):
    // derive the board token from the hostname and use the Greenhouse API. The
    // original URL (incl. any gh_src referral) is preserved as the apply link.
    const ghJid = u.searchParams.get("gh_jid");
    if (ghJid && !host.endsWith("greenhouse.io")) {
      const token = host.replace(/^www\./, "").split(".")[0];
      const g = await greenhouseFetch(token, ghJid, url);
      if (g) return g;
    }

    if (host.endsWith("greenhouse.io")) {
      const ji = segs.indexOf("jobs");
      if (ji >= 1 && segs[ji + 1]) {
        const g = await greenhouseFetch(segs[ji - 1], segs[ji + 1].replace(/\D/g, ""));
        if (g) return g;
      }
    } else if (host.endsWith("lever.co")) {
      const l = await fromLever(segs, u);
      if (l) return l;
    } else if (host.endsWith("ashbyhq.com")) {
      const a = await fromAshby(segs, u);
      if (a) return a;
    }
  } catch {
    // fall through to the generic HTML path
  }

  return fromGeneric(u, url, isRestricted(host));
}

async function greenhouseFetch(
  token: string,
  id: string,
  urlOverride?: string,
): Promise<ResolvedJob | null> {
  if (!token || !id) return null;
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${id}?content=true`,
    { headers: { accept: "application/json" } },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as {
    title?: string;
    location?: { name?: string };
    content?: string;
    absolute_url?: string;
  };
  if (!j.title) return null;
  const html = j.content ? decode(j.content) : "";
  const link = urlOverride || j.absolute_url || "";
  return {
    source: "greenhouse",
    company: token,
    title: j.title,
    location: j.location?.name ?? null,
    descriptionText: htmlToPlain(html),
    url: link,
    applyUrl: link || null,
    restricted: false,
  };
}

async function fromLever(segs: string[], u: URL): Promise<ResolvedJob | null> {
  if (segs.length < 2) return null;
  const [token, id] = segs;
  const apiHost = u.hostname.includes(".eu.")
    ? "https://api.eu.lever.co"
    : "https://api.lever.co";
  const res = await fetch(`${apiHost}/v0/postings/${token}/${id}?mode=json`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const p = (await res.json()) as {
    text?: string;
    categories?: { location?: string };
    hostedUrl?: string;
    applyUrl?: string;
    description?: string;
    descriptionPlain?: string;
  };
  if (!p.text) return null;
  return {
    source: "lever",
    company: token,
    title: p.text,
    location: p.categories?.location ?? null,
    descriptionText: p.descriptionPlain || htmlToPlain(p.description ?? ""),
    url: p.hostedUrl || u.toString(),
    applyUrl: p.applyUrl ?? p.hostedUrl ?? null,
    restricted: false,
  };
}

async function fromAshby(segs: string[], u: URL): Promise<ResolvedJob | null> {
  if (segs.length < 2) return null;
  const [token, id] = segs;
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${token}`,
    { headers: { accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    jobs?: Array<{
      id?: string;
      title?: string;
      location?: string | { name?: string };
      jobUrl?: string;
      applyUrl?: string;
      descriptionHtml?: string;
      descriptionPlain?: string;
    }>;
  };
  const j = (data.jobs ?? []).find((x) => String(x.id) === id);
  if (!j?.title) return null;
  return {
    source: "ashby",
    company: token,
    title: j.title,
    location:
      typeof j.location === "string" ? j.location : (j.location?.name ?? null),
    descriptionText: j.descriptionPlain || htmlToPlain(j.descriptionHtml ?? ""),
    url: j.jobUrl || u.toString(),
    applyUrl: j.applyUrl ?? j.jobUrl ?? null,
    restricted: false,
  };
}

function meta(html: string, prop: string): string {
  const re1 = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
    "i",
  );
  const m = html.match(re1) || html.match(re2);
  return m ? decode(m[1]).trim() : "";
}

async function fromGeneric(
  u: URL,
  url: string,
  restricted: boolean,
): Promise<ResolvedJob> {
  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; JobCopilot/1.0)",
        accept: "text/html",
      },
      redirect: "follow",
    });
    if (res.ok) html = await res.text();
  } catch {
    // leave html empty; caller validates description length
  }
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title =
    meta(html, "og:title") ||
    (titleTag ? decode(titleTag[1]).trim() : "") ||
    "Job";
  const company =
    meta(html, "og:site_name") || u.hostname.replace(/^www\./, "");
  return {
    source: "manual",
    company,
    title,
    location: null,
    descriptionText: htmlToPlain(html),
    url,
    applyUrl: url,
    restricted,
  };
}
