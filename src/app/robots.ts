import type { MetadataRoute } from "next";

import { envPublic } from "@/lib/env-public";

export default function robots(): MetadataRoute.Robots {
  const base = envPublic.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
