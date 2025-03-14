/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'mosaic.scdn.co',
      'i.scdn.co',
      'platform-lookaside.fbsbx.com',
      'seeded-session-images.scdn.co',
      'dailymix-images.scdn.co',
      'lineup-images.scdn.co',
      'thisis-images.scdn.co',
      'image-cdn-ak.spotifycdn.com',
      'image-cdn-fa.spotifycdn.com'
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 