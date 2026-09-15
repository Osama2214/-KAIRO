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
    // The deployment's image transformation endpoint can return 402 when its
    // quota is exhausted. Serve the already-compressed WebP/AVIF files
    // directly instead of routing every image through /_next/image, so the
    // storefront keeps showing artwork even when that service is unavailable.
    unoptimized: true,
    // Only hosts the catalogue actually serves from. Each extra entry is a
    // host anyone can make this optimiser fetch and cache on our bill, and
    // every image in the shop now lives in our own R2 bucket.
    remotePatterns: [
      // Cloudflare R2: the bucket's own r2.dev subdomain and any custom domain.
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
      // The store's own media domain, in front of its R2 bucket.
      { protocol: "https", hostname: "media.animeverse-store.com", pathname: "/**" },
      ...(process.env.R2_PUBLIC_HOSTNAME
        ? [{ protocol: "https" as const, hostname: process.env.R2_PUBLIC_HOSTNAME, pathname: "/**" }]
        : []),
    ],
    formats: ["image/webp"],
    // Next's steps jump from 384px straight to 640px, so a cover or intro layer
    // drawn ~260-300px wide on a phone (≈450-520px at its pixel density) was
    // sent at 640px. The in-between steps let it get a file its own size.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480, 560],
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
