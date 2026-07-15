"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveBaseResume } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResumeForm({
  initialTex,
  initialFacts,
}: {
  initialTex: string;
  initialFacts: { properNouns: number; numbers: number } | null;
}) {
  const [tex, setTex] = useState(initialTex);
  const [facts, setFacts] = useState(initialFacts);
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const res = await saveBaseResume({ texSource: tex });
      if (res.ok) {
        toast.success(res.message);
        if (res.facts) setFacts(res.facts);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base résumé (LaTeX)</CardTitle>
        <CardDescription>
          Paste the raw LaTeX source of your résumé — not a PDF. Every tailored
          version is derived from this and may only reword or reorder what&apos;s
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="tex">LaTeX source</Label>
          <Textarea
            id="tex"
            value={tex}
            onChange={(e) => setTex(e.target.value)}
            placeholder="\documentclass{article}%\n..."
            className="min-h-[360px] font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Fabrication baseline</p>
          <p className="mt-1 text-muted-foreground">
            {facts
              ? `Captured ${facts.properNouns} proper nouns and ${facts.numbers} numbers from this résumé. A tailored résumé is later checked against these — any employer, title, skill, or metric that isn't here is flagged in red before you approve it.`
              : "Once saved, the proper nouns and numbers in your résumé become the reference the fabrication check compares tailored versions against."}
          </p>
        </div>

        <div>
          <Button onClick={onSave} disabled={pending}>
            {pending ? "Saving…" : "Save base résumé"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
