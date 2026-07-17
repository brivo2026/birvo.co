import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@birvo/ui', '@birvo/contracts'],
  reactStrictMode: true,
};

export default nextConfig;
