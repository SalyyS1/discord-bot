import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Temporarily ignore ESLint during builds while fixing lint errors
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Enable transpilation of workspace packages
  transpilePackages: ['@repo/database', '@repo/config', '@repo/types'],

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
};

export default withNextIntl(nextConfig);
