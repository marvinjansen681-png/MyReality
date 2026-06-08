const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
      }
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 }
      }
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    }
  ]
})

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isCapacitorBuild ? 'export' : undefined,
}

module.exports = withPWA(nextConfig)
