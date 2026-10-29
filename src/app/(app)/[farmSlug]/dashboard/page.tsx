import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFarmContext } from "@/features/farms/queries";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dashboard" };
export const instant = false;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ farmSlug: string }>;
}) {
  const { farmSlug } = await params;
  const ctx = await getFarmContext(farmSlug);
  if (!ctx) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {ctx.farm.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          You&apos;re signed in as {ROLE_LABELS[ctx.role]}.
          {ctx.farm.location ? ` · ${ctx.farm.location}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to your farm</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Animals, sheds, feed, health and finance land in the next phases. For
          now you can invite your team from the Team page.
        </CardContent>
      </Card>
    </div>
  );
}
