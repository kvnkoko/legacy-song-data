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
  // Configure webpack to not resolve sharp at build time
  webpack: (config, { isServer }) => {
    if (isServer) {
      // For server-side, don't try to resolve sharp at build time
      // It will be available at runtime from node_modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        sharp: false,
      }
    }
    return config
  },
}

export default nextConfig


