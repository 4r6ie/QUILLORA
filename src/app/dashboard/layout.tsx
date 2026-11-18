import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Logo } from "@/components/layout/logo";

/**
 * Private dashboard shell (requirement 4).
 * `force-dynamic` + `no-store`: never served from or written to a CDN cache.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await safe(() => getCurrentUser(), null);
  if (!user) redirect("/login");

  const role = user.profile?.role ?? "reader";
  const isEditor = role === "editor" || role === "admin";

  return (
    <div className="container-page py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-strong">
            {role}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            Stories
          </Link>
          <Link href="/dashboard/articles/new" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            New story
          </Link>
          <Link href="/dashboard/profile" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            Profile
          </Link>
          {isEditor ? (
            <Link href="/admin" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
              Editorial desk
            </Link>
          ) : null}
          <SignOutButton />
        </nav>
      </div>
      {children}
    </div>
  );
}
