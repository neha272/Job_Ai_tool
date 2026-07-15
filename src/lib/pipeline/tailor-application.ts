import "server-only";
import { prisma } from "@/lib/prisma";
import { tailorResume, fixLatexError } from "@/lib/anthropic/tailor";
import { compileLatex } from "@/lib/latex";
import { findFabrications } from "@/lib/fabrication";
import { logger } from "@/lib/logger";

/**
 * The tailoring pipeline: tailor the base résumé to a job → fabrication check →
 * compile with Tectonic (self-correcting a LaTeX error once) → persist a new
 * tailored Resume and an Application in `pending_review`. Returns the
 * Application id. Throws with a user-facing message on unrecoverable failure.
 */
export async function tailorApplication(opts: {
  jobId: string;
  recipientEmail?: string;
}): Promise<string> {
  const job = await prisma.jobPosting.findUnique({ where: { id: opts.jobId } });
  if (!job) throw new Error("Job not found.");
  const base = await prisma.resume.findFirst({ where: { isBase: true } });
  if (!base) throw new Error("Add your base résumé in Settings first.");
  const profile = await prisma.profile.findUnique({
    where: { id: "singleton" },
  });

  const tailored = await tailorResume(base.texSource, job.descriptionRaw);

  const resume = await prisma.resume.create({
    data: {
      label: `Tailored — ${job.company}, ${job.title}`,
      isBase: false,
      texSource: tailored.revisedTex,
    },
  });

  // Compile; on a LaTeX error, feed it back to the model once, then give up.
  let finalTex = tailored.revisedTex;
  let compile = await compileLatex(finalTex, resume.id);
  if (!compile.ok) {
    logger.warn("pipeline", "compile failed; self-correcting once", {
      resumeId: resume.id,
    });
    const fixed = await fixLatexError(finalTex, compile.log ?? "");
    finalTex = fixed.revisedTex;
    await prisma.resume.update({
      where: { id: resume.id },
      data: { texSource: finalTex },
    });
    compile = await compileLatex(finalTex, resume.id);
  }

  let compileWarning: string | null = null;
  if (compile.ok && compile.pdfPath) {
    await prisma.resume.update({
      where: { id: resume.id },
      data: { pdfPath: compile.pdfPath },
    });
  } else {
    compileWarning = (compile.log ?? "Compilation failed.").slice(0, 2000);
  }

  const fabrication = findFabrications(base.baseFacts, finalTex);

  const fullName = profile?.fullName?.trim() || "";
  const draft = {
    to: (opts.recipientEmail ?? "").trim(),
    subject: `Application for ${job.title}${fullName ? ` — ${fullName}` : ""}`,
    body: [
      `Dear ${job.company} Hiring Team,`,
      "",
      `I'm excited to apply for the ${job.title} role. Please find my résumé attached — I'd welcome the chance to discuss how my background fits your team.`,
      "",
      "Best regards,",
      fullName || "(your name)",
      profile?.email || "",
      profile?.phone || "",
    ]
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n")
      .trim(),
  };

  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      resumeId: resume.id,
      method: "email",
      status: "pending_review",
      draftEmail: JSON.stringify(draft),
      fabricationFlags: JSON.stringify(fabrication),
      changeLog: JSON.stringify(tailored.changes),
      notes: compileWarning ? `Compile failed:\n${compileWarning}` : null,
    },
  });

  logger.info("pipeline", "application ready for review", {
    applicationId: application.id,
    resumeId: resume.id,
    compiled: compile.ok,
  });
  return application.id;
}
