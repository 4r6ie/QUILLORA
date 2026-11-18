import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          Create your author account
        </h1>
        <p className="text-sm text-muted">
          Publish under your own name — you can change it later.
        </p>
      </div>

      <AuthForm mode="register" />

      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <li>Free to start</li>
        <li aria-hidden>·</li>
        <li>Editorial review before publishing</li>
        <li aria-hidden>·</li>
        <li>No credit card</li>
      </ul>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-strong hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
