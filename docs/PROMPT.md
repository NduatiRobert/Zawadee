# HerdBook: Livestock Farm Management System, Build Prompt

## Role and objective

You are a senior full-stack engineer and product-minded architect. Build **HerdBook** (working name), a production-grade, multi-tenant livestock farm management web app. It must manage the full farm lifecycle: buying animals, housing them in sheds and batches, tracking individual animals, feed, vaccines, medicine, production (milk, eggs, wool), sales, expenses, payments, staff and financial reports.

Work in small, reviewable phases. After each phase: run lint, type-check, unit and end-to-end tests, update `CLAUDE.md`, commit with Conventional Commits, and stop with a short summary of what was built, what was tested, and any open questions. Never skip tests to make a phase pass. When a requirement is ambiguous, pick the simplest option that fits these rules, write the assumption in `docs/DECISIONS.md`, and continue.

## Product overview

HerdBook serves small and mid-size farms, from a 500-bird poultry unit to a multi-shed dairy or beef operation, and is sold as a SaaS where each farm is a separate tenant.

**Users and roles**

| Role       | What they do                                                                     |
| ---------- | -------------------------------------------------------------------------------- |
| Owner      | Full access, billing, invites users, sees all finance                            |
| Manager    | Runs daily operations, purchases, sales, reports; no billing or user management  |
| Vet        | Vaccines, medicine, treatments, health records; read-only elsewhere              |
| Worker     | Records feed, production, mortality and treatments on assigned sheds; no finance |
| Accountant | Payments, expenses, finance reports; read-only on operations                     |

**Defaults to assume (editable in Settings)**

- Currency KES, timezone Africa/Nairobi, date format DD/MM/YYYY, metric units.
- Species: cattle (dairy and beef), goats, sheep, pigs, poultry (layers, broilers), rabbits. Admins can add more.
- Mobile-first: most data entry happens on a phone in a shed, often on weak connections.

**Goals**

- Track animals both as **batches** (poultry, broilers) and as **individuals** with tag numbers (cattle, goats, pigs).
- Give owners a true profit-and-loss per farm, per shed and per batch.
- Make daily recording take under 30 seconds per entry on a phone.
- No data is ever hard-deleted; every change is auditable.

**Non-goals for v1**

- Native mobile apps (build a responsive PWA instead).
- IoT sensor integration, GPS collars, marketplace features.
- Full double-entry accounting; export to accounting tools instead.
- Payment gateway integration (design for M-Pesa later; see Phase 7).

## Tech stack and conventions

Use the latest stable versions at the time of setup and pin them in `package.json`. Use pnpm.

| Layer          | Choice                   | How to use it                                                                                                                                                             |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js (App Router)     | Server Components by default; Client Components only for interactivity. Mutations via Server Actions. Route Handlers only for webhooks and CSV/PDF downloads.             |
| Language       | TypeScript               | `strict: true`, `noUncheckedIndexedAccess: true`. No `any`; use `unknown` and narrow.                                                                                     |
| Backend        | Supabase                 | Auth, Postgres, Storage (animal photos, receipts), `@supabase/ssr` for cookie-based sessions.                                                                             |
| Database       | PostgreSQL               | Schema in SQL migrations via Supabase CLI. Generate types with `supabase gen types`. Business-critical writes in Postgres functions (RPC) so they run in one transaction. |
| Styling        | Tailwind CSS             | Design tokens in CSS variables; no inline hex colours in components.                                                                                                      |
| Components     | shadcn/ui                | Install components as needed; wrap repeated patterns (DataTable, FormField, PageHeader, EmptyState) in `components/shared`.                                               |
| Forms          | React Hook Form + Zod    | One Zod schema per form in `lib/validations`, shared by client form and Server Action.                                                                                    |
| Tables         | TanStack Table           | One generic `DataTable` with server-side pagination, sorting, filtering, column visibility and CSV export.                                                                |
| Charts         | Recharts                 | Wrapped in shadcn chart components; every chart has an accessible table fallback.                                                                                         |
| Unit tests     | Vitest + Testing Library | Schemas, utils, calculations, components.                                                                                                                                 |
| E2E tests      | Playwright               | Critical flows against a local Supabase instance with seed data.                                                                                                          |
| Hosting        | Vercel                   | Preview deployment per pull request, production on `main`.                                                                                                                |
| Source control | GitHub + GitHub Actions  | CI on every PR; branch protection on `main`.                                                                                                                              |

**Code conventions**

- Feature folders: everything for a module lives together (components, actions, queries, schemas, tests).
- Server Actions return a typed result: `{ ok: true, data } | { ok: false, error, fieldErrors? }`. Never throw raw errors to the client.
- All money stored as `numeric(14,2)`; all quantities as `numeric(14,3)` with an explicit unit. Never use JavaScript floats for money arithmetic; do totals in SQL or with a decimal library.
- All timestamps `timestamptz` in UTC; display in the farm's timezone.
- ESLint + Prettier, Husky + lint-staged pre-commit, Conventional Commits.

## Architecture and folder structure

The browser talks only to Next.js; Next.js talks to Supabase with the logged-in user's session, so Row Level Security is enforced on every query. The service-role key is used only in server-only code for admin jobs and is never imported into client code. Business-critical writes go from a Server Action to one Postgres function, so each runs in a single transaction under RLS.

```
src/
  app/
    (auth)/login, signup, reset-password, accept-invite
    (app)/[farmSlug]/
      dashboard/
      animals/  sheds/  batches/
      purchases/  sales/  products/
      feed/  vaccines/  medicine/  health/
      breeding/  production/
      expenses/  payments/
      suppliers/  clients/  staff/
      reports/  finance/
      settings/
    api/ (webhooks, exports only)
  features/<module>/
    components/  actions.ts  queries.ts  schema.ts  types.ts  __tests__/
  components/ui/        (shadcn)
  components/shared/    (DataTable, PageHeader, EmptyState, ConfirmDialog, MoneyInput)
  lib/supabase/         (server.ts, client.ts, middleware.ts)
  lib/validations/  lib/utils/  lib/money.ts  lib/dates.ts
  middleware.ts         (session refresh, auth redirects, farm resolution)
supabase/
  migrations/  seed.sql  tests/ (pgTAP for RLS)
e2e/                    (Playwright)
docs/                   (PROMPT.md, DECISIONS.md, SCHEMA.md)
CLAUDE.md
```

## Multi-tenancy, auth, roles and RLS

Every business table carries `farm_id`, and Row Level Security allows access only to members of that farm with the right role. A user can belong to several farms and switch between them.

- **Auth:** Supabase Auth with email + password and magic link; email verification on. Password reset flow. Optional phone OTP later.
- **Onboarding:** after signup, create a farm (name, location, currency, timezone, species kept); the creator becomes Owner. Owners invite others by email with a role; invites expire after 7 days.
- **Tables:** `farms`, `profiles` (one per auth user), `farm_members (farm_id, user_id, role, status)`, `invitations`.
- **Helper functions** (`security definer`, `stable`, fixed `search_path`): `is_farm_member(farm_id)`, `has_farm_role(farm_id, roles[])`.
- **Policies:** enable RLS on every table, no exceptions. Select = any member; insert/update = roles allowed by the permission matrix; no delete policy (soft delete only). Finance tables readable only by Owner, Manager, Accountant.
- **Permission matrix:** define it once in `lib/permissions.ts` (UI: hide or disable actions) and mirror it in SQL policies (enforcement). The UI check is convenience; the database is the guard.
- **Worker scoping:** workers can optionally be limited to assigned sheds via `shed_assignments`.
- **Tests:** pgTAP tests in `supabase/tests` prove that a member of farm A can never read or write farm B's rows, and each role gets exactly its permissions.

## Data model

All tables below also have `id uuid pk`, `farm_id`, `created_at`, `created_by`, `updated_at`, `updated_by` and `deleted_at`, unless noted. Write the full schema in migrations and document it in `docs/SCHEMA.md` with an ER diagram (Mermaid).

| Area         | Tables                                                                                                 | Key columns and notes                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy      | `farms`, `profiles`, `farm_members`, `invitations`, `farm_settings`                                    | settings: currency, timezone, date format, low-stock thresholds, overdue-payment days, invoice prefix, logo                                                                                                                   |
| Reference    | `species`, `breeds`, `units`, `expense_categories`, `product_types`, `feed_types`                      | farm-editable lists, seeded with sensible defaults                                                                                                                                                                            |
| Housing      | `sheds`, `batches`, `shed_assignments`                                                                 | shed: name, capacity, type; batch: code (auto, with prefix), species, start date, status active/closed                                                                                                                        |
| Animals      | `animals`, `animal_movements`, `animal_events`                                                         | animal: tag no. (unique per farm), name, species, breed, sex, birth date, dam/sire ids, source (born/purchased), status (active, sold, dead, culled), current batch/shed, photo; movements: from/to shed or batch with reason |
| Batch counts | `batch_stock_ledger`                                                                                   | append-only: date, batch, change (+/−), reason (purchase, birth, transfer, sale, death, cull); current count = sum                                                                                                            |
| Mortality    | `mortality_records`                                                                                    | batch or animal, date, count, cause, notes                                                                                                                                                                                    |
| Health       | `vaccines`, `vaccination_schedules`, `vaccination_records`, `medicines`, `treatments`, `health_events` | schedules: species, dose no., age or interval days, route (oral, injection, spray, drinking water); records: batch or animal, date given, given by, withdrawal end date                                                       |
| Breeding     | `breeding_events`, `pregnancies`, `births`                                                             | heat, service (AI or bull), pregnancy check, expected and actual birth date, offspring links                                                                                                                                  |
| Production   | `production_records`                                                                                   | date, product type (milk, eggs, wool, manure), quantity + unit, batch or animal, session (AM/PM for milk)                                                                                                                     |
| Inventory    | `inventory_items`, `inventory_movements`                                                               | one ledger for feed, vaccines, medicine and farm products; movement types: purchase, use, distribution, sale, waste, adjustment; stock = sum of movements                                                                     |
| Feed         | `feed_distributions`                                                                                   | date, shed/batch, feed item, quantity, links to an inventory movement                                                                                                                                                         |
| Parties      | `suppliers`, `clients`, `staff`                                                                        | contact details, type, photo, opening balance; staff: role, salary, start date                                                                                                                                                |
| Purchasing   | `purchases`, `purchase_items`                                                                          | invoice no., supplier, date, item type (animal, feed, vaccine, medicine, other), qty, unit price, line discount, order discount, totals, status                                                                               |
| Sales        | `sales`, `sale_items`                                                                                  | invoice no., client, date, item type (animal, batch count, product), qty, unit price, discounts, totals, status                                                                                                               |
| Money        | `payments`, `expenses`, `salary_payments`                                                              | payment: direction (in/out), party, linked invoice, amount, method (cash, M-Pesa, bank, cheque), reference no., date                                                                                                          |
| System       | `audit_log`, `attachments`, `notifications`, `invoice_counters`                                        | audit: table, row id, action, before/after JSON, user, time                                                                                                                                                                   |

**Database rules**

- Foreign keys everywhere, with `on delete restrict`. Indexes on every foreign key and on `(farm_id, date)` columns used in reports.
- Unique constraints scoped to the farm, e.g. `unique (farm_id, tag_number) where deleted_at is null`.
- Check constraints: quantities > 0, prices ≥ 0, discount ≤ subtotal.
- Postgres enums or lookup tables for statuses; prefer lookup tables for anything a farm may customise.
- Views for reporting (`v_batch_current_stock`, `v_inventory_on_hand`, `v_invoice_balances`, `v_batch_pnl`).

## Modules and features

Each module gets a list page (DataTable with search, filters, date range, CSV export), a detail page, and create/edit forms in a Sheet or dedicated page. Archive replaces delete everywhere.

1. **Dashboard:** KPI cards (animals on hand by species, mortality rate 30 days, milk/eggs today vs 7-day average, receivables, payables, cash in/out this month, profit this month), alerts (vaccines due in 7 days, low stock, overdue invoices, expected births), recent activity feed, quick-add buttons for daily entries.
2. **Sheds and batches:** CRUD sheds with capacity; open/close batches; assign animals; transfer between sheds with history; occupancy vs capacity warning; batch detail page with stock ledger, feed, health, production and P&L tabs.
3. **Animals:** individual register with tag, photo, lineage (dam/sire), status and full timeline of events (movements, weights, treatments, breeding, production); bulk import from CSV; printable animal card.
4. **Weights and growth:** weight records per animal or batch sample; average daily gain chart.
5. **Mortality and culling:** record deaths with cause; updates batch ledger or animal status; mortality report by cause, shed and period.
6. **Purchases:** multi-line purchase invoices for animals, feed, vaccines, medicine and other items; line and order discounts; receiving animals creates animal records or batch stock entries; receiving supplies creates inventory movements.
7. **Sales:** multi-line sale invoices for individual animals, batch counts (e.g. 200 broilers) and farm products; real-time stock validation; withdrawal-period check blocks selling animals or milk/eggs still under a drug withdrawal period.
8. **Production:** fast daily entry for milk (per cow, AM/PM, or bulk), eggs (per batch, with broken count) and other products; adds to product inventory.
9. **Feed:** feed stock, distribution to sheds/batches, waste recording, feed cost per batch and feed conversion ratio for broilers.
10. **Vaccines:** vaccination programs per species (dose number, age or interval, route); auto-generated due list per batch/animal; record administration; overdue flags.
11. **Medicine and treatments:** diagnosis, drug, dose, route, duration, vet, cost, withdrawal end date; next-dose reminders.
12. **Breeding (cattle, goats, pigs, sheep, rabbits):** heat, service, pregnancy check, expected due date by species gestation length, births linked to new animal records.
13. **Inventory:** single view of on-hand stock for feed, vaccines, medicine and products, with movements history and manual adjustments (reason required).
14. **Expenses:** categorised expenses with payment method, reference and receipt upload; optionally allocated to a shed or batch.
15. **Payments:** one hub for supplier payments, client receipts and staff salaries; partial payments; balance per invoice and per party; payment receipts as PDF.
16. **Suppliers and clients:** profiles, statement of account (invoices, payments, running balance), outstanding balance, history.
17. **Staff:** profiles, role, salary, salary payment history, optional link to an app user account.
18. **Reports and finance:** see Dashboard and reports section.
19. **Settings:** farm profile and branding, currency/timezone/date format, units, categories, species and breeds, vaccination programs, invoice numbering, thresholds, members and invites, data export (full CSV/JSON backup of the farm).
20. **Auth and profile:** login, signup, reset password, accept invite, profile and password change, farm switcher.

**Documents:** purchase invoice, sale invoice, payment receipt, client/supplier statement and animal card as PDFs with farm logo. Generate server-side in a Route Handler (for example with `@react-pdf/renderer`) and store a copy in Supabase Storage.

## Business rules and data integrity

These rules are enforced in the database (constraints, triggers or RPC functions), and also checked in Zod for friendly errors.

- **Atomic writes:** creating a purchase, sale, transfer, payment or feed distribution is one Postgres function call (`create_sale(payload jsonb)` etc.) that writes all rows in one transaction and returns the new id. Validate the payload in Zod first, then again in SQL.
- **Stock never goes negative:** sales, distributions and uses check on-hand stock inside the transaction with row locks (`select … for update`). Return a clear error naming the item and the available quantity.
- **Ledgers are append-only:** batch counts and inventory are computed from ledger rows. Corrections are new adjustment rows with a reason, never edits.
- **Payments:** amount > 0; total payments on an invoice can never exceed its total (overpayment guard); a payment can be split across invoices of the same party. Invoice status (unpaid, partial, paid) is derived, not typed.
- **Discounts:** blank discount = 0; discount can never exceed the line or order subtotal.
- **Invoice numbers:** per farm, per document type, gapless, using a counter table with row locks (e.g. `SAL-2026-00042`).
- **Animal status:** a sold, dead or culled animal cannot be moved, treated or sold again. Selling or recording death closes it with a date.
- **Withdrawal periods:** if an animal or batch has an active withdrawal end date, block its sale and flag its production records as not for sale, unless an Owner overrides with a reason (logged).
- **Soft delete:** archiving sets `deleted_at`. Archived records are hidden by default, restorable by Owner/Manager, and cannot be archived if they would break totals (e.g. a paid invoice); void with a reversing entry instead.
- **Audit:** a generic trigger writes before/after JSON to `audit_log` for every insert, update and archive on business tables.
- **Edits to posted documents:** invoices with payments are locked; changes require voiding and re-issuing.
- **Dates:** no future dates for events that already happened (births, deaths, sales); schedules can be in the future.

## Dashboard and reports

Every report has a date-range picker (presets: today, this week, this month, last month, this year, custom), filters relevant to it, a Recharts chart, a TanStack table underneath, and CSV and PDF export. Heavy aggregations run in SQL views or RPC functions, never by loading all rows into the browser.

| Report                   | Shows                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Profit and loss          | Revenue (animal sales, product sales) minus costs (purchases, feed, vaccines, medicine, expenses, salaries) by month; filter by shed or batch |
| Batch performance        | Per batch: opening/closing count, mortality %, feed used, FCR (broilers), cost per head, revenue, profit                                      |
| Production               | Milk per day, per cow and per lactation; eggs per day and laying % per batch; trends vs previous period                                       |
| Herd / flock             | Animals on hand by species, breed, sex, age group, status; movements in and out                                                               |
| Mortality                | Deaths by cause, shed, batch and month; mortality rate                                                                                        |
| Health                   | Vaccinations given vs due, overdue list, treatments and cost, animals under withdrawal                                                        |
| Breeding                 | Services, conception rate, expected births calendar, calving interval                                                                         |
| Feed                     | Consumption by shed/batch, cost, waste                                                                                                        |
| Purchases and sales      | By supplier/client, item type and period                                                                                                      |
| Receivables and payables | Ageing buckets (0–30, 31–60, 61–90, 90+ days) per client and supplier                                                                         |
| Expenses                 | By category, shed and month                                                                                                                   |
| Inventory                | On hand, value, low-stock items, movement history                                                                                             |

## UI/UX guidelines

Design for a farm manager standing in a shed with a mid-range Android phone, then scale up to a desktop for the owner and accountant.

- **Layout:** collapsible sidebar on desktop, bottom navigation with 4–5 key items plus a large "+ Record" button on mobile. Farm switcher and user menu in the header.
- **Fast entry:** daily forms (production, feed, mortality, treatment) fit on one phone screen, remember the last shed/batch used, default date to today, and support "save and add another".
- **Feedback:** optimistic updates where safe, toasts for success and errors, inline field errors from Zod, confirm dialogs for archive and void.
- **States:** every list has loading skeletons, an empty state with a clear first action, and an error state with retry.
- **Tables:** sticky header, responsive cards on small screens, column visibility saved per user, numbers right-aligned with currency formatting.
- **Accessibility:** WCAG 2.1 AA, full keyboard use, visible focus, labels on all inputs, charts with table fallback.
- **Theme:** light and dark mode; an earthy, calm palette; clear status colours (healthy, due, overdue, critical).
- **PWA:** installable, app icon, offline-friendly shell. Phase 7 adds an offline queue for daily records.
- **Language:** plain English labels; structure strings so Swahili can be added later with `next-intl`.

## Security

- RLS on every table; pgTAP tests prove tenant isolation.
- Never expose the Supabase service-role key to the client; keep it in server-only modules guarded by `import "server-only"`.
- Validate every Server Action input with Zod and check the user's role for the farm before calling the database.
- Use `supabase.auth.getUser()` (not `getSession()`) on the server to trust the user.
- Storage buckets are private; access via signed URLs scoped by farm path (`farm_id/...`) with storage policies.
- Rate-limit auth and invite endpoints; generic error messages for login failures.
- Security headers via `next.config` (CSP, HSTS, X-Frame-Options, Referrer-Policy).
- Environment variables validated at startup with a Zod env schema; secrets only in Vercel and GitHub encrypted settings.
- Dependabot and `pnpm audit` in CI.
- Data export and account deletion requests supported for Kenya's Data Protection Act.

## Testing strategy

Tests are part of every phase, not a final phase. A phase is not done until CI is green.

| Level      | Tool                         | What to cover                                                                                                    | Target                                     |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Unit       | Vitest                       | Zod schemas, money and date utils, invoice totals, FCR and mortality calculations, permission helpers            | ≥ 90% on `lib/` and `features/*/schema.ts` |
| Component  | Vitest + Testing Library     | Forms (validation messages, submit states), DataTable (sort, filter, paginate), empty/error states               | key shared components                      |
| Database   | pgTAP via `supabase test db` | RLS isolation between farms, role permissions, stock and overpayment guards, invoice numbering under concurrency | every policy and RPC                       |
| End-to-end | Playwright                   | Critical journeys on desktop and a mobile viewport (Pixel 7)                                                     | all journeys below                         |

**Critical Playwright journeys**

1. Sign up, create a farm, invite a Manager who accepts the invite.
2. Create a shed and batch, purchase 500 day-old chicks, record feed and mortality for 3 days, check batch count and cost.
3. Register a dairy cow, record milk AM/PM, treat with a drug that has a withdrawal period, confirm the milk sale is blocked until the end date.
4. Create a sale that exceeds stock and see the error; create a valid sale, pay partially, then fully; check invoice status and client balance.
5. Worker role cannot see finance pages or edit purchases.
6. P&L report totals match the seeded data exactly.

Use a deterministic seed (`supabase/seed.sql`) with two farms so isolation is tested. Run E2E against a local Supabase started in CI.

## DevOps: GitHub, CI, Supabase, Vercel

- **Environments:** local (Supabase CLI + Docker), preview (Vercel preview + a Supabase staging project or branch), production (Vercel production + Supabase production project).
- **Branching:** `main` is protected; work in feature branches; every change through a pull request with a description and screenshots for UI changes.
- **CI (GitHub Actions) on every PR:** install, lint, type-check, Vitest with coverage, start local Supabase, apply migrations, run pgTAP, build, Playwright (upload report and traces on failure).
- **Migrations:** only via `supabase migration new`; never edit an applied migration. On merge to `main`, a workflow runs `supabase db push` to production after CI passes.
- **Types:** regenerate `src/types/database.ts` after every migration; CI fails if generated types are out of date.
- **Vercel:** connect the repo; set env vars per environment (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`). Use the Nairobi-nearest available function region.
- **Monitoring:** Vercel Analytics and Speed Insights; error tracking with Sentry (optional); Supabase logs and daily backups (enable point-in-time recovery on paid plan).
- **Scheduled jobs:** Vercel Cron or Supabase `pg_cron` for daily reminders (vaccines due, low stock, overdue invoices) written to `notifications` and emailed.

## Phased delivery plan

Build in eight phases, each ending in a merged pull request with green CI and a working preview deployment. Stop after each phase for review.

1. **Phase 0: Foundation.** Next.js + TypeScript strict, Tailwind, shadcn/ui, ESLint/Prettier/Husky, Vitest, Playwright, local Supabase, env validation, CI workflow, Vercel link, `CLAUDE.md`, `docs/DECISIONS.md`.
   - Done when: an empty app deploys to a Vercel preview and CI runs all steps green.
2. **Phase 1: Auth and tenancy.** Signup/login/reset, profiles, farms, members, invites, roles, farm switcher, RLS helpers and policies, app shell (sidebar, mobile nav, header), settings basics.
   - Done when: pgTAP proves farm isolation and role rules; E2E journey 1 passes.
3. **Phase 2: Reference data, sheds, batches, animals.** Species, breeds, units, sheds, batches, batch stock ledger, individual animals, movements, mortality, shared DataTable and form components.
   - Done when: animals and batch counts are correct after transfers and deaths; CSV import works.
4. **Phase 3: Parties, purchases, inventory.** Suppliers, clients, staff, purchase invoices (animals and supplies), inventory ledger, invoice numbering, PDF invoice.
   - Done when: receiving a purchase updates animals/batches and stock atomically.
5. **Phase 4: Feed, health, production.** Feed distribution and waste, vaccination programs and due lists, treatments with withdrawal periods, production records (milk, eggs).
   - Done when: E2E journeys 2 and 3 pass.
6. **Phase 5: Sales, payments, expenses.** Sale invoices with stock and withdrawal checks, payments hub, partial payments, statements, expenses with receipts, salary payments.
   - Done when: E2E journey 4 passes; overpayment and negative stock are impossible even with concurrent requests.
7. **Phase 6: Dashboard, reports, breeding.** KPI dashboard and alerts, all reports with exports, breeding module, notifications and daily cron reminders.
   - Done when: E2E journey 6 passes; dashboard loads in under 2 s on a seeded farm with 10,000 records.
8. **Phase 7: Polish and extensions.** PWA and offline queue for daily records, full farm data export, audit log viewer, accessibility pass, performance pass, Swahili-ready strings, M-Pesa (Daraja) design note for a later integration.
   - Done when: Lighthouse ≥ 90 for performance and accessibility on mobile; all E2E journeys pass.

## Working rules for Claude Code

- Start by reading this prompt fully, then write a plan for Phase 0 and the full schema outline in `docs/SCHEMA.md` before coding.
- Create and maintain `CLAUDE.md` with: commands (dev, test, lint, db reset, gen types), folder conventions, the permission matrix, and key decisions. Read it at the start of every session.
- One phase per branch and pull request. Commit often with Conventional Commits (`feat(sales): add partial payments`).
- Write the migration and its pgTAP tests before the UI that depends on it.
- Run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` before declaring any task done; fix failures rather than disabling tests.
- Do not add libraries outside the stack without writing why in `docs/DECISIONS.md`.
- Ask me before: changing the stack, deleting or rewriting applied migrations, changing the permission matrix, or anything that touches production data.
- Never commit secrets; use `.env.local` and `.env.example`.
- Keep components small; no file over ~300 lines without a reason.
- At the end of each phase, report: what was built, tests added and their results, screenshots of key screens, known gaps, and the next phase plan.

**Definition of done (every feature)**

- [ ] Migration, RLS policies and pgTAP tests written and passing
- [ ] Zod schema shared by form and Server Action
- [ ] Works on a 360 px wide phone and on desktop, in light and dark mode
- [ ] Loading, empty and error states present
- [ ] Role permissions enforced in the database and reflected in the UI
- [ ] Unit tests and, for critical flows, a Playwright test
- [ ] Audit log entries recorded
- [ ] `CLAUDE.md` and docs updated; CI green; Vercel preview checked
