import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every application, from found to offer. The status tracker lands in
          Phase 4.
        </p>
      </div>
      <EmptyState
        title="No applications yet"
        description="Add your base résumé and a discovery source in Settings, then process a job to start tracking it here."
        actionHref="/settings"
        actionLabel="Go to Settings"
      />
    </div>
  );
}
