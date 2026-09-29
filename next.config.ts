import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sample catalog imagery (src/lib/catalog.ts).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
