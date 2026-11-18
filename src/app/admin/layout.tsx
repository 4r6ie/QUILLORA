import Link from "next/link";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";
import { Logo } from "@/components/layout/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";

/**
 * Private admin shell (requirement 4). Never cached; editor/admin only.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await safe(() => requireRole("editor", "admin"), null);
  if (!user) redirect("/dashboard");

  return (
    <div className="container-page py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-strong">
            Editorial desk
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            Overview
          </Link>
          <Link href="/admin/articles" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            All articles
          </Link>
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-muted hover:bg-surface hover:text-foreground">
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </div>
      {children}
    </div>
  );
}
