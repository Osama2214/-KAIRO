import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // A production build normally overwrites the same `.next` the dev server is
  // reading from, which knocks it over mid-session. Pointing a build somewhere
  // else lets us measure bundle sizes while `next dev` keeps running:
  //   KAIRO_DIST_DIR=.next-analyze npx next build
  distDir: process.env.KAIRO_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "dw9to29mmj727.cloudfront.net", pathname: "/products/**" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com", pathname: "/images/**" },
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/file/anilistcdn/media/**" },
      { protocol: "https", hostname: "uploads.mangadex.org", pathname: "/covers/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Cloudflare R2: the bucket's own r2.dev subdomain and any custom domain.
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      ...(process.env.R2_PUBLIC_HOSTNAME
        ? [{ protocol: "https" as const, hostname: process.env.R2_PUBLIC_HOSTNAME, pathname: "/**" }]
        : []),
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 2_592_000,
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
