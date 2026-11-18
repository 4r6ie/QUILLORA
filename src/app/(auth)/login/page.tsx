import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to your author account.</p>
      </div>
      <AuthForm mode="login" />
      <div className="flex items-center justify-between text-sm">
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>
        <Link href="/forgot-password" className="text-muted hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
