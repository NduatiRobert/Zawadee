import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy (Next 16's renamed middleware). Two jobs:
 *   1. Refresh the Supabase auth session on every request so Server Components
 *      always see a fresh user (cookies are rewritten onto the response).
 *   2. Gate routes: send signed-out users to /login, and signed-in users away
 *      from the auth pages.
 *
 * Farm membership and slug resolution happen in the (app) layouts, not here —
 * the proxy stays free of per-farm DB lookups so it runs cheaply on every hit.
 */

// Paths reachable while signed out. Everything else under (app) needs a session.
const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/reset-password"]);
// Auth pages a signed-in user should not see.
const AUTH_PATHS = new Set(["/login", "/signup", "/reset-password"]);

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: use getUser() (revalidates with Supabase), never getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Preserve where they were headed so we can return there after login.
    url.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets. Auth callbacks
  // and exports under /api are matched so their session stays fresh too.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
