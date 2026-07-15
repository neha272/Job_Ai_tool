// Opt-in scheduled discovery. Enable by setting DISCOVERY_INTERVAL_CRON in .env
// (e.g. "*/30 * * * *"); unset or "off" disables it. Runs only on the Node
// runtime, guarded by a globalThis singleton so dev hot-reloads don't stack it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const expr = process.env.DISCOVERY_INTERVAL_CRON?.trim();
  if (!expr || expr.toLowerCase() === "off") return;

  const g = globalThis as unknown as { __discoveryCron?: unknown };
  if (g.__discoveryCron) return;

  const cron = (await import("node-cron")).default;
  if (!cron.validate(expr)) return;

  const { logger } = await import("@/lib/logger");
  g.__discoveryCron = cron.schedule(
    expr,
    async () => {
      try {
        const { runDiscovery } = await import("@/lib/discovery/run-discovery");
        const r = await runDiscovery();
        logger.info("cron", "scheduled discovery ran", {
          created: r.created,
          fetched: r.fetched,
          filteredOut: r.filteredOut,
        });
      } catch (e) {
        logger.error("cron", "scheduled discovery failed", { err: String(e) });
      }
    },
    { name: "discovery", noOverlap: true, timezone: process.env.TZ || undefined },
  );
  logger.info("cron", "scheduled discovery registered", { expr });
}
