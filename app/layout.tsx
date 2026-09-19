import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { FontLoader } from './font-loader';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://fonts.wptea.com'),
  title: {
    default: '文风字库',
    template: '%s | 文风字库',
  },
  description: '专业的在线字体 CDN 平台，海量字体资源，一行代码即可集成',
  keywords: ['字体', '字体管理', 'Font Management', 'Typography', 'Web Fonts'],
  authors: [{ name: '文风字库' }],
  creator: '文风字库',
  publisher: '文风字库',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.webp', type: 'image/webp', sizes: '512x512' },
      { url: '/icon.jpg', type: 'image/jpeg', sizes: '512x512' },
    ],
    apple: [{ url: '/icon.webp', sizes: '180x180', type: 'image/webp' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    title: '文风字库',
    description: '专业的在线字体 CDN 平台，海量字体资源，一行代码即可集成',
    siteName: '文风字库',
    images: [
      {
        url: '/icon.webp',
        width: 512,
        height: 512,
        alt: '文风字库',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '文风字库',
    description: '专业的在线字体 CDN 平台，海量字体资源，一行代码即可集成',
    images: ['/icon.webp'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="overscroll-none" suppressHydrationWarning>
      <body className="touch-pan-y overscroll-none antialiased font-['windfonts-hclcks',_sans-serif]">
        <FontLoader />
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
