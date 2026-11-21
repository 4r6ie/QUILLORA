"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createArticle, updateArticle } from "@/features/articles/mutations";
import { slugify } from "@/lib/utils";

type Category = { id: string; name: string };

type Initial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  categoryId: string | null;
  tags: { slug: string; name: string }[];
  status: "draft" | "in_review" | "published" | "archived";
};

export function ArticleEditor({
  categories,
  initial,
  canPublish,
}: {
  categories: Category[];
  initial?: Initial;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tags, setTags] = useState(initial?.tags.map((tag) => tag.slug).join(", ") ?? "");
  const [status, setStatus] = useState<
    "draft" | "in_review" | "published" | "archived"
  >(initial?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const payload = {
      title,
      slug: slug || slugify(title),
      excerpt,
      content,
      coverImageUrl: coverImageUrl || null,
      categoryId: categoryId || null,
      tagSlugs: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status,
    };

    try {
      const result = initial
        ? await updateArticle(initial.id, payload)
        : await createArticle(payload);
      router.push("/dashboard");
      router.refresh();
      void result;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not save the story.";
      setError(message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug <span className="text-muted">(optional)</span>
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder={slugify(title) || "my-story"}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="excerpt" className="text-sm font-medium">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          rows={2}
          maxLength={400}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="content" className="text-sm font-medium">
          Content (HTML or Markdown-ish)
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          rows={14}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 font-mono text-sm outline-none focus:border-accent-strong"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="cover" className="text-sm font-medium">
            Cover image path or URL
          </label>
          <input
            id="cover"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
            placeholder="articles/cover.jpg"
            className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
          />
          <p className="text-xs text-muted">
            Stored in Supabase Storage, served through next/image.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="tags" className="text-sm font-medium">
          Tags <span className="text-muted">(comma separated)</span>
        </label>
        <input
          id="tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="engineering, performance"
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="w-full rounded-lg border border-border-strong bg-field px-3 py-2 text-sm outline-none focus:border-accent-strong"
        >
          <option value="draft">Draft</option>
          <option value="in_review">Submit for review</option>
          <option value="archived">Archived</option>
          {canPublish ? <option value="published">Publish</option> : null}
        </select>
        {!canPublish ? (
          <p className="text-xs text-muted">
            Authors cannot self-publish; an editor will review your submission.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save changes" : "Create story"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-surface"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
