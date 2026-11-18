import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Set a new password" };

/**
 * The recovery link lands on /auth/callback, which exchanges the PKCE code and
 * redirects here *with* a session. No session means the link was expired,
 * already used, or opened in another browser — show a real explanation instead
 * of letting `updateUser` fail with "Auth session missing".
 */
export default async function ResetPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight">This link has expired</h1>
        <p className="text-sm leading-relaxed text-muted">
          Reset links can only be used once and expire after 60 minutes.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_24px_-14px_rgba(94,75,66,0.9)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted">
          At least 8 characters. You will sign in again afterwards.
        </p>
      </div>

      <AuthForm mode="reset" />

      <p className="text-center text-xs text-muted">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>
      </p>
    </div>
  );
}
