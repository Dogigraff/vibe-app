import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/map", "/profile", "/login", "/api/", "/tg-debug"],
    },
    sitemap: "https://vibeapp.ru/sitemap.xml",
  };
}
