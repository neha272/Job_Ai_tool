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
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [location, setLocation] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAndTailor({
        company,
        title,
        recipientEmail,
        location,
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
        <CardTitle>Process a job</CardTitle>
        <CardDescription>
          Paste a job description (or a link). Claude tailors your base résumé,
          compiles it, and takes you to a review screen. This calls the model
          and compiles a PDF — it can take up to a minute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="title">Role title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Data Analyst"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recruiter@acme.com (can add later)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="(optional)"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="jobText">Job description</Label>
            <Textarea
              id="jobText"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste the full job description here…"
              className="min-h-48"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sourceUrl">…or a job URL</Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://… (fetched only if the box above is empty)"
            />
            <p className="text-xs text-muted-foreground">
              A LinkedIn/Indeed link is read as a single page and flagged so the
              automated submit path stays off — you&apos;ll finish those by hand.
            </p>
          </div>

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
