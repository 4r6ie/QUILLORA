"use client";

import { cn } from "@/lib/utils";

/**
 * Lightweight, local-only password strength hint.
 *
 * This is *guidance*, not enforcement: the server only requires 8+ characters.
 * Deliberately no entropy library — four cheap signals are enough to nudge
 * people away from "password123" without pretending to be a policy engine.
 */
export function scorePassword(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

const LABELS = ["Too weak", "Too weak", "Weak", "Fair", "Strong"] as const;
const COLORS = ["bg-danger", "bg-danger", "bg-accent", "bg-accent-strong", "bg-success"] as const;

export function StrengthMeter({ value }: { value: string }) {
  const score = scorePassword(value);

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              value && step <= score ? COLORS[score] : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        {value ? `Password strength: ${LABELS[score]}` : "Use at least 8 characters."}
      </p>
    </div>
  );
}
