import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TelegramInitProvider } from "@/components/providers/TelegramInitProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vibe.app";
const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

export const metadata: Metadata = {
  title: "VIBE — найди свою тусовку за 5 минут",
  description:
    "Геосоциальная сеть реального времени. Находи крутые тусовки и знакомься с людьми рядом через Telegram.",
  keywords: ["геосоциальная сеть", "тусовки", "telegram mini app", "вайб", "знакомства", "поблизости"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "VIBE — найди свою тусовку за 5 минут",
    description: "Находи крутые тусовки и знакомься с людьми рядом через Telegram.",
    url: siteUrl,
    siteName: "VIBE",
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "VIBE — найди свой вайб",
    description: "Находи тусовки рядом за 5 минут.",
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
  description: "Геосоциальная сеть реального времени. Найди свою тусовку за 5 минут.",
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
    <html lang="ru" className={`dark ${inter.variable}`} suppressHydrationWarning>
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
      <body className="font-sans">
        <TelegramInitProvider>{children}</TelegramInitProvider>
      </body>
    </html>
  );
}
