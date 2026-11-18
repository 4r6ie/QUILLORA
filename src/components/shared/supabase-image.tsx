import Image from "next/image";

import { supabaseImageLoader } from "@/lib/supabase/storage";

/**
 * Image component backed by Supabase Storage + next/image optimization.
 * `src` may be a storage path (`articles/cover.jpg`) or a full URL.
 */
export function SupabaseImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loader={supabaseImageLoader}
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}
