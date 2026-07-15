@AGENTS.md

# Job Copilot — project guardrails

Single-user, localhost-only job-search & application assistant. Stack: **Next.js 16** (App Router, TS strict) · **Prisma 7 + SQLite** · **Tailwind v4** · **shadcn/ui** · **Playwright** · **Tectonic** · **Nodemailer** · **node-cron** · **@anthropic-ai/sdk**. See `PLAN.md` for the full phased build plan.

## Non-negotiable guardrails (never override these)

1. **Sanctioned sources only.** Automatic discovery ONLY from Greenhouse, Lever, and Ashby public read APIs. NEVER build a scraper or automated login/submit against LinkedIn or Indeed. A manually pasted LinkedIn/Indeed URL may be fetched once as plain text (that's just reading a page), but such postings are marked `sourceRestricted = true`, which blocks the automated submit path — hand off to the user with an "open this page and click Submit yourself" action instead of a bot click.
2. **No fabrication in résumés.** Tailoring may only reword, reorder, and re-emphasize content already in the base résumé. NEVER add an employer, title, date, skill, or metric that isn't in the base. Every tailored résumé runs the fabrication check (`src/lib/fabrication.ts`) against `Resume.baseFacts`; anything new is flagged and shown in RED on the review screen.
3. **Human approval by default.** Nothing leaves the machine (email send, portal submit) without an explicit Approve click on the review screen. Any "auto-send after N minutes" toggle defaults to OFF.
4. **Stop at CAPTCHAs and logins.** Browser automation must detect CAPTCHA / unfamiliar login walls, pause, surface a "your turn" notice, and resume only on user confirmation. NEVER attempt to solve or bypass a challenge.
5. **Local-first & private.** Résumés, personal details, and credentials stay on this machine. SQLite + `.env`. The `.env` file and the SQLite database are gitignored — never commit secrets or the database.

## Conventions

- TypeScript strict mode. Next 16 dynamic APIs (`cookies()`, `headers()`, `params`, `searchParams`) are **async** — always `await` them.
- Prisma 7 requires a driver adapter; import the client from `@/generated/prisma`, **never** `@prisma/client`. Run all `prisma` CLI commands from the repo root so the SQLite path resolves consistently.
- Anthropic models: tailoring = `claude-opus-4-8` (set `thinking:{type:'adaptive'}` + `output_config.effort`); fit-scoring = `claude-haiku-4-5` (`output_config.format` JSON schema). Do NOT pass `temperature`/`top_p`/`budget_tokens` or use assistant prefill on these models. Don't score more often than the discovery interval.
- Structured logging around the automation flows (discovery, tailoring, send/submit) via `src/lib/logger.ts`.
- Build one phase at a time (`PLAN.md` §7) and stop for the user's confirmation after each.
