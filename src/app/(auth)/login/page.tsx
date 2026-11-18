import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Signed-in visitors have no reason to see a sign-in form.
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const query = await searchParams;

  const notice =
    query.reset === "1"
      ? "Password updated. Sign in with your new password."
      : query.confirmed === "1"
        ? "Email confirmed. Welcome aboard."
        : null;

  const error =
    query.error === "link_expired"
      ? "That link has expired or was already used. Request a new one."
      : query.error
        ? "We could not sign you in with that link. Please try again."
        : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to keep writing.</p>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-accent/25 border-l-2 border-l-accent bg-accent/10 px-3.5 py-2.5 text-sm text-foreground"
        >
          {notice}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <AuthForm mode="login" />

      <p className="text-sm text-muted">
        New to Quillora?{" "}
        <Link href="/register" className="font-medium text-accent-strong hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
