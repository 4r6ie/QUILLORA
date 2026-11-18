import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { envPublic } from "@/lib/env-public";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Independent publishing with editorial rigor. Built to scale from a
            single writer to a newsroom.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Read</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-foreground" href="/explore">Explore</Link></li>
            <li><Link className="hover:text-foreground" href="/categories">Categories</Link></li>
            <li><Link className="hover:text-foreground" href="/tags">Tags</Link></li>
            <li><Link className="hover:text-foreground" href="/authors">Authors</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Publish</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-foreground" href="/register">Become an author</Link></li>
            <li><Link className="hover:text-foreground" href="/dashboard">Dashboard</Link></li>
            <li><Link className="hover:text-foreground" href="/admin">Editorial desk</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Platform</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-foreground" href="/about">About</Link></li>
            <li><Link className="hover:text-foreground" href="/api/health">Health</Link></li>
            <li><a className="hover:text-foreground" href={`${envPublic.NEXT_PUBLIC_SITE_URL}/sitemap.xml`}>Sitemap</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted">
        © {year} {envPublic.NEXT_PUBLIC_APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
