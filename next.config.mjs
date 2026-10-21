/** @type {import('next').NextConfig} */

// Production-only Content Security Policy. Next.js needs inline scripts for hydration;
// images come from Qloo's CDN (https), fonts from Google Fonts. The app calls only its own API;
// the only embedded frame is Spotify's player.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https: data:",
  "connect-src 'self'",
  // Spotify's player, embedded on music picks.
  "frame-src https://open.spotify.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [
      { source: '/(.*)', headers: [...securityHeaders, { key: 'Content-Security-Policy', value: csp }] },
      { source: '/api/:path((?!img).*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] }
    ];
  },
  experimental: {
    // Enables instrumentation.ts (keeps the free Render service awake).
    instrumentationHook: true,
    // Ship captured Qloo responses with the API routes so they work after deploying.
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/qloo-fixtures/**/*']
    }
  }
};

export default nextConfig;
