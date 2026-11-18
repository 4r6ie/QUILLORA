import { initials } from "@/lib/utils";

export function Avatar({
  name,
  fallback,
  size = 36,
}: {
  name: string | null | undefined;
  fallback?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent-strong"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name, fallback)}
    </span>
  );
}
