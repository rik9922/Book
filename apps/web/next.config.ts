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
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: http://127.0.0.1:* http://localhost:* https:",
      "media-src 'self' data: blob: http://127.0.0.1:* http://localhost:* https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' http://127.0.0.1:* http://localhost:* https: ws: wss:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
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

