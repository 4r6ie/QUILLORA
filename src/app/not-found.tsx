import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent-strong">
        404
      </p>
      <h1 className="font-serif text-4xl font-bold">Page not found</h1>
      <p className="max-w-md text-muted">
        The story you were looking for may have been moved, unpublished, or
        never existed.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
      >
        Back to the front page
      </Link>
    </div>
  );
}
