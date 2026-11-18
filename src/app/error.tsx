"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Never leak internal error text to visitors.
  console.error("[app] route error", error?.digest ?? error?.message);
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="font-serif text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-muted">
        The page could not be loaded. Your data is safe — this is a display
        problem on our side.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
