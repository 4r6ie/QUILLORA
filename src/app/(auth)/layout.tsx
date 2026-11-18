export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-surface p-8">
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Auth pages are never cached or stored by CDNs or browsers.
        </p>
      </div>
    </div>
  );
}
