"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleCheck, LoaderCircle } from "lucide-react";

import { Field, PasswordField } from "@/components/auth/field";
import { StrengthMeter } from "@/components/auth/strength-meter";
import {
  forgotPassword,
  login,
  register,
  resendConfirmation,
  resetPassword,
} from "@/features/auth/actions";
import type { AuthResult } from "@/features/auth/schemas";
import { isRedirectDigest } from "@/lib/auth/redirects";

type Mode = "login" | "register" | "forgot" | "reset";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "notice"; message: string }
  | { kind: "sent"; message: string };

const SUBMIT_LABEL: Record<Mode, string> = {
  login: "Sign in",
  register: "Create account",
  forgot: "Send reset link",
  reset: "Update password",
};

const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_24px_-14px_rgba(94,75,66,0.9)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex w-full items-center justify-center rounded-full border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60";

const textButton = "text-sm font-medium text-accent-strong hover:underline";

export function AuthForm({ mode }: { mode: Mode }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const withPasswordHints = mode === "register" || mode === "reset";

  function send(payload: unknown): Promise<AuthResult> {
    switch (mode) {
      case "login":
        return login(payload);
      case "register":
        return register(payload);
      case "forgot":
        return forgotPassword(payload);
      case "reset":
        return resetPassword(payload);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "idle" });
    setErrors({});
    setPending(true);

    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const raw = (name: string) => String(form.get(name) ?? "");

    const email = text("email");
    const password = raw("password");
    const confirmPassword = raw("confirmPassword");

    if (withPasswordHints && password !== confirmPassword) {
      const message = "Passwords do not match.";
      setErrors({ confirmPassword: message });
      setStatus({ kind: "error", message });
      setPending(false);
      return;
    }

    // Each mode sends exactly the fields it owns. A blank optional display name
    // is OMITTED, never sent as "" — that was what blocked registration.
    const payload =
      mode === "login"
        ? { email, password }
        : mode === "register"
          ? {
              email,
              username: text("username"),
              password,
              confirmPassword,
              ...(text("fullName") ? { fullName: text("fullName") } : {}),
            }
          : mode === "forgot"
            ? { email }
            : { password, confirmPassword };

    try {
      const result = await send(payload);

      // A redirecting action (successful login or password reset) resolves to
      // `undefined` because the router is already navigating. Guard before
      // reading a property, otherwise a successful sign-in throws here and
      // shows a false error.
      if (!result) return;

      if ("error" in result && result.error) {
        if (result.field !== undefined) {
          setErrors({ [String(result.field)]: result.error });
        }
        setStatus({ kind: "error", message: result.error });
        return;
      }

      if ("message" in result && result.message) {
        if (mode === "forgot" || mode === "register") {
          setSentTo(email);
          setStatus({ kind: "sent", message: result.message });
        } else {
          setStatus({ kind: "notice", message: result.message });
        }
      }
    } catch (caught) {
      // redirect() throws NEXT_REDIRECT on success; anything else is real.
      if (isRedirectDigest(caught)) throw caught;
      setStatus({ kind: "error", message: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!sentTo) return;
    setResending(true);
    try {
      const result =
        mode === "forgot"
          ? await forgotPassword({ email: sentTo })
          : await resendConfirmation({ email: sentTo });

      if ("error" in result && result.error) {
        setStatus({ kind: "error", message: result.error });
      } else {
        setStatus({
          kind: "sent",
          message:
            ("message" in result && result.message) || "A new link is on its way.",
        });
      }
    } catch {
      setStatus({ kind: "error", message: "Something went wrong. Please try again." });
    } finally {
      setResending(false);
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-strong">
          <CircleCheck className="h-6 w-6" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-serif text-xl font-semibold">Check your inbox</h2>
          <p className="text-sm leading-relaxed text-muted">{status.message}</p>
          {sentTo ? (
            <p className="text-xs text-muted">
              Sent to <span className="font-medium text-foreground">{sentTo}</span>
            </p>
          ) : null}
        </div>
        <div className="space-y-3">
          <button type="button" onClick={resend} disabled={resending} className={secondaryButton}>
            {resending
              ? "Sending…"
              : mode === "forgot"
                ? "Send another link"
                : "Resend confirmation email"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus({ kind: "idle" });
              setSentTo(null);
              setPasswordValue("");
            }}
            className={textButton}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending}>
      {status.kind === "error" ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {status.message}
        </p>
      ) : null}

      {status.kind === "notice" ? (
        <p
          role="status"
          className="rounded-xl border border-accent/25 border-l-2 border-l-accent bg-accent/10 px-3.5 py-2.5 text-sm text-foreground"
        >
          {status.message}
        </p>
      ) : null}

      {mode === "register" ? (
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={40}
          placeholder="ada_lovelace"
          hint="Your public handle: letters, numbers, _ and -."
          error={errors.username}
        />
      ) : null}

      {mode !== "reset" ? (
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="you@example.com"
          error={errors.email}
        />
      ) : null}

      {mode === "register" ? (
        <Field
          label="Display name (optional)"
          name="fullName"
          autoComplete="name"
          maxLength={120}
          placeholder="Ada Lovelace"
          error={errors.fullName}
        />
      ) : null}

      {mode !== "forgot" ? (
        <>
          <PasswordField
            label="Password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "login" ? 1 : 8}
            maxLength={200}
            value={withPasswordHints ? passwordValue : undefined}
            onChange={
              withPasswordHints
                ? (event) => setPasswordValue(event.target.value)
                : undefined
            }
            error={errors.password}
            action={
              mode === "login" ? (
                <Link href="/forgot-password" className={textButton}>
                  Forgot password?
                </Link>
              ) : undefined
            }
          />
          {withPasswordHints ? <StrengthMeter value={passwordValue} /> : null}
        </>
      ) : null}

      {withPasswordHints ? (
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={200}
          error={errors.confirmPassword}
        />
      ) : null}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Please wait…
          </>
        ) : (
          SUBMIT_LABEL[mode]
        )}
      </button>
    </form>
  );
}
