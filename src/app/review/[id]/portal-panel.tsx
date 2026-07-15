"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  prepareInPortal,
  markApplied,
  closePortalBrowser,
} from "./portal-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PortalPanel({
  appId,
  hasApplyUrl,
  restricted,
  status,
}: {
  appId: string;
  hasApplyUrl: boolean;
  restricted: boolean;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    message: string;
    wall?: string;
    filled?: string[];
  } | null>(null);
  const router = useRouter();
  const applied = status === "applied";

  function onPrepare() {
    startTransition(async () => {
      const r = await prepareInPortal(appId);
      setResult({ message: r.message, wall: r.wall, filled: r.filled });
      if (r.ok) toast.success("Opened the browser window");
      else toast.error(r.message);
    });
  }
  function onApplied() {
    startTransition(async () => {
      const r = await markApplied(appId);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });
  }
  function onClose() {
    startTransition(async () => {
      await closePortalBrowser();
      toast.success("Closed the browser");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply on the portal</CardTitle>
        <CardDescription>
          Opens the apply page in a browser that remembers your logins, fills
          what it can, and attaches your résumé. You review and click Submit
          yourself — nothing is submitted automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!hasApplyUrl && (
          <p className="text-sm text-muted-foreground">
            This job has no apply link.
          </p>
        )}
        {restricted && (
          <p className="text-sm text-warning-strong">
            Restricted source (LinkedIn/Indeed): I&apos;ll open and fill it, but
            you open and submit it yourself — it&apos;s never automated.
          </p>
        )}
        {result && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p>{result.message}</p>
            {result.filled && result.filled.length > 0 && (
              <p className="mt-1 text-muted-foreground">
                Filled: {result.filled.join(", ")}
              </p>
            )}
            {result.wall && (
              <p className="mt-1 font-medium text-warning-strong">
                Your turn — {result.wall} detected in the browser window.
              </p>
            )}
          </div>
        )}
        {applied && (
          <p className="text-sm font-medium text-success">
            Marked as applied.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onPrepare} disabled={pending || !hasApplyUrl || applied}>
            {pending ? "Working…" : "Open & fill in browser"}
          </Button>
          <Button variant="outline" onClick={onApplied} disabled={pending || applied}>
            Mark as applied
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Close browser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
