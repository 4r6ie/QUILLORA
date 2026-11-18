export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Auth shell.
 *
 * Deliberately not full-bleed: the root layout owns the site header/footer, so
 * this only has to make the card feel like warm paper on a nude canvas.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate grid min-h-[calc(100svh-4rem)] place-items-center overflow-hidden px-4 py-12 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(187,120,102,0.16),transparent_60%)]"
      />

      <div className="w-full max-w-[26rem]">
        <p className="mb-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-accent-strong">
          Quillora account
        </p>

        <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-7 shadow-[0_30px_60px_-34px_rgba(94,75,66,0.45)] sm:p-9">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#bb7866,transparent)]"
          />
          {children}
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          Encrypted in transit · We never store or display your password.
        </p>
      </div>
    </div>
  );
}
