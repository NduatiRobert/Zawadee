"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Browser Supabase client. Uses the anon key and the user's cookie session, so
 * RLS applies. Public env vars are inlined by Next at build time.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
