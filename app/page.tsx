// ============================================
// app/page.tsx — 메인 페이지
// useSearchParams()는 Next.js 규칙상 반드시 Suspense로 감싸야 함
// ============================================
'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatWindow from '@/components/ChatWindow';
import ConsultationModal from '@/components/ConsultationModal';

// ── useSearchParams를 사용하는 내부 컴포넌트 (Suspense 필수) ──
function HomeContent() {
  const searchParams = useSearchParams();
  // ?consultation=open URL 파라미터가 있으면 모달 자동 오픈
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('consultation') === 'open') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      {/* 메인 채팅창 */}
      <ChatWindow />

      {/* 정책 상담 신청 모달 */}
      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

// ── 메인 페이지 (HomeContent를 Suspense로 감쌈) ──
export default function Home() {
  return (
    <main className="page-wrapper">
      {/* 배경 장식 요소 */}
      <div className="bg-decoration" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Suspense: useSearchParams() 사용 시 Next.js 필수 요구사항 */}
      <Suspense fallback={null}>
        <HomeContent />
      </Suspense>
    </main>
  );
}
