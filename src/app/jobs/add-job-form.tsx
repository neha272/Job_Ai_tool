"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAndTailor } from "./actions";
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

export function AddJobForm() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [jobText, setJobText] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAndTailor({
        company,
        title,
        recipientEmail,
        sourceUrl,
        jobText,
      });
      // On success the action redirects to the review screen (no return value).
      if (res && !res.ok) toast.error(res.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process a job — just paste the link</CardTitle>
        <CardDescription>
          Paste a job link and the company, title, and description fill in
          automatically, then Claude tailors your résumé and takes you to a
          review screen. Takes up to a minute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sourceUrl">Job link</Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://jobs.ashbyhq.com/… · jobs.lever.co/… · job-boards.greenhouse.io/…"
            />
            <p className="text-xs text-muted-foreground">
              Works best with a direct Greenhouse, Lever, or Ashby job link.
              LinkedIn/Indeed pages often don&apos;t read cleanly — for those,
              paste the description under &ldquo;Enter details manually&rdquo;.
            </p>
          </div>

          <details className="rounded-lg border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Enter details manually (optional)
            </summary>
            <div className="mt-3 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="(auto-filled from the link)"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="title">Role title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="(auto-filled from the link)"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="recipientEmail">Recipient email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recruiter@company.com (for the email method; can add later)"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="jobText">Job description</Label>
                <Textarea
                  id="jobText"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the description here if the link doesn't read cleanly…"
                  className="min-h-40"
                />
              </div>
            </div>
          </details>

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Tailoring…" : "Tailor & prepare application"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
