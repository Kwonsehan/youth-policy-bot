// ============================================
// app/layout.tsx — 루트 레이아웃
// ============================================
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // 메타데이터 및 OpenGraph 이미지의 기본 URL 설정
  metadataBase: new URL('https://helproomz-bot.vercel.app'),
  title: "도와줘룸즈 AI챗봇 '루미' | 청년을 위한 맞춤 주거·정책 안내",
  description:
    "도와줘룸즈 AI챗봇 '루미' 서비스. 청년을 위한 맞춤 주거, 일자리, 금융, 복지 정책을 쉽고 빠르게 확인하세요.",
  keywords: ['도와줘룸즈', '루미', '청년주거', '청년정책', 'AI챗봇', '주거지원', '청년지원'],
  openGraph: {
    title: "도와줘룸즈 AI챗봇 '루미'",
    description: '청년들의 주거·정책 고민을 해결하는 도와줘룸즈 맞춤 AI 안내봇',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
        alt: "도와줘룸즈 AI챗봇 '루미' 대표 이미지",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "도와줘룸즈 AI챗봇 '루미'",
    description: '청년들의 주거·정책 고민을 해결하는 도와줘룸즈 맞춤 AI 안내봇',
    images: ['/og-image.png'],
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
        {/* Google Fonts - Pretendard (한국어 최적화 폰트) */}
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

