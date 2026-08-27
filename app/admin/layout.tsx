// ============================================================
// app/admin/layout.tsx
// 관리자 전용 레이아웃
// ============================================================
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관리자 대시보드 | 청춘스럽 정책상담 매칭 시스템',
  robots: { index: false, follow: false },
};

// 모바일 viewport 설정 - 이게 없으면 모바일에서 데스크톱 크기로 렌더링됨
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html {
            /* 모바일 브라우저의 텍스트 자동 확대 방지 */
            -webkit-text-size-adjust: 100%;
          }
          body {
            font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Malgun Gothic', sans-serif;
            background: #F8FAFC;
            color: #0F172A;
            min-height: 100vh;
            /* 핵심: body 자체가 스크롤 가능하도록 */
            overflow-y: auto;
            overflow-x: hidden;
          }
          input, select, textarea, button {
            font-family: inherit;
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
