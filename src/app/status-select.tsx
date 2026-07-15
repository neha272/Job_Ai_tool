"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setStatus } from "@/app/tracking-actions";
import { STATUSES, STATUS_LABEL } from "@/lib/status";

export function StatusSelect({
  appId,
  status,
}: {
  appId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <select
      aria-label="Status"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          const r = await setStatus(appId, value);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.message);
        });
      }}
      className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
