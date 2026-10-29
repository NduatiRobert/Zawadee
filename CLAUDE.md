# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this at the start of every session, along with `docs/PROMPT.md` (the full build spec) and `docs/DECISIONS.md` (assumptions log).

## Project

**HerdBook** — a production-grade, multi-tenant livestock farm management web app (SaaS, one tenant per farm). Manages the full farm lifecycle: animals (as individuals and batches), housing, feed, health, breeding, production, purchases, sales, payments, expenses, staff and financial reports. Mobile-first: most data entry happens on a phone in a shed on a weak connection.

> Repository folder is `Zawadee-1`; the product working name is **HerdBook**.

## Tech stack

Pin latest stable versions in `package.json`. Package manager: **pnpm**.

- **Framework:** Next.js (App Router). Server Components by default; Client Components only for interactivity. Mutations via Server Actions. Route Handlers only for webhooks and CSV/PDF downloads.
- **Language:** TypeScript, `strict: true`, `noUncheckedIndexedAccess: true`. No `any` — use `unknown` and narrow.
- **Backend:** Supabase (Auth, Postgres, Storage) with `@supabase/ssr` for cookie-based sessions.
- **DB:** PostgreSQL. Schema via Supabase CLI SQL migrations. Business-critical writes in Postgres functions (RPC), one transaction each.
- **Styling:** Tailwind CSS. Design tokens in CSS variables; no inline hex colours in components.
- **Components:** shadcn/ui. Shared patterns wrapped in `components/shared` (DataTable, FormField, PageHeader, EmptyState, ConfirmDialog, MoneyInput).
- **Forms:** React Hook Form + Zod. One Zod schema per form in `features/<module>/schema.ts`, shared by client form and Server Action.
- **Tables:** TanStack Table — one generic `DataTable` with server-side pagination, sorting, filtering, column visibility, CSV export.
- **Charts:** Recharts, wrapped in shadcn chart components; every chart has an accessible table fallback.
- **Unit tests:** Vitest + Testing Library. **E2E:** Playwright against local Supabase with seed data.
- **Hosting:** Vercel (preview per PR, prod on `main`). **CI:** GitHub Actions.

## Commands

> **Node ≥ 22.15 required** (`.nvmrc` pins `22`; run `nvm use`). Older Node silently breaks the Vitest/rolldown toolchain — see `docs/DECISIONS.md`.

```bash
pnpm install              # install deps
pnpm dev                  # run Next.js dev server
pnpm build                # production build
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit
pnpm test                 # Vitest unit/component tests
pnpm test:watch           # Vitest watch mode
pnpm test:e2e             # Playwright E2E (needs local Supabase up)

supabase start            # start local Supabase (Docker)
supabase stop             # stop local Supabase
supabase db reset         # drop, re-apply migrations + seed.sql
supabase migration new <name>   # create a new migration (never edit an applied one)
supabase test db          # run pgTAP tests in supabase/tests
pnpm gen:types            # supabase gen types -> src/types/database.ts
```

**Before declaring any task done:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Fix failures; never disable tests to pass a phase.

## Folder conventions

Feature folders: everything for a module lives together.

```
src/
  app/
    (auth)/login, signup, reset-password, accept-invite
    (app)/[farmSlug]/dashboard, animals, sheds, batches, purchases, sales,
      products, feed, vaccines, medicine, health, breeding, production,
      expenses, payments, suppliers, clients, staff, reports, finance, settings
    api/                  # webhooks and exports only
  features/<module>/      # components/ actions.ts queries.ts schema.ts types.ts __tests__/
  components/ui/          # shadcn
  components/shared/      # DataTable, PageHeader, EmptyState, ConfirmDialog, MoneyInput
  lib/supabase/           # server.ts, client.ts, proxy.ts helpers
  lib/validations/  lib/utils/  lib/money.ts  lib/dates.ts  lib/permissions.ts
  proxy.ts                # session refresh, auth redirects, farm resolution
                          # (Next 16 renamed middleware.ts -> proxy.ts)
supabase/
  migrations/  seed.sql  tests/   # pgTAP for RLS
e2e/                      # Playwright
docs/                     # PROMPT.md, DECISIONS.md, SCHEMA.md
```

- Keep components small; no file over ~300 lines without a reason.
- Server Actions return a typed result: `{ ok: true, data } | { ok: false, error, fieldErrors? }`. Never throw raw errors to the client.

## Data & money rules

- All money: `numeric(14,2)`. All quantities: `numeric(14,3)` with explicit unit. **Never** use JS floats for money — do totals in SQL or a decimal library (`lib/money.ts`).
- All timestamps: `timestamptz` in UTC; display in the farm's timezone.
- **No hard deletes** — archive sets `deleted_at`; every change audited to `audit_log` via trigger.
- Ledgers (batch counts, inventory) are append-only; corrections are new adjustment rows with a reason.
- Atomic writes (purchase, sale, transfer, payment, feed distribution) = one Postgres RPC in one transaction. Validate in Zod first, then again in SQL.
- Stock never goes negative (row-locked checks in the transaction). Invoice numbers gapless per farm/doc type via a counter table with row locks.

## Multi-tenancy & permissions

Every business table carries `farm_id`. **RLS enabled on every table, no exceptions.** Browser talks only to Next.js; Next.js talks to Supabase with the user's session so RLS applies. Service-role key only in server-only modules guarded by `import "server-only"` — never in client code.

Permission matrix defined once in `lib/permissions.ts` (UI convenience) and mirrored in SQL policies (the real guard). Use `supabase.auth.getUser()` (not `getSession()`) on the server.

| Role       | Access                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| Owner      | Full access, billing, invites users, all finance                          |
| Manager    | Daily operations, purchases, sales, reports; no billing / user management |
| Vet        | Vaccines, medicine, treatments, health records; read-only elsewhere       |
| Worker     | Feed, production, mortality, treatments on assigned sheds; no finance     |
| Accountant | Payments, expenses, finance reports; read-only on operations              |

- Select = any farm member. Insert/update = roles per the matrix. **No delete policy** (soft delete only).
- Finance tables readable only by Owner, Manager, Accountant.
- Workers optionally scoped to assigned sheds via `shed_assignments`.
- pgTAP tests must prove a member of farm A can never read/write farm B's rows, and each role gets exactly its permissions.

## Defaults (editable in Settings)

Currency KES, timezone Africa/Nairobi, date format DD/MM/YYYY, metric units. Species: cattle (dairy/beef), goats, sheep, pigs, poultry (layers/broilers), rabbits.

## Working rules

- One phase per branch and pull request. Commit often, **Conventional Commits** (`feat(sales): add partial payments`).
- Write the migration and its pgTAP tests **before** the UI that depends on it.
- Regenerate `src/types/database.ts` after every migration; CI fails if types are stale.
- Do not add libraries outside the stack without recording why in `docs/DECISIONS.md`.
- When a requirement is ambiguous, pick the simplest option that fits the rules, log the assumption in `docs/DECISIONS.md`, and continue.
- **Ask first before:** changing the stack, deleting/rewriting an applied migration, changing the permission matrix, or anything touching production data.
- Never commit secrets — use `.env.local` and `.env.example`.
- End each phase stopping for review with: what was built, tests added + results, screenshots, known gaps, next phase plan.

## Definition of done (every feature)

- [ ] Migration, RLS policies and pgTAP tests written and passing
- [ ] Zod schema shared by form and Server Action
- [ ] Works on a 360px phone and on desktop, light and dark mode
- [ ] Loading, empty and error states present
- [ ] Role permissions enforced in the DB and reflected in the UI
- [ ] Unit tests and, for critical flows, a Playwright test
- [ ] Audit log entries recorded
- [ ] `CLAUDE.md` and docs updated; CI green; Vercel preview checked

## Phase roadmap

0. **Foundation** — scaffolding, tooling, CI, local Supabase, env validation, Vercel link, docs. _(done)_
1. **Auth & tenancy** — signup/login/reset, profiles, farms, members, invites, roles, farm switcher, RLS helpers/policies, app shell. _(current)_
2. Reference data, sheds, batches, animals, movements, mortality, shared DataTable/form.
3. Parties, purchases, inventory, invoice numbering, PDF invoice.
4. Feed, health (vaccines/treatments/withdrawal), production.
5. Sales, payments, expenses, statements, salaries.
6. Dashboard, reports, breeding, notifications, cron.
7. Polish — PWA/offline, data export, audit viewer, a11y, perf, Swahili-ready, M-Pesa design note.
