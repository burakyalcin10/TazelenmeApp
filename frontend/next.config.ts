import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output only for Docker; Vercel handles it natively
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
