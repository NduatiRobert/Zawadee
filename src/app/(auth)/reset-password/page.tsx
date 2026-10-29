import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetRequestForm } from "@/features/auth/components/reset-request-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll email you a link to set a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetRequestForm />
      </CardContent>
    </Card>
  );
}
