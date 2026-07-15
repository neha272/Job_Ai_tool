import { NextResponse } from "next/server";
import { getSystemCheck } from "@/lib/system-check";

// Live probe (child_process, env, DB) — never cache, and it needs the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getSystemCheck();
  return NextResponse.json(result);
}
