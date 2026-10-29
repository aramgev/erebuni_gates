/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow a production check to use its own output while a preview is open.
  distDir: process.env.EREBUNI_BUILD_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
