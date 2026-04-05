/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "modelslab.com",
      },
      {
        protocol: "https",
        hostname: "pub-3626123a908346a7a8be8d9295f44e26.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.modelslab.com",
      },
    ],
  },
  // Allow cross-origin for kiosk/Raspberry Pi deployments
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Permissions-Policy", value: "camera=*" }],
      },
    ];
  },
};

export default nextConfig;
