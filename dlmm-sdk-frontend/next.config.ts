import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@saros-finance/dlmm-sdk",
  ],
  experimental: {
    esmExternals: "loose",
  },
};

export default nextConfig;
