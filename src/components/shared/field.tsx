import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/** Label + control + inline error. Keeps form markup consistent and accessible. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-critical text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
