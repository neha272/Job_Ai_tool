"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCwIcon } from "lucide-react";
import { discoverNow } from "./actions";
import { Button } from "@/components/ui/button";

export function DiscoverButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await discoverNow();
          r.ok ? toast.success(r.message) : toast.error(r.message);
        })
      }
    >
      <RefreshCwIcon className={pending ? "animate-spin" : undefined} />
      {pending ? "Discovering…" : "Run discovery"}
    </Button>
  );
}
