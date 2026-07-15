"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveDraft, sendApplication, rejectApplication } from "./review-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Draft {
  to: string;
  subject: string;
  body: string;
}

export function ReviewClient({
  appId,
  initialDraft,
  status,
  compiled,
}: {
  appId: string;
  initialDraft: Draft;
  status: string;
  compiled: boolean;
}) {
  const [to, setTo] = useState(initialDraft.to);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sent = status === "applied";
  const rejected = status === "rejected";
  const locked = sent || rejected;
  const draft = (): Draft => ({ to, subject, body });

  function onSave() {
    startTransition(async () => {
      const r = await saveDraft(appId, draft());
      r.ok ? toast.success(r.message) : toast.error(r.message);
    });
  }
  function onSend() {
    startTransition(async () => {
      const r = await sendApplication(appId, draft());
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else {
        toast.error(r.message);
      }
    });
  }
  function onReject() {
    startTransition(async () => {
      const r = await rejectApplication(appId);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else {
        toast.error(r.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application email</CardTitle>
        <CardDescription>
          Nothing sends until you click Send application.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recruiter@company.com"
            disabled={locked}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={locked}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-44 font-sans"
            disabled={locked}
          />
        </div>

        {sent && (
          <p className="text-sm font-medium text-success">
            Sent — status is now Applied.
          </p>
        )}
        {rejected && (
          <p className="text-sm font-medium text-destructive">
            Rejected — this application won&apos;t be sent.
          </p>
        )}
        {!compiled && !locked && (
          <p className="text-sm text-destructive">
            No compiled PDF yet — sending is disabled until the LaTeX compiles.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onSend} disabled={pending || locked || !compiled}>
            {sent ? "Sent" : "Send application"}
          </Button>
          <Button variant="outline" onClick={onSave} disabled={pending || locked}>
            Save draft
          </Button>
          <Button variant="ghost" onClick={onReject} disabled={pending || locked}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
