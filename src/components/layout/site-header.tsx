import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SearchBox } from "@/components/layout/search-box";

const navItems = [
  { href: "/explore", label: "Explore" },
  { href: "/categories", label: "Categories" },
  { href: "/tags", label: "Tags" },
  { href: "/authors", label: "Authors" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchBox />
          <Link
            href="/dashboard"
            className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface sm:inline-flex"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
