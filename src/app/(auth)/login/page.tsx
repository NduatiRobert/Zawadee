import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to manage your farm.</CardDescription>
      </CardHeader>
      <CardContent>
        {error === "link" ? (
          <p
            role="alert"
            className="bg-muted text-critical mb-4 rounded-md px-3 py-2 text-sm"
          >
            That link has expired or was already used. Please sign in.
          </p>
        ) : null}
        <LoginForm redirectTo={redirect} />
      </CardContent>
    </Card>
  );
}
