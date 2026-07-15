import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function JobsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discovered and manually-added postings.
        </p>
      </div>
      <EmptyState
        title="No jobs yet"
        description="Discovery from Greenhouse and Lever arrives in Phase 2. Until then, the single-job manual flow (paste a description) comes in Phase 1."
        actionHref="/settings"
        actionLabel="Add a discovery source"
      />
    </div>
  );
}
