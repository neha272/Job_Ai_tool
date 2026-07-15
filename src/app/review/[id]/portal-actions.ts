"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/app/settings/types";

export interface PortalResult extends ActionResult {
  wall?: string;
  filled?: string[];
}

export async function prepareInPortal(appId: string): Promise<PortalResult> {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: true, resume: true },
  });
  if (!app) return { ok: false, message: "Application not found." };
  const applyUrl = app.job.applyUrl || app.job.url;
  if (!applyUrl) {
    return { ok: false, message: "This job has no apply link to open." };
  }
  const profile = await prisma.profile.findUnique({
    where: { id: "singleton" },
  });
  if (!profile) {
    return { ok: false, message: "Add your profile in Settings first." };
  }
  let details: Record<string, string> = {};
  try {
    details = JSON.parse(profile.detailsJson || "{}");
  } catch {
    details = {};
  }

  try {
    // Dynamic import keeps Playwright out of the bundle unless this runs.
    const { openAndFill } = await import("@/lib/portal/apply");
    const res = await openAndFill(applyUrl, app.resume.pdfPath, {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      linkedinUrl: profile.linkedinUrl,
      details,
    });
    return {
      ok: res.status !== "error",
      message: res.message,
      wall: res.wall,
      filled: res.filled,
    };
  } catch (e) {
    logger.error("portal", "automation failed", { err: String(e) });
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "Browser automation failed. Run: npx playwright install chromium",
    };
  }
}

export async function markApplied(appId: string): Promise<ActionResult> {
  await prisma.application.update({
    where: { id: appId },
    data: { status: "applied", appliedAt: new Date(), method: "portal" },
  });
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: "Marked as applied." };
}

export async function closePortalBrowser(): Promise<ActionResult> {
  try {
    const { closePortalContext } = await import("@/lib/portal/browser");
    await closePortalContext();
  } catch {
    /* nothing open */
  }
  return { ok: true, message: "Closed the browser." };
}
