"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getMailer } from "@/lib/mailer";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/app/settings/types";

interface Draft {
  to: string;
  subject: string;
  body: string;
}

export async function saveDraft(
  appId: string,
  draft: Draft,
): Promise<ActionResult> {
  await prisma.application.update({
    where: { id: appId },
    data: { draftEmail: JSON.stringify(draft) },
  });
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: "Draft saved." };
}

export async function sendApplication(
  appId: string,
  draft: Draft,
): Promise<ActionResult> {
  const app = await prisma.application.findUnique({
    where: { id: appId },
    include: { resume: true, job: true },
  });
  if (!app) return { ok: false, message: "Application not found." };
  if (app.status === "applied") {
    return { ok: false, message: "This application was already sent." };
  }
  // Guardrail: restricted sources never go out via the automated path.
  if (app.job.sourceRestricted && app.method === "portal") {
    return {
      ok: false,
      message:
        "This source blocks the automated submit path — open the page and submit it yourself.",
    };
  }
  const to = draft.to.trim();
  if (!to) return { ok: false, message: "Add a recipient email first." };
  if (!app.resume.pdfPath) {
    return {
      ok: false,
      message: "There's no compiled PDF to attach — fix the LaTeX and re-tailor.",
    };
  }

  await prisma.application.update({
    where: { id: appId },
    data: { draftEmail: JSON.stringify(draft) },
  });

  try {
    await getMailer().send({
      to,
      subject: draft.subject,
      text: draft.body,
      attachmentPath: app.resume.pdfPath,
      attachmentName: `${app.job.company.replace(/[^\w.-]+/g, "_")}-resume.pdf`,
    });
  } catch (e) {
    logger.error("send", "email failed", { appId, err: String(e) });
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed to send the email.",
    };
  }

  await prisma.application.update({
    where: { id: appId },
    data: { status: "applied", appliedAt: new Date() },
  });
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: "Application sent." };
}

export async function rejectApplication(appId: string): Promise<ActionResult> {
  await prisma.application.update({
    where: { id: appId },
    data: { status: "rejected" },
  });
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: "Application rejected." };
}
