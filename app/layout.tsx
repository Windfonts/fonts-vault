import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: '文风字库 - Font Management System',
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
    <html lang="zh-CN" className="overscroll-none">
      <body
        className={`${geistSans.variable} ${geistMono.variable} touch-pan-y overscroll-none antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
