import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { StatusTracker } from "@/components/pipeline/status-tracker";
import { EmptyState } from "@/components/empty-state";
import type { Status } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const pending = await prisma.application.findMany({
    where: { status: { in: ["pending_review", "approved"] } },
    orderBy: { updatedAt: "desc" },
    include: { job: true },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Review queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tailored résumés waiting for your approval. Nothing is sent or
          submitted without an explicit approval.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Nothing pending review"
          description="When you tailor a résumé for a job, it appears here with the rendered PDF, what changed versus your base, and any fabrication flags — for you to approve, edit, or reject."
          actionHref="/jobs"
          actionLabel="Process a job"
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {pending.map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {app.job.title}{" "}
                  <span className="text-muted-foreground">
                    · {app.job.company}
                  </span>
                </p>
                <StatusTracker
                  status={app.status as Status}
                  className="mt-1.5"
                />
              </div>
              <Link
                href={`/review/${app.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
