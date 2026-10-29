import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "@/features/members/components/accept-invite-button";

export const metadata: Metadata = { title: "Accept invitation" };
export const instant = false;

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join the farm</CardTitle>
        <CardDescription>
          You&apos;ve been invited to a farm on HerdBook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <AcceptInviteButton token={token} />
        ) : (
          <p
            role="alert"
            className="bg-muted text-critical rounded-md px-3 py-2 text-sm"
          >
            This invitation link is missing its token. Ask for a new invite.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
