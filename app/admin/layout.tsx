// ============================================================
// app/admin/layout.tsx
// 관리자 전용 레이아웃 (심플 흰 배경, 청춘스럽 헤더)
// ============================================================
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관리자 대시보드 | 청춘스럽 정책상담 매칭 시스템',
  // 검색 엔진에 노출되지 않도록 설정
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Noto Sans KR', -apple-system, sans-serif;
            background: #F1F5F9;
            color: #1E2538;
            min-height: 100vh;
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
