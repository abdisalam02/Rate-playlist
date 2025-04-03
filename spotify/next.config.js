/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'blend-playlist-covers.spotifycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wrapped-images.spotifycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-ak.spotifycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'charts-images.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thisis-images.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lineup-images.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'seeded-session-images.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'daily-mix.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-fa.spotifycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Added for staple mood images
      {
        protocol: 'https',
        hostname: 'as1.ftcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i1.sndcdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'getdrawings.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static01.nyt.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-images.dzcdn.net',
        port: '',
        pathname: '/images/**',
      },
      // Add Pravatar for placeholder user images
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**', // Allow any path
      },
    ]
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        // Rewrites for Spotify API
        {
          source: '/api/spotify/direct/:path*',
          destination: 'https://api.spotify.com/:path*',
        },
        // For image fetching from Spotify CDN
        {
          source: '/_next/image',
          has: [
            {
              type: 'host',
              value: 'localhost:3000',
            },
          ],
          destination: 'http://localhost:3001/_next/image',
        },
        {
          source: '/_next/image',
          has: [
            {
              type: 'host',
              value: 'localhost:3002',
            },
          ],
          destination: 'http://localhost:3001/_next/image',
        },
        {
          source: '/_next/image',
          has: [
            {
              type: 'host',
              value: 'localhost:3003',
            },
          ],
          destination: 'http://localhost:3001/_next/image',
        },
        {
          source: '/_next/image',
          has: [
            {
              type: 'host',
              value: 'localhost:3004',
            },
          ],
          destination: 'http://localhost:3001/_next/image',
        },
        // For API routes when running on different ports
        {
          source: '/api/:path*',
          has: [
            {
              type: 'host',
              value: 'localhost:3000',
            },
          ],
          destination: 'http://localhost:3001/api/:path*',
        },
        {
          source: '/api/:path*',
          has: [
            {
              type: 'host',
              value: 'localhost:3002',
            },
          ],
          destination: 'http://localhost:3001/api/:path*',
        },
        {
          source: '/api/:path*',
          has: [
            {
              type: 'host',
              value: 'localhost:3003',
            },
          ],
          destination: 'http://localhost:3001/api/:path*',
        },
        {
          source: '/api/:path*',
          has: [
            {
              type: 'host',
              value: 'localhost:3004',
            },
          ],
          destination: 'http://localhost:3001/api/:path*',
        },
      ],
    };
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    return config;
  },
};

module.exports = nextConfig; 