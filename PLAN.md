# Job Copilot — Build Plan

A single-user, localhost-only web app that discovers job postings, tailors your LaTeX résumé to each one (reword/reorder only — never invent), prepares the application behind a human-approval review screen, and tracks every application from "found" through "offer/rejected."

> **Status: awaiting your approval.** No application code has been written. This document is the proposal. Reply **"approved"** (or with changes) and I'll start Phase 0. I stop after every phase for you to test before continuing.

---

## 0. Decisions I need from you before Phase 0

I've picked sensible defaults for each so you can just say "approved" — but flag any you want changed.

| # | Decision | My default (recommendation) | Alternative |
|---|----------|-----------------------------|-------------|
| D1 | **Guardrails file** — the spec asks for `.cursor/rules/guardrails.mdc`, but you're in **Claude Code**, which reads `CLAUDE.md`, not `.cursor/rules/`. | Write **both**: a root `CLAUDE.md` (binds in Claude Code, survives context compaction) **and** `.cursor/rules/guardrails.mdc` with `alwaysApply: true` (binds if you also open this in Cursor). They don't conflict. | Only one of the two. |
| D2 | **Framework versions** — the spec says "Next 14 / Prisma classic," but the current stable stack is Next **16** + Prisma **7** + Tailwind **v4**. Greenfield project, so no migration cost. | Pin to **current** (Next 16.2.x, React 19.2, Prisma 7.8.x, Tailwind 4.3.x, shadcn CLI 4.13.x). Working setup recipes are already researched. | Pin to the older Next 14 / Prisma 6 stack the spec assumed (simpler Prisma, but off the current docs). |
| D3 | **Discovery → tailor flow.** Tailoring costs an Opus call per job; scoring is cheap (Haiku). | Discovery **auto-scores** every new posting (cheap) and lists them by fit; **you click "Tailor & prepare"** on the ones you want (the expensive step is human-initiated). Nothing is tailored or sent automatically. | Auto-tailor everything above a fit threshold. |
| D4 | **Base résumé source.** I need your résumé as raw **LaTeX** (`.tex` source, not a PDF) to seed the base résumé in Phase 0. | You paste/drop the `.tex` into the Settings page after Phase 0 scaffolds. | Provide it now and I'll wire it in during Phase 0. |

Everything below assumes the recommended defaults.

---

## 1. Non-negotiable guardrails (built in from Phase 0, not bolted on)

These are copied verbatim into `CLAUDE.md` and `.cursor/rules/guardrails.mdc` in Phase 0 so they persist across every future session:

1. **Sources.** Automatic discovery only from **Greenhouse**, **Lever**, and **Ashby** public read APIs. **Never** build a scraper or automated login against LinkedIn or Indeed. A LinkedIn/Indeed URL pasted manually may be fetched as a single page (that's just reading), but such jobs get `sourceRestricted = true`, which **blocks the automated submit path** and forces a "open this page and click Submit yourself" hand-off.
2. **No fabrication.** The tailoring prompt may only reword, reorder, and re-emphasize content already in the base résumé. A post-generation check flags any proper noun or number in the tailored version absent from the base version and surfaces it **in red** on the review screen.
3. **Human approval by default.** Anything that leaves the machine (email send, form submit) requires an explicit click on the review screen. A per-source "auto-send after N minutes" toggle may exist but **defaults to off**.
4. **Stop at CAPTCHAs and logins.** Browser automation detects CAPTCHA/unfamiliar login walls, pauses, surfaces a "your turn" notice, and resumes on your confirmation. It never tries to solve or bypass one.
5. **Local-first and private.** Résumés, personal details, and credentials stay on the machine. SQLite + `.env`; **both `.env` and the SQLite DB are in `.gitignore` from the first commit.**

---

## 2. Tech stack (pinned to current, 2026)

| Concern | Choice | Version | Notes from research |
|---------|--------|---------|---------------------|
| Framework | Next.js App Router + TypeScript (strict) | **16.2.x** | React 19.2. Turbopack is the **default** bundler (no `--turbopack` flag). Dynamic APIs (`cookies()`, `headers()`, `params`, `searchParams`) are **async-only** — always `await`. `next lint` removed; use ESLint/Biome directly. |
| Styling | Tailwind CSS | **4.3.x** | CSS-first: no `tailwind.config.js`; use `@import "tailwindcss";` + `@theme` in `globals.css`. |
| Components | shadcn/ui | CLI **4.13.x** | CLI is named `shadcn` (not `shadcn-ui`). `npx shadcn@latest init` / `add`. Built for Tailwind v4 + React 19. |
| ORM / DB | Prisma + SQLite | **7.8.x** | Prisma 7 requires a **driver adapter** (`@prisma/adapter-better-sqlite3`); generator is `prisma-client` with a required `output` path; client imported from the generated path, **not** `@prisma/client`; `prisma.config.ts` + `import "dotenv/config"`. |
| Browser automation | Playwright | latest | `chromium.launchPersistentContext(userDataDir, {headless:false, channel:'chrome', acceptDownloads:true})` keeps ATS logins between runs. Returns a **BrowserContext** (no `newContext()`). |
| LaTeX → PDF | Tectonic (via `child_process`) | v2 CLI | `tectonic -X compile file.tex --outdir build --keep-logs`. Errors on **stderr**, non-zero exit (101) on failure. **Not currently installed — see §8.** |
| Email | Nodemailer | v7 | `createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass}})` with a Gmail **App Password**. Behind a `Mailer` interface so OAuth can swap in later. |
| Scheduling | node-cron | v4 | Registered from `instrumentation.ts` (`register()`, gated on `NEXT_RUNTIME==='nodejs'`) with a `globalThis` singleton guard so hot-reload doesn't stack duplicate schedulers; `noOverlap:true`. |
| LLM | `@anthropic-ai/sdk` | latest | **Tailoring** → `claude-opus-4-8` with `thinking:{type:'adaptive'}` (off by default — must set) + `output_config:{effort:'high'}`. **Fit-scoring** → `claude-haiku-4-5` with `output_config.format` (JSON-schema structured output), small `max_tokens`. **Do not** pass `temperature`/`top_p`/`budget_tokens` or use assistant prefill — they 400 on these models. |

---

## 3. Folder structure

```
job-copilot/
├── CLAUDE.md                       # guardrails (Claude Code; survives compaction)  [D1]
├── .cursor/rules/guardrails.mdc    # guardrails (Cursor; alwaysApply: true)          [D1]
├── .env                            # secrets — GITIGNORED
├── .env.example                    # documented template — COMMITTED
├── .gitignore                      # .env, dev.db*, generated/, .userdata/, build output
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── prisma.config.ts                # Prisma 7 config (imports dotenv/config)
├── generated/prisma/               # generated Prisma client — GITIGNORED
├── instrumentation.ts              # node-cron registration (Node runtime only)
├── src/
│   ├── app/
│   │   ├── layout.tsx  ·  globals.css   # Tailwind v4 @theme design tokens
│   │   ├── page.tsx                     # Tracker dashboard (table + kanban)
│   │   ├── jobs/page.tsx                # Discovered + manually-added postings
│   │   ├── review/[id]/page.tsx         # Review queue (the approval gate)
│   │   ├── settings/page.tsx            # Résumé, profile, sources, system check
│   │   └── api/
│   │       ├── discover/route.ts        # run discovery now
│   │       ├── tailor/route.ts          # tailoring pipeline
│   │       ├── score/route.ts           # fit scoring
│   │       ├── send/route.ts            # email send (post-approval)
│   │       ├── portal/route.ts          # Playwright submit (post-approval)
│   │       └── system-check/route.ts    # Tectonic + Playwright presence
│   ├── components/
│   │   ├── ui/                          # shadcn primitives
│   │   └── pipeline/                    # ← the signature stage tracker
│   ├── lib/
│   │   ├── prisma.ts                    # singleton client + better-sqlite3 adapter
│   │   ├── sources/{greenhouse,lever,ashby,normalize}.ts
│   │   ├── anthropic/{tailor,score,prompts}.ts
│   │   ├── fabrication.ts               # no-fabrication check (unit-tested)
│   │   ├── latex.ts                     # Tectonic wrapper + self-correct-once loop
│   │   ├── mailer.ts                    # Nodemailer behind a Mailer interface
│   │   ├── portal.ts                    # Playwright + detectWall() pause/resume
│   │   ├── scheduler.ts                 # node-cron singleton
│   │   └── logger.ts                    # structured logging for automation flows
│   └── types/
└── tests/
    ├── fabrication.test.ts              # the check that matters most
    └── sources.test.ts                  # Greenhouse/Lever/Ashby parsing
```

---

## 4. Data model

Keeping the spec's shape exactly (models `Resume`, `JobPosting`, `Application`, `Profile`, `SourceConfig` with all listed fields). The only adjustments are **Prisma 7 plumbing**, not schema shape:

- `generator client { provider = "prisma-client"; output = "../generated/prisma" }`
- `datasource db { provider = "sqlite"; url = env("DATABASE_URL") }` with `DATABASE_URL="file:./dev.db"`
- Client instantiated **with** the driver adapter and imported from the generated path:
  ```ts
  import { PrismaClient } from "@/generated/prisma";
  import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
  export const prisma = new PrismaClient({ adapter });   // adapter is mandatory in v7
  ```
- `Application.status` enum-as-string pipeline (drives the tracker): `found → tailoring → pending_review → approved → applied → interviewing → offer → rejected → withdrawn`.
- `Resume.baseFacts` = JSON extracted from the base résumé at upload (employers, titles, dates, skills, numbers) — the reference set for the fabrication check.
- `JobPosting.sourceRestricted` = `true` for manual LinkedIn/Indeed adds → blocks the automated submit path (guardrail #1).

---

## 5. Design plan — "cockpit," cool cobalt, one signature element

A private instrument panel: a cool paper-gray canvas, white panels, and **one** confident cobalt spent almost entirely on the status pipeline. Deliberately avoids the three named AI-default looks (no cream+serif+terracotta, no near-black+neon, no hairline broadsheet).

**Core palette (light mode primary):**

| Role | Hex | | Role | Hex |
|------|-----|-|------|-----|
| `--bg` page | `#F1F3F7` | | `--accent` cobalt | `#2B50E0` |
| `--surface` card | `#FFFFFF` | | `--success` | `#0E7A50` |
| `--text` | `#14171C` | | `--warning` (fills only) | `#B5730B` |
| `--muted` | `#566072` | | `--warning-strong` (text) | `#8A5606` |
| `--border` | `#DCE0E7` | | `--danger` | `#C8352C` |

**Signature element — the 8-stage horizontal pipeline.** The *only* saturated thing on screen; everything else stays neutral. Each stage rides a temperature arc (cool→automated, warm→live, resolve):

`found #64748B` · `tailoring #5457D6` · `pending_review #2B50E0` (= the accent: "your move") · `approved #1E88D6` · `applied #0E9BA6` · `interviewing #C7891F` · `offer #0E9E64` · `rejected/withdrawn #B15A50`.

Interaction model so it never reads as a rainbow: upcoming stages = hollow neutral outline; current stage = full-color filled pill **+ text label**; done stages = reduced-chroma dot + check. Color is always reinforced by position + label (covers color-vision deficiency).

**Type pairing:** Space Grotesk (display/wordmark, tabular numerals) · **Geist** (UI/body/tables) · **Geist Mono** (LaTeX source, diffs, logs). System fallback stacks included; self-hosted for offline.

**Quality floor (non-negotiable):** WCAG AA text contrast (verified: text 15:1, muted 6.3:1, cobalt 6.3:1); `prefers-reduced-motion` collapses transitions; always-visible `:focus-visible` cobalt ring (2px + 2px offset); pipeline is arrow-key navigable. Dark mode is secondary (cool graphite `#14171C`/`#1B1F27`, brighter cobalt `#4B6EF5` — never pure black + neon).

Copy is plain, active, and consistent action↔result ("Send application" → toast "Application sent"). Empty states say what to do next.

---

## 6. Key flows

1. **Discovery + scoring** (Phase 2): cron/manual pull from configured Greenhouse/Lever/Ashby boards → normalize into `{source,id,title,location,url,applyUrl,descriptionHtml,descriptionPlain}` → cheap Haiku fit-score → list sorted by fit. *Greenhouse `content` is HTML-entity-encoded → decode once with `he`; Lever `description` and Ashby `descriptionHtml` are already real HTML.* Scoring runs no more often than the discovery interval.
2. **Tailoring pipeline** (Phase 1): base `.tex` + JD → Opus with the explicit no-fabrication system prompt → revised `.tex` + a plain-language changelog → **fabrication check** vs `baseFacts` → Tectonic compile (on LaTeX error, feed the stderr back to Opus **once** to self-correct, then surface if still failing) → saved as a new `Resume` linked to the `Application`.
3. **Review queue** (Phase 1): one screen per `pending_review` application — rendered PDF, "what changed vs base," fabrication flags in **red**, the draft email or the fields to be auto-filled, and **Approve / Edit / Reject**. Nothing proceeds without Approve.
4. **Apply execution:** *Email* (Phase 1) — Nodemailer sends with PDF attached, only after Approve. *Portal* (Phase 3) — Playwright opens the apply URL in the persistent context, maps `Profile.detailsJson` by label/name heuristics, uploads the PDF, and **stops one step before final submit** unless auto-send is explicitly on. `detectWall(page)` inspects cross-origin `page.frames()` for reCAPTCHA/hCaptcha/Cloudflare + login forms, pauses, and resumes on your action.
5. **Tracker dashboard** (Phase 4): table + kanban grouped by `status`, filterable by company/status/method, inline notes, and a follow-up date that surfaces as a reminder banner when due.

---

## 7. Phased milestones (each ends with a verify step + a stop for your sign-off)

- **Phase 0 — Scaffold & Settings.** Next 16 + Prisma 7/SQLite + Tailwind v4 + shadcn; design tokens in `globals.css`; `CLAUDE.md` + `.cursor/rules/guardrails.mdc`; `.env.example`; `.gitignore` (with `.env`, `dev.db*`, `generated/`); Settings page (résumé upload → extract `baseFacts`, profile form, source list, **System check** panel). 
  *Verify:* `npm run dev` serves; profile persists to SQLite; System check correctly reports **Tectonic MISSING** with install instructions and Playwright status.
- **Phase 1 — Single-job manual vertical slice.** Paste a JD → tailor → fabrication check → Tectonic compile → review screen → send email. The smallest complete slice; made fully solid before anything else. 
  *Verify:* paste a real JD, PDF renders, a deliberately fabricated token shows a red flag, approve → test email arrives to yourself with the PDF attached.
- **Phase 2 — Greenhouse + Lever discovery + fit scoring** into the same review queue (Ashby best-effort, won't block the phase). 
  *Verify:* unit tests pass for the three parsers; discovery against a known public board token returns real jobs; fit scores render; jobs flow into the queue.
- **Phase 3 — Playwright portal automation + CAPTCHA/login pause.** **I'll ask you before starting this phase specifically** (per the spec — browser automation is worth double-checking together). 
  *Verify:* fills a real portal form in the persistent context, stops before submit; `detectWall` pauses on a challenge and resumes on confirmation.
- **Phase 4 — Tracker, scheduling, polish.** Table + kanban, node-cron discovery on an interval (singleton-guarded), follow-up reminder banners, empty states, keyboard/focus/reduced-motion pass. 
  *Verify:* kanban reflects status changes; cron fires on interval with no duplicate schedulers across hot-reloads; a due follow-up surfaces a banner.

**Test coverage** (light, where it matters): unit tests for `fabrication.ts` and the Greenhouse/Lever/Ashby parsers. UI is not heavily tested (single-user local tool).

---

## 8. Prerequisites — what you'll need before/during the build

| Item | Status on this machine | Action |
|------|------------------------|--------|
| Node.js ≥ 20.9 | ✅ v23.9.0 | — |
| npm / npx | ✅ 10.9.2 | — |
| git | ✅ 2.40.0 | — |
| **Tectonic** (LaTeX→PDF) | ❌ **MISSING** | `brew install tectonic` — needed for Phase 1. Phase 0's System check will keep reminding you until it's present. |
| Playwright Chrome | not installed | `npx playwright install chrome` — needed for Phase 3 only. |
| `ANTHROPIC_API_KEY` | you provide | into `.env` (needed Phase 1). |
| Gmail **App Password** + SMTP | you provide | 2-Step Verification must be on; into `.env` (needed Phase 1 email send). |
| Base résumé **`.tex`** | you provide | Settings page, after Phase 0 (decision D4). |

`.env.example` will document every variable: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `DISCOVERY_INTERVAL_CRON`, `TZ`.

---

**Ready when you are** — reply **"approved"** to start Phase 0, or tell me which of D1–D4 (or anything else) to change first.
