import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted">
          We will email a link that expires in 60 minutes.
        </p>
      </div>

      <AuthForm mode="forgot" />

      <p className="text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-accent-strong hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
