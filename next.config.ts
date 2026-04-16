import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment (copies only the files needed to run).
  output: "standalone",
  // Emit source maps in production builds so stack traces point to original TS source.
  productionBrowserSourceMaps: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
