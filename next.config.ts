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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: ${supabaseUrl} https://*.supabase.co https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com https://upload.wikimedia.org`,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${supabaseUrl} https://*.supabase.co https://*.r2.cloudflarestorage.com https://api.anthropic.com https://nominatim.openstreetmap.org https://upload.wikimedia.org`,
  `media-src 'self' blob: ${supabaseUrl} https://*.supabase.co https://*.r2.cloudflarestorage.com`,
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
        ],
      },
    ];
  },

  // Ensure Three.js works properly
  transpilePackages: ["three"],

  // Allow loading images from specific trusted origins only
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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
