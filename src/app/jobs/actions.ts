"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchJobText, isRestrictedUrl } from "@/lib/jobs/fetch-url";
import { tailorApplication } from "@/lib/pipeline/tailor-application";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/app/settings/types";

export async function createAndTailor(input: {
  company: string;
  title: string;
  recipientEmail: string;
  location: string;
  sourceUrl: string;
  jobText: string;
}): Promise<ActionResult> {
  const company = input.company.trim();
  const title = input.title.trim();
  if (!company || !title) {
    return { ok: false, message: "Company and title are required." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      message: "ANTHROPIC_API_KEY is not set. Add it to .env and restart the dev server.",
    };
  }
  const base = await prisma.resume.findFirst({ where: { isBase: true } });
  if (!base) {
    return { ok: false, message: "Add your base résumé in Settings first." };
  }

  let jobText = input.jobText.trim();
  const url = input.sourceUrl.trim();
  if (!jobText && url) {
    try {
      jobText = await fetchJobText(url);
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Could not fetch that URL — paste the description instead.",
      };
    }
  }
  if (jobText.length < 30) {
    return { ok: false, message: "Paste the job description (or give a fetchable URL)." };
  }

  const restricted = url ? isRestrictedUrl(url) : false;
  const job = await prisma.jobPosting.create({
    data: {
      source: "manual",
      sourceRestricted: restricted,
      company,
      title,
      location: input.location.trim() || null,
      url: url || "",
      applyUrl: url || null,
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
