import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trails',
  description: 'LifeOS - Personal Log and Bucket List',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trails',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // モバイルアプリのような操作感にするためズームを無効化
  themeColor: '#f3f4f6', // bg-gray-100の色
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.className} bg-gray-100 text-gray-900 antialiased overscroll-none`}
      >
        {children}
      </body>
    </html>
  );
}
