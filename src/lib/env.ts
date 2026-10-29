import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation. Imported only from server code
 * (Server Components, Server Actions, Route Handlers). The `server-only`
 * guard makes the build fail if this module is ever pulled into a client
 * bundle, which would leak SUPABASE_SERVICE_ROLE_KEY.
 *
 * Public (NEXT_PUBLIC_*) values are also validated here so startup fails
 * fast on misconfiguration; client code reads them via `process.env`
 * directly, which Next inlines at build time.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables:\n${issues}\n` +
      "Copy .env.example to .env.local and fill in the values.",
  );
}

export const env = parsed.data;
export type Env = typeof env;
