// ============================================
// app/layout.tsx — 청춘스럽 정책안내 AI봇 루트 레이아웃
// 브랜드: 대전서구 청년공간 청춘스럽 | 딥블루 #1B2A80
// ============================================
import type { Metadata } from 'next';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://youth-policy-bot.vercel.app'),
  title: '청춘스럽 정책안내 AI봇 | 대전 청년정책 안내',
  description:
    '대전서구 청년공간 청춘스럽의 청년정책 전문 AI 안내봇. 일자리, 주거, 금융, 창업, 복지, 대전 10개 청년공간 정보를 빠르고 정확하게 안내해 드립니다.',
  keywords: ['청춘스럽', '대전청년정책', '청년공간', 'AI챗봇', '일자리', '주거지원', '청년지원', '대전서구'],
  openGraph: {
    title: '청춘스럽 정책안내 AI봇',
    description: '대전 청년들을 위한 일자리·주거·복지·청년공간 정책 전문 AI 안내봇',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: '대전서구 청년공간 청춘스럽 정책안내 AI봇',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청춘스럽 정책안내 AI봇',
    description: '대전 청년들을 위한 일자리·주거·복지·청년공간 정책 전문 AI 안내봇',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google Fonts - Noto Sans KR (한국어 최적화 폰트) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
