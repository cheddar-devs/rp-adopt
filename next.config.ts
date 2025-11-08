import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: { typedRoutes: true },
  reactCompiler: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
