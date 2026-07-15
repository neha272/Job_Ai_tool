import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "./filter-bar";
import { StatusSelect } from "./status-select";

export const dynamic = "force-dynamic";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "review", label: "Review", statuses: ["found", "tailoring", "pending_review"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "applied", label: "Applied", statuses: ["applied"] },
  { key: "interviewing", label: "Interviewing", statuses: ["interviewing"] },
  { key: "offer", label: "Offer", statuses: ["offer"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "withdrawn"] },
];

interface AppRow {
  id: string;
  status: string;
  method: string;
  followUpAt: Date | null;
  appliedAt: Date | null;
  job: { company: string; title: string; fitScore: number | null };
}

function ymd(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "—";
}
function isDue(d: Date | null): boolean {
  return !!d && new Date(d).getTime() <= Date.now();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const all = (await prisma.application.findMany({
    include: { job: { select: { company: true, title: true, fitScore: true } } },
    orderBy: { updatedAt: "desc" },
  })) as AppRow[];

  const companies = [...new Set(all.map((a) => a.job.company))].sort();
  const due = all.filter(
    (a) => isDue(a.followUpAt) && a.status !== "rejected" && a.status !== "withdrawn",
  );

  let apps = all;
  if (sp.status) apps = apps.filter((a) => a.status === sp.status);
  if (sp.method) apps = apps.filter((a) => a.method === sp.method);
  if (sp.company) apps = apps.filter((a) => a.job.company === sp.company);
  const view = sp.view === "table" ? "table" : "board";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every application, from found to offer.
        </p>
      </div>

      {all.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Process a job to start tracking it here — paste a link on the Jobs page, or run discovery."
          actionHref="/jobs"
          actionLabel="Process a job"
        />
      ) : (
        <>
          {due.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <span className="font-medium text-warning-strong">
                {due.length} follow-up{due.length > 1 ? "s" : ""} due:
              </span>{" "}
              {due.slice(0, 6).map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link href={`/review/${a.id}`} className="underline hover:text-foreground">
                    {a.job.company}
                  </Link>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {COLUMNS.map((c) => {
              const n = all.filter((a) => c.statuses.includes(a.status)).length;
              return (
                <Badge key={c.key} variant="secondary" className="tabular-nums">
                  {c.label}: {n}
                </Badge>
              );
            })}
          </div>

          <FilterBar companies={companies} />

          {view === "table" ? (
            <TableView apps={apps} />
          ) : (
            <Board apps={apps} />
          )}
        </>
      )}
    </div>
  );
}

function Board({ apps }: { apps: AppRow[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const items = apps.filter((a) => col.statuses.includes(a.status));
        return (
          <div key={col.key} className="w-64 shrink-0">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <ul className="grid gap-2">
              {items.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  —
                </li>
              ) : (
                items.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.job.company}
                        </p>
                      </div>
                      {typeof a.job.fitScore === "number" && (
                        <Badge variant="outline" className="shrink-0 tabular-nums">
                          {a.job.fitScore}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusSelect appId={a.id} status={a.status} />
                      <Link
                        href={`/review/${a.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                    {a.followUpAt && (
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isDue(a.followUpAt) ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        Follow-up {ymd(a.followUpAt)}
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ apps }: { apps: AppRow[] }) {
  if (apps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No applications match these filters.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Fit</th>
            <th className="px-3 py-2 font-medium">Applied</th>
            <th className="px-3 py-2 font-medium">Follow-up</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {apps.map((a) => (
            <tr key={a.id}>
              <td className="px-3 py-2">
                <div className="font-medium">{a.job.title}</div>
                <div className="text-xs text-muted-foreground">{a.job.company}</div>
              </td>
              <td className="px-3 py-2">
                <StatusSelect appId={a.id} status={a.status} />
              </td>
              <td className="px-3 py-2 tabular-nums">
                {typeof a.job.fitScore === "number" ? a.job.fitScore : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {ymd(a.appliedAt)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 tabular-nums",
                  isDue(a.followUpAt) ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {ymd(a.followUpAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/review/${a.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
