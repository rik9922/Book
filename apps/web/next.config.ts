import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@memory-capsule/contracts",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "three-stdlib",
  ],
  reactStrictMode: true,
  async rewrites() {
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:4000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${gatewayUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

