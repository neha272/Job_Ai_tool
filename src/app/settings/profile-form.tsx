"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProfile } from "./actions";
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

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  detailsJson: string;
}

export function ProfileForm({ profile }: { profile: ProfileData | null }) {
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? "");
  const [detailsJson, setDetailsJson] = useState(
    profile?.detailsJson && profile.detailsJson !== "{}"
      ? profile.detailsJson
      : "",
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProfile({
        fullName,
        email,
        phone,
        linkedinUrl,
        detailsJson,
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
        <form onSubmit={onSubmit} className="grid gap-4">
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
          <div className="grid gap-1.5">
            <Label htmlFor="detailsJson">Additional fields (JSON)</Label>
            <Textarea
              id="detailsJson"
              value={detailsJson}
              onChange={(e) => setDetailsJson(e.target.value)}
              placeholder={`{\n  "github": "https://github.com/janedoe",\n  "authorizedToWork": "Yes"\n}`}
              className="min-h-28 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Extra answers keyed by common form-field names, for portal
              autofill later. Optional.
            </p>
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
