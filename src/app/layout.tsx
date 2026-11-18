import type { Metadata } from "next";
import "./globals.css";

import { envPublic } from "@/lib/env-public";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  metadataBase: new URL(envPublic.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${envPublic.NEXT_PUBLIC_APP_NAME} — Stories that matter`,
    template: `%s · ${envPublic.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    "QUILLORA is a digital publishing platform for independent writers and editors.",
  openGraph: {
    siteName: envPublic.NEXT_PUBLIC_APP_NAME,
    type: "website",
    url: envPublic.NEXT_PUBLIC_SITE_URL,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
