import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This will allow production builds to complete even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  /* config options here */
};

export default nextConfig;
