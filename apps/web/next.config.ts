import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/haircuts', destination: '/studio', permanent: true }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.run' },
      { protocol: 'https', hostname: '**.fal.ai' },
    ],
  },
};

export default nextConfig;
