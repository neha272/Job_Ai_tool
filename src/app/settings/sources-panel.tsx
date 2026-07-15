"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { addSource, deleteSource, setSourceActive } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface SourceRow {
  id: string;
  boardType: string;
  companyToken: string;
  active: boolean;
}

const TOKEN_HINT: Record<string, string> = {
  greenhouse: "Greenhouse board token, e.g. the slug in boards.greenhouse.io/<token>",
  lever: "Lever site name, e.g. the slug in jobs.lever.co/<name>",
  ashby: "Ashby job-board name, e.g. the slug in jobs.ashbyhq.com/<name>",
};

export function SourcesPanel({ sources }: { sources: SourceRow[] }) {
  const [boardType, setBoardType] = useState("greenhouse");
  const [token, setToken] = useState("");
  const [pending, startTransition] = useTransition();

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addSource({ boardType, companyToken: token });
      if (res.ok) {
        toast.success(res.message);
        setToken("");
      } else {
        toast.error(res.message);
      }
    });
  }

  function onToggle(id: string, active: boolean) {
    startTransition(async () => {
      const res = await setSourceActive(id, active);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteSource(id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery sources</CardTitle>
        <CardDescription>
          Boards to pull postings from automatically (Phase 2). Only Greenhouse,
          Lever, and Ashby public APIs — never LinkedIn or Indeed scraping.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="boardType">Board</Label>
            <select
              id="boardType"
              value={boardType}
              onChange={(e) => setBoardType(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="ashby">Ashby</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="token">Company token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. stripe"
            />
          </div>
          <Button type="submit" disabled={pending}>
            Add source
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">{TOKEN_HINT[boardType]}</p>

        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No sources yet. Add a Greenhouse, Lever, or Ashby company token above
            to pull its openings during discovery.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.companyToken}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {s.boardType}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={s.active}
                      onCheckedChange={(v: boolean) => onToggle(s.id, v)}
                    />
                    {s.active ? "Active" : "Paused"}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${s.companyToken}`}
                    onClick={() => onDelete(s.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
