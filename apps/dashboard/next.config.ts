import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Enable transpilation of workspace packages
  transpilePackages: ['@repo/database', '@repo/config', '@repo/types'],
};

export default withNextIntl(nextConfig);
