import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Review queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tailored résumés waiting for your approval. Nothing is sent or
          submitted without an explicit approval here.
        </p>
      </div>
      <EmptyState
        title="Nothing pending review"
        description="When you tailor a résumé for a job, it appears here with the rendered PDF, what changed versus your base, and any fabrication flags — for you to approve, edit, or reject."
      />
    </div>
  );
}
