/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Use IPv4 only to avoid permission issues
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Don't fail build on ESLint errors (warnings are okay)
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Don't fail build on TypeScript errors (if any)
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig


