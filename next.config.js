/** @type {import('next').NextConfig} */

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://telegram.org;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.telegram.org https://*.yandex.net https://*.yandex.ru;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru;
  frame-ancestors 'self' https://telegram.org https://web.telegram.org https://*.telegram.org;
  worker-src 'self' blob:;
`.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_IS_PRODUCTION: process.env.NODE_ENV === "production" ? "true" : "false",
  },
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      {
        key: "Content-Security-Policy",
        value: cspHeader,
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/og-image.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/favicon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
