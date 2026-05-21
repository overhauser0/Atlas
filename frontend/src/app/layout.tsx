import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Gleis WorkOS',
  description: 'Noir Glass Personal Dashboard',
  appleWebApp: {
    capable: true,
    title: 'Gleis',
    statusBarStyle: 'black-translucent', // 'black' / 'black-translucent' ※ステータスバーがアプリの上に被さる（透明になる）ため、画面上部に少しパディングが必要になる場合があります
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
