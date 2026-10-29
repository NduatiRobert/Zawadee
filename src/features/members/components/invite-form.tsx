"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FARM_ROLES, ROLE_LABELS } from "@/lib/permissions";

import { inviteMember } from "../actions";
import { inviteSchema, type InviteInput } from "../schema";

export function InviteForm({ farmSlug }: { farmSlug: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "worker" },
  });

  async function onSubmit(values: InviteInput) {
    setFormError(null);
    setSent(null);
    const result = await inviteMember(farmSlug, values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as keyof InviteInput, { message });
      }
      return;
    }
    setSent(values.email);
    reset({ email: "", role: values.role });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError ? (
        <p
          role="alert"
          className="bg-muted text-critical rounded-md px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}
      {sent ? (
        <p
          role="status"
          className="bg-muted text-healthy rounded-md px-3 py-2 text-sm"
        >
          Invitation created for {sent}.
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label="Email"
            htmlFor="invite-email"
            error={errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>
        </div>
        <div className="sm:w-44">
          <Field
            label="Role"
            htmlFor="invite-role"
            error={errors.role?.message}
          >
            <select
              id="invite-role"
              className="border-border bg-card focus-visible:ring-primary h-11 w-full rounded-md border px-3 text-base focus-visible:ring-2 focus-visible:outline-none"
              {...register("role")}
            >
              {FARM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Inviting…" : "Invite"}
        </Button>
      </div>
    </form>
  );
}
