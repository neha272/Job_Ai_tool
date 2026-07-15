"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractResumeFacts } from "@/lib/resume-facts";
import type { ActionResult, ResumeSaveResult } from "./types";

const BOARD_TYPES = ["greenhouse", "lever", "ashby"] as const;

export async function saveProfile(input: {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  details: Record<string, string>;
}): Promise<ActionResult> {
  // Structured application-form answers, stored as JSON in detailsJson.
  // Drop empties so the stored object stays tidy.
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.details ?? {})) {
    const val = (value ?? "").trim();
    if (val) details[key] = val;
  }
  const data = {
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim() || null,
    linkedinUrl: input.linkedinUrl.trim() || null,
    detailsJson: JSON.stringify(details),
  };
  await prisma.profile.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
  revalidatePath("/settings");
  return { ok: true, message: "Profile saved." };
}

export async function saveBaseResume(input: {
  texSource: string;
}): Promise<ResumeSaveResult> {
  const tex = input.texSource ?? "";
  if (tex.trim().length < 20) {
    return { ok: false, message: "Paste your résumé's LaTeX source first." };
  }
  const facts = extractResumeFacts(tex);
  const baseFacts = JSON.stringify(facts);
  const existing = await prisma.resume.findFirst({ where: { isBase: true } });
  if (existing) {
    await prisma.resume.update({
      where: { id: existing.id },
      data: { texSource: tex, baseFacts },
    });
  } else {
    await prisma.resume.create({
      data: { label: "Base resume", isBase: true, texSource: tex, baseFacts },
    });
  }
  revalidatePath("/settings");
  return {
    ok: true,
    message: "Base résumé saved.",
    facts: {
      properNouns: facts.properNouns.length,
      numbers: facts.numbers.length,
    },
  };
}

export async function addSource(input: {
  boardType: string;
  companyToken: string;
}): Promise<ActionResult> {
  const boardType = input.boardType;
  const companyToken = input.companyToken.trim();
  if (!BOARD_TYPES.includes(boardType as (typeof BOARD_TYPES)[number])) {
    return { ok: false, message: "Pick a board type." };
  }
  if (!companyToken) {
    return { ok: false, message: "Enter a company token." };
  }
  try {
    await prisma.sourceConfig.create({ data: { boardType, companyToken } });
  } catch {
    return { ok: false, message: "That source is already in the list." };
  }
  revalidatePath("/settings");
  return { ok: true, message: "Source added." };
}

export async function setSourceActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await prisma.sourceConfig.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
  return { ok: true, message: active ? "Source enabled." : "Source disabled." };
}

export async function deleteSource(id: string): Promise<ActionResult> {
  await prisma.sourceConfig.delete({ where: { id } });
  revalidatePath("/settings");
  return { ok: true, message: "Source removed." };
}
