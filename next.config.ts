import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 禁用 Turbopack (在中文路径下有 bug)
  // https://github.com/vercel/next.js/issues
  experimental: {
    // 使用 Webpack 而不是 Turbopack
  },
};

export default nextConfig;
