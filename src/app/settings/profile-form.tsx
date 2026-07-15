"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  detailsJson: string;
}

// Common questions job applications ask. Stored (keyed) in Profile.detailsJson
// and auto-filled into portal forms. All optional free-text — put whatever you
// want submitted (e.g. "Prefer not to say", "Yes", "No").
const DETAIL_FIELDS = [
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "portfolio", label: "Portfolio / website", placeholder: "https://…" },
  { key: "country", label: "What country are you based in?", placeholder: "United States" },
  { key: "location", label: "Current location (city, state)", placeholder: "New York, NY" },
  { key: "workAuthorization", label: "Authorized to work in this location?", placeholder: "Yes" },
  { key: "sponsorship", label: "Will you require visa sponsorship?", placeholder: "No" },
  { key: "relocate", label: "Willing to relocate / work in-office as required?", placeholder: "Yes" },
  { key: "yearsExperience", label: "Years of experience", placeholder: "3" },
  { key: "pronouns", label: "Preferred gender pronouns", placeholder: "she/her" },
  { key: "heardAbout", label: "How did you hear about us?", placeholder: "Company website" },
  { key: "gender", label: "Gender", placeholder: "e.g. Female / Male / Prefer not to say" },
  { key: "hispanicLatino", label: "Are you Hispanic/Latino?", placeholder: "No / Yes / Prefer not to say" },
  { key: "race", label: "Race / ethnicity", placeholder: "e.g. Asian / Prefer not to say" },
  { key: "veteran", label: "Veteran status", placeholder: "I am not a protected veteran" },
  { key: "disability", label: "Disability status", placeholder: "No / Prefer not to say" },
] as const;

function parseDetails(json: string): Record<string, string> {
  try {
    const obj: unknown = JSON.parse(json || "{}");
    if (obj && typeof obj === "object") {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = v == null ? "" : String(v);
      }
      return out;
    }
  } catch {
    // fall through
  }
  return {};
}

export function ProfileForm({ profile }: { profile: ProfileData | null }) {
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? "");
  const [details, setDetails] = useState<Record<string, string>>(
    parseDetails(profile?.detailsJson ?? "{}"),
  );
  const [pending, startTransition] = useTransition();

  function setDetail(key: string, value: string) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProfile({
        fullName,
        email,
        phone,
        linkedinUrl,
        details,
      });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
        <CardDescription>
          Used to draft emails and auto-fill applications. Stays on this machine.
          Fill in the application questions below — the portal autofill uses these
          answers, so anything you leave blank may be left blank on the form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(optional)" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="(optional)" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">Application questions</p>
            <p className="text-xs text-muted-foreground">
              Common questions portals ask. Your answers are auto-filled into
              applications. All optional.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DETAIL_FIELDS.map((f) => (
              <div className="grid gap-1.5" key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  value={details[f.key] ?? ""}
                  onChange={(e) => setDetail(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
