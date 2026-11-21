"use client";

import { useState, type FormEvent } from "react";

import { updateProfile } from "@/features/auth/actions";
import { isRedirectDigest } from "@/lib/auth/redirects";

export function ProfileForm({
  initial,
}: {
  initial: { fullName: string; bio: string; avatarUrl: string };
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateProfile({ fullName, bio, avatarUrl });
      if ("error" in result) setError(result.error);
      else setMessage(result.message ?? "Profile updated.");
    } catch (caught) {
      if (isRedirectDigest(caught)) throw caught;
      setError("Could not save your profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <div className="space-y-1">
        <label htmlFor="fullName" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          maxLength={120}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          maxLength={500}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="avatarUrl" className="text-sm font-medium">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          maxLength={500}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
