import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchPostings } from "@/lib/sources/normalize";
import type { BoardType } from "@/lib/sources/types";
import { scoreFit } from "@/lib/anthropic/score";
import { logger } from "@/lib/logger";

// Cap Claude scoring calls per run so a large board doesn't fan out into
// hundreds of API calls; anything beyond the cap is stored unscored.
const SCORE_CAP = 25;

export interface DiscoveryResult {
  fetched: number;
  created: number;
  scored: number;
  scoreSkipped: number;
  errors: string[];
}

export async function runDiscovery(): Promise<DiscoveryResult> {
  const [sources, base] = await Promise.all([
    prisma.sourceConfig.findMany({ where: { active: true } }),
    prisma.resume.findFirst({ where: { isBase: true } }),
  ]);

  const result: DiscoveryResult = {
    fetched: 0,
    created: 0,
    scored: 0,
    scoreSkipped: 0,
    errors: [],
  };

  if (sources.length === 0) {
    result.errors.push("No active discovery sources — add one in Settings.");
    return result;
  }

  const canScore = !!base && !!process.env.ANTHROPIC_API_KEY;

  for (const s of sources) {
    let postings;
    try {
      postings = await fetchPostings(s.boardType as BoardType, s.companyToken);
    } catch (e) {
      result.errors.push(
        e instanceof Error ? e.message : `${s.boardType}/${s.companyToken} failed`,
      );
      continue;
    }
    result.fetched += postings.length;

    for (const p of postings) {
      // Dedupe on (source, url) — the stable identity of a posting.
      const existing = await prisma.jobPosting.findFirst({
        where: { source: p.source, url: p.url },
        select: { id: true },
      });
      if (existing) continue;

      let fitScore: number | null = null;
      if (canScore && base) {
        if (result.scored < SCORE_CAP) {
          try {
            const sc = await scoreFit(
              base.texSource,
              p.descriptionPlain || p.descriptionHtml,
            );
            fitScore = sc.fit;
            result.scored++;
          } catch (e) {
            logger.warn("discovery", "score failed", { err: String(e) });
          }
        } else {
          result.scoreSkipped++;
        }
      }

      await prisma.jobPosting.create({
        data: {
          source: p.source,
          sourceRestricted: false,
          company: p.company,
          title: p.title,
          location: p.location,
          url: p.url,
          applyUrl: p.applyUrl,
          descriptionRaw: p.descriptionPlain || p.descriptionHtml,
          fitScore,
        },
      });
      result.created++;
    }
  }

  logger.info("discovery", "done", { ...result, errors: result.errors.length });
  return result;
}
