// next.config.mjs
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

const pwaConfig = withPWA({
  dest: 'public', // Output directory for the service worker
  register: true, // Register the service worker
  skipWaiting: true, // Activate the service worker immediately
  // disable: process.env.NODE_ENV === 'development', // Optional: disable PWA in dev
})(nextConfig);

export default pwaConfig;