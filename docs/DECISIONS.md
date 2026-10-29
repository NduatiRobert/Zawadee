# Decisions & assumptions

Running log of non-obvious choices. When a requirement is ambiguous, the
simplest option that fits `docs/PROMPT.md` is chosen, recorded here, and work
continues. Newest entries at the bottom of each phase.

## Phase 0 — Foundation

1. **Node ≥ 22.15 required.** Next 16, Vitest 5 (rolldown) and undici 8 all
   require a modern Node. In particular the `@rolldown/*` native bindings
   declare `engines: ^20.19 || >=22.12`, and undici 8's zstd decompressor
   needs `zlib.createZstdDecompress` (Node ≥ 22.15). `.nvmrc` pins `22`; CI
   uses it via `node-version-file`. `package.json#engines` enforces `>=22.15.0`.
   _Assumption:_ contributors use Node 22 LTS. Node 20.16 (common install) is
   too old and silently skips the rolldown binding.

2. **pnpm installed via `npm i -g pnpm`, not corepack.** Corepack bundled with
   Node 20 fails signature verification for recent pnpm and cannot write under
   `C:\Program Files`. `packageManager` is still pinned so CI's
   `pnpm/action-setup` resolves the right version.

3. **Next.js 16: `proxy.ts`, not `middleware.ts`.** Next 16 deprecated
   `middleware.ts` and renamed it to `proxy.ts` (same functionality). This
   deviates from the folder layout in `docs/PROMPT.md`, which predates Next 16.
   Session refresh / auth redirects / farm resolution (Phase 1) will live in
   `src/proxy.ts` with helpers under `src/lib/supabase/`.

4. **Tailwind CSS v4 (CSS-first).** The scaffold ships Tailwind v4, configured
   in `globals.css` via `@import "tailwindcss"` and `@theme`, with design
   tokens as CSS variables (`:root` + dark via `prefers-color-scheme` and a
   `[data-theme]` override hook). No `tailwind.config.js`. Satisfies the spec's
   "design tokens in CSS variables; no inline hex in components".

5. **`src/types/database.ts` is generated and gitignored in Phase 0.** There
   is no schema yet, so there is nothing to type and nothing imports it. CI
   generates it after `supabase start`. From Phase 1 (first migration) it will
   be committed and a CI drift check (`gen:types` + `git diff --exit-code`)
   added, per the spec.

6. **Vitest coverage thresholds deferred to Phase 1.** Phase 0 ships only smoke
   tests (`lib/money`), so no ≥90% gate yet; coverage is collected and reported.
   The threshold lands with the first `lib/`/`schema.ts` logic.

7. **shadcn/ui minimal for now.** Only the `cn()` helper plus `clsx` and
   `tailwind-merge` are added. Components (and `components.json`) are installed
   on demand starting Phase 1, to avoid committing unused UI.

8. **Security headers in `next.config.ts`.** HSTS, X-Frame-Options DENY,
   X-Content-Type-Options, Referrer-Policy, Permissions-Policy. A strict CSP is
   deferred until the Supabase origin and any third-party scripts are known;
   tracked for Phase 1.

9. **Vercel + hosted Supabase linking is a manual step.** No cloud credentials
   are available in this environment. Everything is wired for local Supabase;
   linking Vercel and creating the Supabase project/branch is documented and
   left to the repo owner. The empty-app preview deploy (Phase 0 "done when")
   happens once the repo is connected to Vercel.

10. **Supabase `project_id` left as `Zawadee-1`.** Matches the repo folder; it
    only labels local Docker resources.

11. **`server-only` dependency added.** Guards `src/lib/env.ts` so the
    service-role key can never be bundled into client code. Part of the Next/
    React ecosystem, within the intended stack.

12. **Portable Node 22 used for local validation only.** The dev machine had
    Node 20.16; a portable Node 22.23.4 was used to run lint/typecheck/tests/
    build locally. Not committed; no change to the user's system Node.

## Phase 1 — Auth & tenancy

13. **CI hardening (carried from the Phase 0 fix PR).** `gen:types` needs
    `src/types/` to exist (added `.gitkeep`); `supabase start` excludes
    `mailpit` (`-x mailpit`) to avoid an intermittent port 54324 bind failure.

14. **Roles and statuses are Postgres enums, not lookup tables.** `farm_role`,
    `member_status` and `invitation_status` are fixed sets the app logic and
    RLS depend on; they are not farm-customisable, so enums (simpler, and
    usable directly in policies) fit the spec's "enums or lookup tables".

15. **`shed_assignments` deferred to Phase 2.** It carries a `shed_id` FK and
    `sheds` does not exist until Phase 2. Worker shed-scoping is optional in the
    spec, so the table (and its worker-scoping policies) land with `sheds`.

16. **Onboarding and invite acceptance are SECURITY DEFINER RPCs.**
    `create_farm()` and `accept_invitation()` must insert the first
    `farm_members` row _before_ the caller is a member, which RLS would block.
    One transaction each, `search_path = ''`, auth checked inside. Helper
    functions `is_farm_member` / `has_farm_role` / `shares_farm_with` are also
    SECURITY DEFINER so RLS policies can call them without recursing into RLS.

17. **Profiles auto-created via `handle_new_user` trigger on `auth.users`.**
    One profile per auth user; `full_name`/`phone` seeded from signup metadata.

18. **`src/types/database.ts` still generated in CI only (Docker broken).**
    The gen:types drift gate (`gen:types` + `git diff --exit-code`) promised
    for Phase 1 is deferred until the file can be generated and committed from
    a working local Supabase (or a CI commit step). CI still regenerates it so
    typecheck/build run against the real schema.

19. **RLS/role proofs run in pgTAP, not locally.** Tenant isolation and
    per-role permissions are proven in `supabase/tests/10_tenancy_rls.test.sql`
    using `set local role authenticated` + `request.jwt.claims`. Validated in
    CI (`supabase test db`) because local Docker is unavailable on the dev box.

20. **UI primitives hand-rolled, not installed via the shadcn CLI.** The CLI is
    interactive, needs network, and rewrites `globals.css` / Tailwind config —
    which the Phase 0 scaffold already tuned for Tailwind v4 (CSS-first tokens,
    light/dark). So `components/ui/{button,input,label,card}` are small
    hand-written components using the existing CSS-variable tokens, with a
    shadcn-compatible API. No stack change; no new deps (no `cva`/Radix yet).
    Touch targets are ≥44px (`h-11`) for phone use. Revisit if a component needs
    Radix behaviour (menus, dialogs) — add those via the CLI then.

21. **`src/types/database.ts` is now committed and un-gitignored.** Local Docker
    is still down, so the file is hand-maintained to match the applied
    migrations, which unblocks typed Supabase clients and local `typecheck`. CI
    still runs `gen:types` from the real schema before typecheck/build, so it
    remains authoritative and catches drift. The formal drift gate (`gen:types`
    - `git diff --exit-code`, decision 18) still waits on a working local
      Supabase or a CI commit-back step.

22. **Three Supabase clients.** `lib/supabase/server.ts` (request cookies, RLS,
    for RSC/actions/handlers), `client.ts` (browser, anon), `admin.ts`
    (service-role, bypasses RLS, `server-only` + `env`-guarded, used only where
    the caller cannot yet act under RLS). The browser never talks to Supabase
    directly — only Next → Supabase with the user's session.

23. **`proxy.ts` does session refresh + the auth gate only.** It refreshes the
    session (via `getUser()`, never `getSession()`) and redirects: signed-out →
    `/login?redirect=…`, signed-in on an auth page → `/onboarding`. Per-farm
    membership and slug resolution live in `(app)/[farmSlug]/layout.tsx`, which
    returns `notFound()` for non-members (RLS already hides the rows — 404 so we
    don't confirm a farm exists). This keeps the edge proxy free of DB lookups.

24. **Dynamic authed routes opt into blocking with `export const instant =
false`.** `next.config.ts` enables `cacheComponents` (Next 16). Every app
    page is per-request authed (reads cookies + params), so prerendering a
    static shell buys nothing; the framework's "block" option is simpler and
    correct here. Reconsider per-route `<Suspense>` shells if a page gains a
    cacheable static portion.

25. **Auth email flows route through `/api/auth/callback`.** Signup confirmation
    and password recovery links set `emailRedirectTo` to this handler, which
    exchanges the `code` for a session then forwards to `next`. With local
    confirmations off, `signUp` returns a session immediately and the form skips
    the "check your email" step. `requestPasswordReset` never reveals whether an
    email is registered.

26. **`create_farm` slug derivation.** The onboarding form takes only a farm
    name; the slug is derived server-side via `slugify()` (matches the DB check
    constraint) and, on a unique-slug collision (`23505`), retried with `-2`…
    `-5` suffixes before surfacing a friendly "name is taken" error.

27. **Deferred within Phase 1 (follow-ups, not gaps in the DB layer).** Member
    role-change and removal UI, farm-settings editing, and customised invite
    emails are not built yet; the schema/RLS/RPCs already support them. The Team
    page covers invite / list / revoke / accept, and Settings is read-only. These
    land as small follow-ups before Phase 2 or alongside it.
