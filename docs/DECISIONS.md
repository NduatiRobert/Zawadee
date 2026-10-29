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
