export interface SecurityHeader {
  key: string;
  value: string;
}

const isDev = process.env.NODE_ENV === 'development';

// Content Security Policy directives
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    isDev ? "'unsafe-eval'" : '',
    "'unsafe-inline'", // Required for Next.js
  ].filter(Boolean),
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind/CSS-in-JS
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://cdn.discordapp.com',
    'https://*.discordapp.com',
    'https://i.imgur.com',
  ],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://discord.com',
    'https://*.discord.com',
    process.env.MANAGER_API_URL || 'http://localhost:3001',
  ],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
};

function buildCsp(): string {
  return Object.entries(cspDirectives)
    .filter(([, values]) => values.length > 0)
    .map(([directive, values]) => {
      const valueStr = values.filter(Boolean).join(' ');
      return valueStr ? `${directive} ${valueStr}` : directive;
    })
    .join('; ');
}

export const securityHeaders: SecurityHeader[] = [
  {
    key: 'Content-Security-Policy',
    value: buildCsp(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  ...(isDev ? [] : [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  }]),
];

export const apiSecurityHeaders: SecurityHeader[] = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Cache-Control',
    value: 'no-store, max-age=0',
  },
];
