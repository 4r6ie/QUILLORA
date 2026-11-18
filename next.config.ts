import type { NextConfig } from "next";

/**
 * QUILLORA next.config
 *
 * Caching model: the classic App Router model (`cacheComponents` disabled).
 * Public, published content is prerendered / ISR-cached and tagged for
 * on-demand revalidation. Private routes are explicitly marked
 * `force-dynamic` + `fetchCache = "force-no-store"` in their route modules and
 * are additionally fenced off here with `Cache-Control: private, no-store`
 * response headers so no CDN or browser can ever cache them.
 */
const nextConfig: NextConfig = {
  // Cache Components ("use cache") is intentionally disabled: QUILLORA uses
  // ISR + unstable_cache + revalidateTag, which is the model this design targets.
  cacheComponents: false,
  partialPrefetching: false,

  // Never send X-Powered-By.
  poweredByHeader: false,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Supabase Storage (cloud + local CLI stack).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Security headers applied to every response.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // NEVER cache private / authenticated / personal / admin surfaces.
        // `/auth/*` is included because callback/confirm must never be replayed
        // from a cache.
        source:
          "/(dashboard|admin|profile|account|settings|auth|api/auth|api/account|api/admin)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source:
          "/(login|register|forgot-password|reset-password|signin|signup)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Public, cacheable static assets.
        source: "/(static|_next/static|favicon.ico|icons|images)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
