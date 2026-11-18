"use client";

import { useState, type FormEvent } from "react";

import {
  forgotPassword,
  login,
  register,
  resetPassword,
} from "@/features/auth/actions";

type Mode = "login" | "register" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      username: String(form.get("username") ?? ""),
      fullName: String(form.get("fullName") ?? ""),
    };

    try {
      const result =
        mode === "login"
          ? await login(payload)
          : mode === "register"
            ? await register(payload)
            : mode === "forgot"
              ? await forgotPassword({ email: payload.email })
              : await resetPassword({ password: payload.password });

      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("message" in result && result.message) {
        setNotice(result.message);
      }
    } catch (caught) {
      // redirect() throws NEXT_REDIRECT on success; anything else is a real error.
      if ((caught as { digest?: string })?.digest === "NEXT_REDIRECT") throw caught;
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <div>
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={40}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
      ) : null}

      {mode !== "reset" ? (
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
      ) : null}

      {mode === "register" ? (
        <div>
          <label htmlFor="fullName" className="text-sm font-medium">
            Display name (optional)
          </label>
          <input
            id="fullName"
            name="fullName"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
      ) : null}

      {mode !== "forgot" ? (
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "register" || mode === "reset" ? 8 : 1}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Update password"}
      </button>
    </form>
  );
}
