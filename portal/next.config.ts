import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow GitHub avatar images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
}

export default nextConfig
