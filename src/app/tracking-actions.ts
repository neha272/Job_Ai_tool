"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/status";
import type { ActionResult } from "@/app/settings/types";

export async function setStatus(
  appId: string,
  status: string,
): Promise<ActionResult> {
  if (!STATUSES.includes(status as Status)) {
    return { ok: false, message: "Unknown status." };
  }
  const data: { status: string; appliedAt?: Date } = { status };
  if (status === "applied") data.appliedAt = new Date();
  await prisma.application.update({ where: { id: appId }, data });
  revalidatePath("/");
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: `Moved to ${STATUS_LABEL[status as Status]}.` };
}

export async function saveNotes(
  appId: string,
  notes: string,
): Promise<ActionResult> {
  await prisma.application.update({
    where: { id: appId },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/");
  revalidatePath(`/review/${appId}`);
  return { ok: true, message: "Notes saved." };
}

export async function setFollowUp(
  appId: string,
  dateStr: string,
): Promise<ActionResult> {
  let followUpAt: Date | null = null;
  if (dateStr.trim()) {
    followUpAt = new Date(dateStr);
    if (Number.isNaN(followUpAt.getTime())) {
      return { ok: false, message: "Invalid date." };
    }
  }
  await prisma.application.update({
    where: { id: appId },
    data: { followUpAt },
  });
  revalidatePath("/");
  revalidatePath(`/review/${appId}`);
  return {
    ok: true,
    message: followUpAt ? "Follow-up date set." : "Follow-up cleared.",
  };
}
