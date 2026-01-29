import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';
import path from 'path';
import { securityHeaders, apiSecurityHeaders } from './src/config/nextjs-security-headers-configuration';

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],

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

  // Security headers configuration
  async headers() {
    return [
      // Apply security headers to all pages
      {
        source: '/((?!api/).*)',
        headers: securityHeaders,
      },
      // Apply different headers to API routes
      {
        source: '/api/:path*',
        headers: apiSecurityHeaders,
      },
    ];
  },
};

export default withNextIntl(withMDX(nextConfig));
