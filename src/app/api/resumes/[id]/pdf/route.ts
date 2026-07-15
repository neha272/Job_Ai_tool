import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume?.pdfPath) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = await readFile(resume.pdfPath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="resume.pdf"',
        "cache-control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
