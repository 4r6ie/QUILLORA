"use client";

import { useState } from "react";

import { signOut } from "@/features/auth/actions";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOut();
        } catch (error) {
          if ((error as { digest?: string })?.digest === "NEXT_REDIRECT") return;
          setPending(false);
        }
      }}
      className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
