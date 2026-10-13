/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Ship captured Qloo responses with the API routes so they work after deploying.
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/qloo-fixtures/**/*']
    }
  }
};

export default nextConfig;
