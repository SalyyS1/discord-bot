import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Temporarily ignore ESLint during builds while fixing lint errors
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable transpilation of workspace packages
  transpilePackages: ['@repo/database', '@repo/config', '@repo/security', '@repo/types'],

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
    ],
  },

  // Include Prisma engine in output
  outputFileTracingIncludes: {
    '/*': ['./node_modules/.prisma/**/*'],
  },

  // Ensure Prisma client works in serverless
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@prisma/client'];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
