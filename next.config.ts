import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      // App shell — HTML pages (NetworkFirst so fresh content is preferred)
      {
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === "navigate",
        handler: "NetworkFirst" as const,
        options: {
          cacheName: "pages-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      // Static assets — CacheFirst for fast loads
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "static-assets-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (hashed filenames)
          },
        },
      },
      // Images — CacheFirst with 30-day expiration
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "images-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // Google Fonts stylesheets
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "google-fonts-stylesheets",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // Google Fonts webfont files
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      // Three.js assets (GLTF, textures, etc.)
      {
        urlPattern: /\.(?:gltf|glb|bin|hdr|exr|ktx2)$/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "threejs-assets-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // API routes — NetworkOnly (don't cache authenticated calls)
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkOnly" as const,
        options: {
          cacheName: "api-cache",
        },
      },
      // Supabase auth — NetworkOnly (never cache auth flows)
      {
        urlPattern: /\/auth\/.*/i,
        handler: "NetworkOnly" as const,
        options: {
          cacheName: "auth-cache",
        },
      },
      // Supabase API calls — NetworkOnly
      {
        urlPattern: /\.supabase\.co\/.*/i,
        handler: "NetworkOnly" as const,
        options: {
          cacheName: "supabase-cache",
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Ensure Three.js works properly
  transpilePackages: ["three"],

  // Allow loading images from external sources (for memory URLs)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Static export doesn't support Next.js Image optimization
    ...(isCapacitorBuild && { unoptimized: true }),
  },

  // Empty turbopack config to allow coexistence with webpack plugins (next-pwa)
  turbopack: {},

  // Static export for Capacitor native builds
  ...(isCapacitorBuild && { output: "export" as const }),
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// PWA wrapper uses webpack plugin — works fine on production builds (webpack)
// but skip for Capacitor (static export handles its own assets)
const finalConfig = isCapacitorBuild ? nextConfig : withPWA(nextConfig);
export default withNextIntl(finalConfig);
