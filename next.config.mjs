/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
