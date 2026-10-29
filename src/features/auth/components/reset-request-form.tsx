"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { requestPasswordReset } from "../actions";
import { resetRequestSchema, type ResetRequestInput } from "../schema";

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ResetRequestInput) {
    await requestPasswordReset(values);
    // Always report success — never reveal whether the email is registered.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="bg-muted text-foreground rounded-md px-3 py-3 text-sm">
        If an account exists for that email, a reset link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
