import { envPublic } from "@/lib/env-public";

/**
 * Supabase Storage + next/image helpers (requirement 9).
 *
 * Images are served from Supabase Storage and resized/rendered on the fly by
 * the Storage CDN (`/storage/v1/render/image/public/...`) with explicit width
 * and quality, then cached/optimized by next/image. This avoids shipping
 * multi-megabyte originals to the browser.
 */

const BUCKET = "media";

export function isSupabaseStoragePath(path: string): boolean {
  return /^[a-z0-9._-]+\/[^\s]+$/.test(path) && !path.startsWith("http");
}

/** Public (untransformed) object URL. */
export function storageObjectUrl(path: string, bucket: string = BUCKET): string {
  return `${envPublic.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export type StorageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "origin";
};

/** Storage CDN render URL: server-side resize + format conversion. */
export function storageRenderUrl(
  path: string,
  transform: StorageTransform = {},
  bucket: string = BUCKET,
): string {
  const params = new URLSearchParams();
  if (transform.width) params.set("width", String(transform.width));
  if (transform.height) params.set("height", String(transform.height));
  if (transform.quality) params.set("quality", String(transform.quality));
  if (transform.format && transform.format !== "origin") {
    params.set("format", transform.format);
  }
  const query = params.toString();
  const base = `${envPublic.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${path}`;
  return query ? `${base}?${query}` : base;
}

/**
 * next/image loader. `src` is a storage path like `articles/cover.jpg`; width
 * and quality are supplied by next/image.
 */
export function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // If a full URL was passed, let it through untouched.
  if (src.startsWith("http")) return src;
  return storageRenderUrl(src, {
    width,
    quality: quality ?? 75,
    format: "webp",
  });
}
