import type { Metadata } from "next";
import { TelegramInitProvider } from "@/components/providers/TelegramInitProvider";
import "./globals.css";

const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vibe.app";
const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

export const metadata: Metadata = {
  title: "VIBE — Find Your Vibe in 5 Minutes",
  description:
    "Real-time geo-social network. Meet people around you in 5 minutes via Telegram.",
  keywords: ["geo social", "meet people", "telegram app", "vibe", "nearby", "real-time"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "VIBE — Find Your Vibe in 5 Minutes",
    description: "Meet people around you in 5 minutes. Real-time geo-social network.",
    url: siteUrl,
    siteName: "VIBE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIBE — Find Your Vibe",
    description: "Meet people around you in 5 minutes.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VIBE",
  description: "Real-time geo-social network. Find your vibe in 5 minutes.",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          async
          defer
        />
      </head>
      <body>
        <TelegramInitProvider>{children}</TelegramInitProvider>
      </body>
    </html>
  );
}
