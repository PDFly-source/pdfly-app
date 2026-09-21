import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  // Static export for GitHub Pages (Step A).
  // basePath/assetPrefix are intentionally NOT set yet; deployment-aware
  // basePath will be added in a separate later step.
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
