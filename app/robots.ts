import type { MetadataRoute } from "next";

const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://vibe.app";
const siteUrl = raw.startsWith("http") ? raw : `https://${raw}`;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/map", "/profile", "/login", "/api/", "/tg-debug"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
