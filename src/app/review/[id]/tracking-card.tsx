"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setStatus, saveNotes, setFollowUp } from "@/app/tracking-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STATUSES, STATUS_LABEL } from "@/lib/status";

export function TrackingCard({
  appId,
  status,
  notes,
  followUpDate,
}: {
  appId: string;
  status: string;
  notes: string;
  followUpDate: string; // yyyy-mm-dd or ""
}) {
  const [notesValue, setNotesValue] = useState(notes);
  const [followUp, setFollowUpValue] = useState(followUpDate);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracking</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.value;
              run(() => setStatus(appId, v));
            }}
            className="h-8 w-fit rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="followUp">Follow-up date</Label>
          <div className="flex items-center gap-2">
            <Input
              id="followUp"
              type="date"
              value={followUp}
              onChange={(e) => setFollowUpValue(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setFollowUp(appId, followUp))}
            >
              Set
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            className="min-h-24"
            placeholder="Recruiter name, next step, anything to remember…"
          />
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => saveNotes(appId, notesValue))}
            >
              Save notes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
