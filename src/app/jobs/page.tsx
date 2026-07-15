import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddJobForm } from "./add-job-form";
import { DiscoverButton } from "./discover-button";
import { TailorButton } from "./tailor-button";
import { STATUS_LABEL, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({
    orderBy: [{ fitScore: "desc" }, { discoveredAt: "desc" }],
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
          Discover roles from your sources, or process a specific job now.
        </p>
      </div>

      <AddJobForm />

      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Jobs</h2>
            <p className="text-xs text-muted-foreground">
              Discovery pulls from your active Greenhouse/Lever/Ashby sources and
              scores fit with Claude. Highest fit first.
            </p>
          </div>
          <DiscoverButton />
        </div>

        {jobs.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No jobs yet. Add sources in Settings and Run discovery, or paste one
            above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {jobs.map((job) => {
              const app = job.applications[0];
              return (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {typeof job.fitScore === "number" && (
                        <Badge
                          variant="outline"
                          className="tabular-nums"
                          title="Fit score"
                        >
                          {job.fitScore}
                        </Badge>
                      )}
                      <p className="truncate text-sm font-medium">
                        {job.title}{" "}
                        <span className="text-muted-foreground">
                          · {job.company}
                        </span>
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="capitalize">{job.source}</span>
                      {job.location ? ` · ${job.location}` : ""}
                      {job.sourceRestricted ? " · restricted source" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        View posting ↗
                      </a>
                    )}
                    {app ? (
                      <>
                        <Badge variant="secondary">
                          {STATUS_LABEL[app.status as Status] ?? app.status}
                        </Badge>
                        <Link
                          href={`/review/${app.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                          )}
                        >
                          Review
                        </Link>
                      </>
                    ) : (
                      <TailorButton jobId={job.id} />
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
