import { notFound } from "next/navigation";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { FarmNav, type NavItem } from "@/features/farms/components/farm-nav";
import { FarmSwitcher } from "@/features/farms/components/farm-switcher";
import { getFarmContext, listMyFarms } from "@/features/farms/queries";
import { can } from "@/lib/permissions";

// Auth-gated: reads cookies + params on every request, so render on request
// rather than prerender (Next 16 cacheComponents).
export const instant = false;

export default async function FarmLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ farmSlug: string }>;
}) {
  const { farmSlug } = await params;
  const ctx = await getFarmContext(farmSlug);
  // Not a member (or no such farm) — RLS hides it; 404 rather than leak.
  if (!ctx) notFound();

  const farms = await listMyFarms();
  const base = `/${farmSlug}`;

  const items: NavItem[] = [{ href: `${base}/dashboard`, label: "Dashboard" }];
  if (can(ctx.role, "invitations:view"))
    items.push({ href: `${base}/team`, label: "Team" });
  if (can(ctx.role, "settings:manage"))
    items.push({ href: `${base}/settings`, label: "Settings" });

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-semibold tracking-tight">HerdBook</span>
          <FarmSwitcher farms={farms} currentSlug={farmSlug} />
          <div className="ml-auto flex items-center gap-3">
            <SignOutButton />
          </div>
          <div className="w-full">
            <FarmNav items={items} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
