import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@referee/shared"],
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
