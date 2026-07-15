import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires a driver adapter. The better-sqlite3 adapter strips the
// `file:` prefix and opens the DB relative to process.cwd() (the repo root when
// Next runs), which is where `prisma migrate` creates dev.db — so both agree.
//
// Next.js loads `.env` automatically, so DATABASE_URL is available at runtime.
// A globalThis singleton avoids exhausting connections across dev hot-reloads.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (it defaults to file:./dev.db).",
    );
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
