import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFarmContext } from "@/features/farms/queries";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Settings" };
export const instant = false;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ farmSlug: string }>;
}) {
  const { farmSlug } = await params;
  const ctx = await getFarmContext(farmSlug);
  if (!ctx || !can(ctx.role, "settings:manage")) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Farm profile and defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Farm profile</CardTitle>
          <CardDescription>Editing arrives in a later phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <Row label="Name" value={ctx.farm.name} />
          <Row label="Location" value={ctx.farm.location ?? "—"} />
          <Row label="Currency" value={ctx.farm.currency} />
          <Row label="Timezone" value={ctx.farm.timezone} />
          <Row label="Slug" value={ctx.farm.slug} />
        </CardContent>
      </Card>
    </div>
  );
}
