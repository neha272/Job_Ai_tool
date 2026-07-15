import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddJobForm } from "./add-job-form";
import { STATUS_LABEL, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({
    orderBy: { discoveredAt: "desc" },
    include: {
      applications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Process a specific job now, or review ones you&apos;ve already tailored.
        </p>
      </div>

      <AddJobForm />

      <div>
        <h2 className="font-display text-lg font-semibold">Recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No jobs yet. Paste one above to tailor your résumé to it.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {jobs.map((job) => {
              const app = job.applications[0];
              return (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {job.title}{" "}
                      <span className="text-muted-foreground">· {job.company}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.location || "—"}
                      {job.sourceRestricted ? " · restricted source" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {app ? (
                      <>
                        <Badge variant="outline">
                          {STATUS_LABEL[app.status as Status] ?? app.status}
                        </Badge>
                        <Link
                          href={`/review/${app.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Review
                        </Link>
                      </>
                    ) : (
                      <Badge variant="secondary">Not processed</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
