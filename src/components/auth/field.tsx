"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared form field primitives for the auth surfaces.
 *
 * `border-border-strong` (3.3:1 on the nude canvas) is used instead of
 * `border-border` so the control outline meets WCAG 1.4.11. The focus state
 * swaps to `border-accent-strong` (5.0:1) rather than raw rose gold (2.8:1):
 * a focus indicator has to reach 3:1 on its own, and rose gold does not.
 * Placeholders use the full `muted` token for the same reason — at 60% opacity
 * they land at 2.6:1, which is not readable text.
 */
export const fieldClass = cn(
  "w-full rounded-xl border border-border-strong bg-field px-3.5 py-2.5 text-sm text-foreground",
  "shadow-[inset_0_1px_2px_rgba(94,75,66,0.06)] outline-none transition-colors",
  "placeholder:text-muted focus:border-accent-strong focus:ring-4 focus:ring-accent/20",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15",
);

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Optional element aligned to the right of the label (e.g. "Forgot password?"). */
  action?: ReactNode;
};

export function Field({ label, hint, error, action, id, className, ...input }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={fieldId}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {label}
        </label>
        {action}
      </div>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn(fieldClass, className)}
        {...input}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: FieldProps) {
  const [visible, setVisible] = useState(false);
  const { label, hint, error, action, id, className, ...input } = props;
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={fieldId}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(fieldClass, "pr-11", className)}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
