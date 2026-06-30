import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@shipflow/db",
    "@shipflow/trpc",
    "@shipflow/ai",
    "@shipflow/ingest",
    "@shipflow/github",
  ],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;