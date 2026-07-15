"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { tailorExistingJob } from "./actions";
import { Button } from "@/components/ui/button";

export function TailorButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Redirects to the review screen on success (no return value).
          const r = await tailorExistingJob(jobId);
          if (r && !r.ok) toast.error(r.message);
        })
      }
    >
      {pending ? "Tailoring…" : "Tailor & prepare"}
    </Button>
  );
}
