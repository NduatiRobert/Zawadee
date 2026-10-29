import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES RLS — use only in trusted server-only
 * code for operations the user's session cannot perform (e.g. looking up an
 * invitation by token before the user is a member). Never import from client
 * code; the `server-only` guard and `env` (also `server-only`) enforce that.
 *
 * Prefer the request-scoped `createClient` from `./server` for anything that
 * should respect the caller's permissions.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
