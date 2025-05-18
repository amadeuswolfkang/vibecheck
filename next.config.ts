import type { NextConfig } from "next";
import type { WebpackConfigContext } from 'next/dist/server/config-shared';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config: any, { isServer }: WebpackConfigContext) => {
    if (!isServer) {
      // Client-side specific configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
        os: false,
        url: false,
        zlib: false,
        path: false,
        child_process: false
      };
    }
    return config;
  },
};

export default nextConfig;
