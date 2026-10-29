"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { revokeInvitation } from "../actions";

export function RevokeInviteButton({
  farmSlug,
  invitationId,
}: {
  farmSlug: string;
  invitationId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revokeInvitation(farmSlug, invitationId);
        })
      }
    >
      {pending ? "Revoking…" : "Revoke"}
    </Button>
  );
}
