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

// Common questions job portals ask. Stored (keyed) in Profile.detailsJson for
// autofill later; each is an optional free-text field.
const DETAIL_FIELDS = [
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "portfolio", label: "Portfolio / website", placeholder: "https://…" },
  {
    key: "workAuthorization",
    label: "Authorized to work in the US?",
    placeholder: "Yes / No",
  },
  {
    key: "sponsorship",
    label: "Requires visa sponsorship?",
    placeholder: "Yes / No",
  },
  { key: "location", label: "Current location", placeholder: "City, State" },
  {
    key: "yearsExperience",
    label: "Years of experience",
    placeholder: "e.g. 3",
  },
  {
    key: "heardAbout",
    label: "How did you hear about us?",
    placeholder: "(optional)",
  },
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
          Used to draft application emails and to auto-fill portal forms. Stays
          on this machine.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(optional)"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="(optional)"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium">Application fields</p>
            <p className="text-xs text-muted-foreground">
              Common questions portals ask — used to auto-fill applications
              later. All optional.
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
