"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { STATUSES, STATUS_LABEL } from "@/lib/status";

const selectCls =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FilterBar({ companies }: { companies: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const view = sp.get("view") || "board";

  function set(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectCls} value={sp.get("status") || ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select className={selectCls} value={sp.get("method") || ""} onChange={(e) => set("method", e.target.value)}>
        <option value="">All methods</option>
        <option value="email">Email</option>
        <option value="portal">Portal</option>
      </select>
      <select className={selectCls} value={sp.get("company") || ""} onChange={(e) => set("company", e.target.value)}>
        <option value="">All companies</option>
        {companies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => set("view", view === "table" ? "board" : "table")}
        className="ml-auto h-8 rounded-lg border border-border px-3 text-sm hover:bg-muted"
      >
        {view === "table" ? "Board view" : "Table view"}
      </button>
    </div>
  );
}
