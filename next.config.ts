import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  typescript: { tsconfigPath: "tsconfig.web.json" },
};

export default nextConfig;
