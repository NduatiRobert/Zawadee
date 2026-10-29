# HerdBook

Multi-tenant livestock farm management (SaaS). Track animals as individuals and
batches, feed, health, breeding, production, purchases, sales, payments,
expenses, staff and financial reports. Mobile-first for data entry in the shed.

> Working name **HerdBook**; repository folder `Zawadee-1`.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Supabase (Postgres, Auth,
Storage) · Tailwind CSS v4 · shadcn/ui · React Hook Form + Zod · TanStack Table ·
Recharts · Vitest + Testing Library · Playwright · pgTAP · pnpm.

See [`docs/PROMPT.md`](docs/PROMPT.md) for the full product spec,
[`docs/SCHEMA.md`](docs/SCHEMA.md) for the data model, and
[`docs/DECISIONS.md`](docs/DECISIONS.md) for decisions and assumptions.
[`CLAUDE.md`](CLAUDE.md) is the working guide (commands, conventions,
permission matrix).

## Requirements

- **Node ≥ 22.15** (`.nvmrc` pins `22` — use `nvm use`). Older Node silently
  breaks the test toolchain; see `docs/DECISIONS.md`.
- **pnpm** (`npm i -g pnpm`).
- **Docker** (for local Supabase).

## Getting started

```bash
pnpm install
cp .env.example .env.local      # then fill from `pnpm supabase start` output
pnpm supabase start             # local Postgres, Auth, Studio (needs Docker)
pnpm dev                        # http://localhost:3000
```

## Scripts

| Command                                                | Does                                          |
| ------------------------------------------------------ | --------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`               | Next.js dev / build / serve                   |
| `pnpm lint` / `pnpm typecheck`                         | ESLint / `tsc --noEmit`                       |
| `pnpm format` / `pnpm format:check`                    | Prettier write / check                        |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest                                        |
| `pnpm test:e2e`                                        | Playwright (needs the app + Supabase running) |
| `pnpm db:start` / `pnpm db:stop` / `pnpm db:reset`     | Local Supabase lifecycle                      |
| `pnpm db:test`                                         | pgTAP database tests                          |
| `pnpm gen:types`                                       | Regenerate `src/types/database.ts`            |

## Project status

Phase 0 (foundation) complete: tooling, tests, CI, local Supabase, env
validation. Auth and the app shell arrive in Phase 1. See the phase roadmap in
`CLAUDE.md`.
