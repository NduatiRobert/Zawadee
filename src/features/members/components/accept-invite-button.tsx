"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { acceptInvitation } from "../actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="bg-muted text-critical rounded-md px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            // Redirects on success; only returns here on failure.
            const result = await acceptInvitation(token);
            if (!result.ok) setError(result.error);
          })
        }
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  );
}
