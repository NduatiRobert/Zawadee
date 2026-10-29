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
import { InviteForm } from "@/features/members/components/invite-form";
import { RevokeInviteButton } from "@/features/members/components/revoke-invite-button";
import {
  listMembers,
  listPendingInvitations,
} from "@/features/members/queries";
import { can, ROLE_LABELS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Team" };
export const instant = false;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ farmSlug: string }>;
}) {
  const { farmSlug } = await params;
  const ctx = await getFarmContext(farmSlug);
  // invitations:view gates the whole page (owner/manager).
  if (!ctx || !can(ctx.role, "invitations:view")) notFound();

  const manage = can(ctx.role, "members:manage");
  const [members, invites] = await Promise.all([
    listMembers(ctx.farm.id),
    listPendingInvitations(ctx.farm.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground text-sm">
          People with access to {ctx.farm.name}.
        </p>
      </div>

      {manage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              They&apos;ll get access once they accept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm farmSlug={farmSlug} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <span className="font-medium">{m.fullName}</span>
                <span className="text-muted-foreground text-sm">
                  {ROLE_LABELS[m.role]}
                  {m.status !== "active" ? ` · ${m.status}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations ({invites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pending invitations.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {inv.email}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {ROLE_LABELS[inv.role]}
                    </span>
                  </span>
                  {manage ? (
                    <RevokeInviteButton
                      farmSlug={farmSlug}
                      invitationId={inv.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
