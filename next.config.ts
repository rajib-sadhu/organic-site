import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seed catalog images. Admin uploads are local (/uploads/...) and need no entry.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
};

export default nextConfig;
