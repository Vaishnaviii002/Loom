import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@shipflow/db",
    "@shipflow/trpc",
    "@shipflow/ai",
    "@shipflow/inngest",
    "@shipflow/github",
  ],
};

export default nextConfig;