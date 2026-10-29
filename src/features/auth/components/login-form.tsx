"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { signIn } from "../actions";
import { loginSchema, type LoginInput } from "../schema";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    // On success the action redirects (navigation), so we only handle failure.
    const result = await signIn(values, redirectTo);
    if (!result.ok) {
      setFormError(result.error);
      for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(name as keyof LoginInput, { message });
      }
    }
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
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/reset-password"
          className="text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="text-primary font-medium hover:underline"
        >
          Create account
        </Link>
      </div>
    </form>
  );
}
