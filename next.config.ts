import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack 配置 (Next.js 16 默认使用 Turbopack)
  turbopack: {},

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.aliyuncs.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname:
          process.env.NEXT_PUBLIC_FONT_STATIC_URL?.replace('https://', '') ||
          'wenfeng-fonts.oss-cn-guangzhou.aliyuncs.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['@/components/ui', 'lucide-react'],
  },

  // 编译优化
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // 性能优化
  poweredByHeader: false,
  compress: true,

  // Docker 部署配置
  output: 'standalone',

  serverExternalPackages: ['wawoff2'],

  // 静态资源缓存
  async headers() {
    return [
      {
        source: '/login',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache-Control 仅由 route.ts 在 200/304 设置；勿在此对 /api/css 统一 s-maxage（会钉死 4xx/5xx）。
    ];
  },
};

export default nextConfig;
