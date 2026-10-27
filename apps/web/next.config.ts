import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The monorepo root, so a second lockfile higher up (e.g. a git worktree
  // checkout) is never mistaken for the workspace.
  turbopack: { root: path.join(__dirname, '../..') },
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
