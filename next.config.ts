import type {NextConfig} from 'next';

// Deployment-aware base path (Step B).
// - GitHub Pages project site: built with NEXT_PUBLIC_BASE_PATH=/pdfly-app
//   (set by .github/workflows/deploy-pages.yml) -> https://pdfly-source.github.io/pdfly-app/
// - Local development / future custom domain: variable unset -> served from '/'
// The value is never hard-coded here, so switching to a custom domain later
// requires only a deployment environment change, no source rewrite.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  basePath,
  reactStrictMode: true,
  // Static export for GitHub Pages (Step A).
  // assetPrefix is intentionally NOT set: Next.js `basePath` already prefixes
  // all generated asset URLs (_next/*, metadata icons, manifest, etc.).
  // Verified in the build output - no double prefixes, no missing prefixes.
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    // Allow access to remote image placeholder.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: false,
  experimental: {
    devtoolSegmentExplorer: false,
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify: file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
