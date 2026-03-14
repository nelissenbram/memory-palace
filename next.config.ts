import type { NextConfig } from "next";

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
  },
};

export default nextConfig;
