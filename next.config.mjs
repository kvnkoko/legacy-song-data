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
  // Configure webpack to handle sharp properly
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark sharp as external for server-side (it will be bundled but not resolved at build time)
      config.externals = config.externals || []
      config.externals.push({
        'sharp': 'commonjs sharp',
      })
    }
    return config
  },
}

export default nextConfig


