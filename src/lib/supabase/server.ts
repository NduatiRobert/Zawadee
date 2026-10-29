import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Server Supabase client bound to the request's cookies. Use in Server
 * Components, Server Actions and Route Handlers. Talks to Supabase with the
 * user's session so RLS applies — this is the only path the browser's data
 * reaches Supabase through.
 *
 * `setAll` throws when called from a Server Component (cookies are read-only
 * there); that is expected and swallowed. Session refresh happens in
 * `src/proxy.ts`, which can write cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}
