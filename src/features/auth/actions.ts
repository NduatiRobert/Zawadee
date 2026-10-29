"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/action-result";
import { firstFieldErrors } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

import {
  loginSchema,
  resetRequestSchema,
  signupSchema,
  updatePasswordSchema,
} from "./schema";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Only allow same-origin relative redirect targets (block open redirects). */
function safeRedirect(target: string | null | undefined): string {
  if (target && target.startsWith("/") && !target.startsWith("//"))
    return target;
  return "/onboarding";
}

export async function signIn(
  values: unknown,
  redirectTo?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: "Invalid email or password." };
  }

  redirect(safeRedirect(redirectTo));
}

export async function signUp(
  values: unknown,
): Promise<ActionResult<{ emailConfirmationRequired: boolean }>> {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { email, password, fullName, phone } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone ?? null },
      emailRedirectTo: `${appUrl()}/api/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("registered")
      ? "An account with this email already exists."
      : "Could not create your account. Please try again.";
    return { ok: false, error: msg };
  }

  // With email confirmations off (local dev), a session is returned immediately.
  if (data.session) {
    redirect("/onboarding");
  }
  return { ok: true, data: { emailConfirmationRequired: true } };
}

export async function requestPasswordReset(
  values: unknown,
): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a valid email address.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  // Do not reveal whether the email exists; ignore the error, always succeed.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/api/auth/callback?next=/reset-password/update`,
  });
  return { ok: true, data: undefined };
}

export async function updatePassword(values: unknown): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the form and try again.",
      fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Your reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      ok: false,
      error: "Could not update your password. Please try again.",
    };
  }

  redirect("/onboarding");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
