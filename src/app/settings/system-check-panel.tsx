"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CheckStatus = "ok" | "warn" | "error";
interface CheckItem {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
}
interface SystemCheckResult {
  checkedAt: string;
  items: CheckItem[];
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "ok") {
    return (
      <Badge className="border-transparent bg-success/10 text-success">
        Ready
      </Badge>
    );
  }
  if (status === "warn") {
    return (
      <Badge className="border-transparent bg-warning/10 text-warning-strong">
        Attention
      </Badge>
    );
  }
  return <Badge variant="destructive">Missing</Badge>;
}

export function SystemCheckPanel() {
  const [data, setData] = useState<SystemCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-check", { cache: "no-store" });
      setData((await res.json()) as SystemCheckResult);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>System check</CardTitle>
        <CardDescription>
          External tools and secrets this app depends on.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={loading}
          >
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
            {loading ? "Checking…" : "Re-run"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="py-4 text-sm text-muted-foreground">
            {loading ? "Running checks…" : "No results."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li
                key={item.key}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                  {item.hint ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.hint}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
