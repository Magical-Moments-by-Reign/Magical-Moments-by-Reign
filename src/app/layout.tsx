import type { Metadata, Viewport } from "next";
import Providers from "@/components/cart/Providers";
import RegisterSW from "@/components/pwa/RegisterSW";
import AskMagical from "@/components/ai/AskMagical";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Magical Moments by Reign — Capture. Celebrate. Cherish Forever.",
    template: "%s · Magical Moments by Reign",
  },
  description:
    "One platform. Unlimited unique experiences. Magical Moments by Reign transforms life's biggest moments into beautiful, interactive keepsakes that grow with families over time.",
  keywords: [
    "digital keepsake", "wedding website", "celebration of life", "memorial website",
    "baby milestone site", "birthday experience", "vacation memories", "custom domain",
    "Magical Moments by Reign",
  ],
  applicationName: "Magical Moments by Reign",
  authors: [{ name: "Magical Moments by Reign" }],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Magical Moments",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/brand/favicon.png", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/icon-192.png" }],
  },
  openGraph: {
    title: "Magical Moments by Reign",
    description: "Capture. Celebrate. Cherish Forever.",
    url: SITE_URL,
    siteName: "Magical Moments by Reign",
    images: [{ url: "/brand/logo.png", width: 1200, height: 630, alt: "Magical Moments by Reign" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Magical Moments by Reign",
    description: "Capture. Celebrate. Cherish Forever.",
    images: ["/brand/logo.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#3f3424",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Magical Moments by Reign",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.png`,
  slogan: "Capture. Celebrate. Cherish Forever.",
  email: "info@magicalmomentsbyreign.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts for the platform chrome (experiences load their own). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=Pinyon+Script&family=Anton&display=swap"
          rel="stylesheet"
        />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <AskMagical />
        <RegisterSW />
      </body>
    </html>
  );
}
