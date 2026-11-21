"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  approveArticle,
  deleteArticle,
  unpublishArticle,
} from "@/features/articles/mutations";

export function ModerationActions({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => approveArticle(articleId))}
        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => unpublishArticle(articleId))}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
      >
        Unpublish
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this article permanently?")) {
            void run(() => deleteArticle(articleId));
          }
        }}
        className="rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
      >
        Delete
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
