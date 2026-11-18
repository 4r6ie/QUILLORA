"use client";

import { useEffect } from "react";

import { recordArticleView } from "@/features/articles/mutations";

/**
 * Records a view shortly after mount. Runs inside an effect (never during
 * render) because server actions may not be called during the initial render.
 * Failures are swallowed: analytics must never break the reading experience.
 */
export function ArticleViewRecorder({ articleId }: { articleId: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      void recordArticleView(articleId).catch(() => {
        /* analytics are best-effort */
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [articleId]);

  return null;
}
