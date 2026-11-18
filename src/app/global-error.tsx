"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app] global error", error?.digest ?? error?.message);
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
        <h1 className="font-serif text-3xl font-bold">QUILLORA</h1>
        <p className="max-w-md text-muted">
          A serious error occurred while rendering the page. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
