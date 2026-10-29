"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signUp } from "../actions";
import { signupSchema } from "../schema";

// The Zod schema transforms input (optional phone) into output, so the form's
// value type (input) differs from the parsed type (output).
type SignupFormValues = z.input<typeof signupSchema>;
type SignupParsed = z.output<typeof signupSchema>;

export function SignupForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues, unknown, SignupParsed>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
  });

  async function onSubmit(values: SignupParsed) {
    setFormError(null);
    const result = await signUp(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as keyof SignupFormValues, { message });
      }
      return;
    }
    if (result.data.emailConfirmationRequired) setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <p className="bg-muted text-foreground rounded-md px-3 py-3 text-sm">
        Check your email to confirm your account, then sign in.
      </p>
    );
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

      <Field
        label="Full name"
        htmlFor="fullName"
        error={errors.fullName?.message}
      >
        <Input
          id="fullName"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field
        label="Phone"
        htmlFor="phone"
        error={errors.phone?.message}
        hint="Optional"
      >
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters"
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
