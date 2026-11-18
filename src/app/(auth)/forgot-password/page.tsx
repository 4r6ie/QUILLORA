import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-muted">
          We will email you a reset link. It expires after a short window.
        </p>
      </div>
      <AuthForm mode="forgot" />
      <p className="text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
