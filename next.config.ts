import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "mammoth"],
  experimental: {
    // Resume uploads go through server actions, which default to a 1 MB limit.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
