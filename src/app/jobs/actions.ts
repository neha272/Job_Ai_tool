"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveJob } from "@/lib/jobs/resolve-url";
import { tailorApplication } from "@/lib/pipeline/tailor-application";
import { runDiscovery } from "@/lib/discovery/run-discovery";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/app/settings/types";

export async function createAndTailor(input: {
  company: string;
  title: string;
  recipientEmail: string;
  sourceUrl: string;
  jobText: string;
}): Promise<ActionResult> {
  const url = input.sourceUrl.trim();
  let company = input.company.trim();
  let title = input.title.trim();
  let location: string | null = null;
  let jobText = input.jobText.trim();
  let source = "manual";
  let restricted = false;
  let applyUrl: string | null = url || null;
  let postingUrl = url;

  // Paste-a-link: auto-fill company/title/description from the URL.
  if (url) {
    let resolved;
    try {
      resolved = await resolveJob(url);
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof Error
            ? e.message
            : "Couldn't read that link — paste the description instead.",
      };
    }
    company = company || resolved.company;
    title = title || resolved.title;
    location = resolved.location;
    jobText = jobText || resolved.descriptionText;
    source = resolved.source;
    restricted = resolved.restricted;
    applyUrl = resolved.applyUrl ?? url;
    postingUrl = resolved.url || url;
  }

  if (!company || !title) {
    return {
      ok: false,
      message: url
        ? "Couldn't read the company/title from that link — fill them in, or use a direct Greenhouse/Lever/Ashby job link."
        : "Add the company and title (or paste a job link).",
    };
  }
  const base = await prisma.resume.findFirst({ where: { isBase: true } });
  if (!base) {
    return { ok: false, message: "Add your base résumé in Settings first." };
  }
  if (jobText.length < 30) {
    return {
      ok: false,
      message: url
        ? "Couldn't get the description from that link — paste the description text instead."
        : "Paste the job description (or a job link).",
    };
  }

  const job = await prisma.jobPosting.create({
    data: {
      source,
      sourceRestricted: restricted,
      company,
      title,
      location,
      url: postingUrl || "",
      applyUrl,
      descriptionRaw: jobText,
    },
  });

  let appId: string;
  try {
    appId = await tailorApplication({
      jobId: job.id,
      recipientEmail: input.recipientEmail,
    });
  } catch (e) {
    logger.error("pipeline", "tailoring failed", { err: String(e) });
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Tailoring failed.",
    };
  }

  redirect(`/review/${appId}`);
}

export async function tailorExistingJob(jobId: string): Promise<ActionResult> {
  const base = await prisma.resume.findFirst({ where: { isBase: true } });
  if (!base) {
    return { ok: false, message: "Add your base résumé in Settings first." };
  }
  let appId: string;
  try {
    appId = await tailorApplication({ jobId });
  } catch (e) {
    logger.error("pipeline", "tailoring failed", { err: String(e) });
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Tailoring failed.",
    };
  }
  redirect(`/review/${appId}`);
}

export async function discoverNow(): Promise<ActionResult> {
  const r = await runDiscovery();
  revalidatePath("/jobs");
  const bits = [`${r.created} new`, `${r.fetched} fetched`];
  if (r.filteredOut) bits.push(`${r.filteredOut} outside US skipped`);
  if (r.scored) bits.push(`${r.scored} scored`);
  if (r.scoreSkipped) bits.push(`${r.scoreSkipped} left unscored (per-run cap)`);
  const summary = bits.join(" · ");
  if (r.errors.length > 0) {
    return {
      ok: r.created > 0,
      message: `${summary}. Source error: ${r.errors[0]}`,
    };
  }
  return {
    ok: true,
    message: r.created > 0 ? summary : `No new US jobs (${r.fetched} fetched).`,
  };
}
