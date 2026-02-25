// 공통 레이아웃 + 하단 탭 네비게이션
import type { Metadata, Viewport } from 'next';
import './globals.css';
import TabNavigation from '@/components/TabNavigation';

export const metadata: Metadata = {
  title: 'CCFM 면담 관리',
  description: '면담 녹음 · AI 요약 · 자동 기록',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen">
        <main className="pb-20 max-w-lg mx-auto">
          {children}
        </main>
        <TabNavigation />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
