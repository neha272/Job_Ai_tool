import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusTracker } from "@/components/pipeline/status-tracker";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewClient } from "./review-client";
import { PortalPanel } from "./portal-panel";
import { TrackingCard } from "./tracking-card";
import type { Status } from "@/lib/status";

export const dynamic = "force-dynamic";

interface Change {
  section: string;
  what: string;
  why: string;
}
interface Fab {
  properNouns: string[];
  numbers: string[];
}
interface Draft {
  to: string;
  subject: string;
  body: string;
}

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: { job: true, resume: true },
  });
  if (!app) notFound();

  const draft = safeParse<Draft>(app.draftEmail, {
    to: "",
    subject: "",
    body: "",
  });
  const fab = safeParse<Fab>(app.fabricationFlags, {
    properNouns: [],
    numbers: [],
  });
  const changes = safeParse<Change[]>(app.changeLog, []);
  const compiled = !!app.resume.pdfPath;
  const status = app.status as Status;
  const flagged = fab.properNouns.length + fab.numbers.length;

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/jobs"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to jobs
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {app.job.title}{" "}
          <span className="text-muted-foreground">· {app.job.company}</span>
        </h1>
        <StatusTracker status={status} className="mt-3" />
        {app.job.sourceRestricted && (
          <p className="mt-2 text-xs text-warning-strong">
            Restricted source — prepare here, then open the posting and submit by
            hand.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: the rendered PDF (or the compile error) */}
        <section className="grid gap-2">
          <h2 className="font-display text-lg font-semibold">Tailored résumé</h2>
          {compiled ? (
            <iframe
              src={`/api/resumes/${app.resume.id}/pdf`}
              title="Tailored résumé PDF"
              className="h-[72vh] w-full rounded-lg border border-border bg-card"
            />
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                The tailored LaTeX didn&apos;t compile.
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {app.notes ?? "No log available."}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                Fix your base résumé&apos;s LaTeX in Settings and process the job
                again.
              </p>
            </div>
          )}
        </section>

        {/* Right: what changed, fabrication flags, and the approval gate */}
        <section className="grid gap-4">
          {flagged > 0 ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Possible fabrication ({flagged})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p className="text-muted-foreground">
                  These appear in the tailored résumé but not in your base — check
                  each one before sending.
                </p>
                {fab.properNouns.length > 0 && (
                  <p>
                    <span className="font-medium">Names/terms:</span>{" "}
                    <span className="text-destructive">
                      {fab.properNouns.join(", ")}
                    </span>
                  </p>
                )}
                {fab.numbers.length > 0 && (
                  <p>
                    <span className="font-medium">Numbers:</span>{" "}
                    <span className="text-destructive">
                      {fab.numbers.join(", ")}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-success/5 px-3 py-2 text-sm">
              <span className="size-2 rounded-full bg-success" aria-hidden />
              <span className="text-success">
                Fabrication check passed — nothing new versus your base résumé.
              </span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>What changed vs. your base</CardTitle>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No change summary was recorded.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {changes.map((c, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{c.section}</Badge>
                        <span className="font-medium">{c.what}</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{c.why}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <ReviewClient
            appId={app.id}
            initialDraft={draft}
            status={app.status}
            compiled={compiled}
          />

          <PortalPanel
            appId={app.id}
            hasApplyUrl={!!(app.job.applyUrl || app.job.url)}
            restricted={app.job.sourceRestricted}
            status={app.status}
          />

          <TrackingCard
            appId={app.id}
            status={app.status}
            notes={app.notes ?? ""}
            followUpDate={
              app.followUpAt
                ? new Date(app.followUpAt).toISOString().slice(0, 10)
                : ""
            }
          />
        </section>
      </div>
    </div>
  );
}
