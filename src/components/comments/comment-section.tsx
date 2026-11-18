"use client";

import { useState, type FormEvent } from "react";

import { Avatar } from "@/components/shared/avatar";
import { formatDate } from "@/lib/utils";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  author: { username: string; fullName: string | null; avatarUrl: string | null } | null;
};

export function CommentForm({ articleId }: { articleId: string }) {
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "error"; message: string } | { kind: "ok"; message: string }
  >({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ kind: "idle" });
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, content, authorName }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
        retryAfterSeconds?: number;
      };
      if (!response.ok) {
        setStatus({
          kind: "error",
          message:
            response.status === 429
              ? `You are posting too quickly. Try again in ${body.retryAfterSeconds ?? 60}s.`
              : body.error ?? "Could not post your comment.",
        });
        return;
      }
      setStatus({
        kind: "ok",
        message:
          body.status === "pending"
            ? "Thanks — your comment is awaiting moderation."
            : "Comment published.",
      });
      setContent("");
    } catch {
      setStatus({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-serif text-lg font-semibold">Join the discussion</h3>
      <div>
        <label htmlFor="comment-name" className="text-xs font-medium text-muted">
          Name (optional)
        </label>
        <input
          id="comment-name"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </div>
      <div>
        <label htmlFor="comment-content" className="text-xs font-medium text-muted">
          Comment
        </label>
        <textarea
          id="comment-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          minLength={1}
          maxLength={2000}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </div>
      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-red-600">
          {status.message}
        </p>
      ) : null}
      {status.kind === "ok" ? (
        <p role="status" className="text-sm text-green-700">
          {status.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || content.trim().length === 0}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {submitting ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}

export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        No comments yet. Be the first to respond.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <Avatar
            name={comment.author?.fullName ?? comment.authorName}
            size={36}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold">
                {comment.author?.fullName ?? comment.authorName}
              </span>
              <time className="text-xs text-muted" dateTime={comment.createdAt}>
                {formatDate(comment.createdAt)}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {comment.content}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
