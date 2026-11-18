import Link from "next/link";

import { envPublic } from "@/lib/env-public";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-serif text-xl font-bold tracking-tight",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      </span>
      <span>{envPublic.NEXT_PUBLIC_APP_NAME}</span>
    </Link>
  );
}
