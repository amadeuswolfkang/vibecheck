// Production origin for CORS. On Vercel, VERCEL_PROJECT_PRODUCTION_URL is the stable
// production host (e.g. vibecheck.vercel.app or a custom domain); ALLOWED_ORIGINS
// overrides it explicitly if ever needed.
const productionOrigin =
  process.env.ALLOWED_ORIGINS ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply CORS headers to API routes
        source: '/api/:path*',
        headers: [
          {
            // Only allow specific origins in production
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' ? productionOrigin : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            // Allow credentials (cookies, authorization headers)
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            // Cache CORS preflight requests
            key: 'Access-Control-Max-Age',
            value: '86400' // 24 hours
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 