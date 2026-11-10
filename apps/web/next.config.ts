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
};

export default nextConfig;

