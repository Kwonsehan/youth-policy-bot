'use client';
// ============================================
// components/MessageBubble.tsx
// 청춘스럽 정책안내 AI봇 전용 말풍선 컴포넌트
// - 🎲 랜덤 추천 정책 카드 1개 표시
// - 🔄 새로고침 이모지 버튼 클릭 시 다른 정책으로 랜덤 교체
// ============================================

import { useState } from 'react';
import PolicyCard from './PolicyCard';
import { Policy } from '@/lib/supabase';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  policies?: Policy[];
  isStreaming?: boolean;
  isCustomFiltered?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

// 텍스트 내 마크다운 링크 파싱 처리
function formatContent(text: string) {
  if (!text) return null;

  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-link"
      >
        {label}
      </a>
    );
    lastIndex = markdownLinkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.length > 0 ? parts : text}
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // 랜덤 추천 정책 새로고침을 위한 로컬 인덱스 상태
  // message.policies 배열에서 currentIndex 번째 정책을 보여줌
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔄 버튼 클릭 시: 현재와 다른 랜덤 인덱스로 교체
  const handleRefreshPolicy = () => {
    if (!message.policies || message.policies.length <= 1) return;
    let nextIndex = currentIndex;
    // 현재 인덱스와 다른 랜덤 인덱스 선택
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * message.policies.length);
    }
    setCurrentIndex(nextIndex);
  };

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-assistant'}`}>
      {/* 아바타 */}
      <div className={`avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        {isUser ? (
          '👤'
        ) : (
          <img src="/logo.png?v=3000" alt="청춘스럽 로고" className="avatar-ai-img" />
        )}
      </div>

      <div className="message-content-area">
        {/* 대화 말풍선 */}
        <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
          {/* AI 응답 스트리밍 전 바운싱 로딩 표시 */}
          {!isUser && !message.content && message.isStreaming ? (
            <div className="ai-loading-container">
              <span className="loading-text">정책 정보를 찾고 있어요</span>
              <div className="typing-dots">
                <span className="dot dot1" />
                <span className="dot dot2" />
                <span className="dot dot3" />
              </div>
            </div>
          ) : (
            formatContent(message.content)
          )}

          {/* 스트리밍 커서 */}
          {!isUser && message.isStreaming && message.content && (
            <span className="streaming-pulse-cursor" />
          )}
        </div>

        {/* 🎲 랜덤 추천 정책 카드 (스트리밍 완료 후, AI 응답에만 표시) */}
        {!isUser && message.policies && message.policies.length > 0 && !message.isStreaming && (
          <div className="related-policies">
            {/* 헤더: 제목 + 🔄 새로고침 버튼 */}
            <div className="related-policies-header">
              <h4 className="related-title">🎲 랜덤 추천 정책</h4>
              {/* 🔄 이모지 전용 새로고침 버튼 (한글 없음) */}
              <button
                className="policy-refresh-btn"
                onClick={handleRefreshPolicy}
                title="다른 정책 추천받기"
                aria-label="랜덤 추천 정책 새로고침"
              >
                🔄
              </button>
            </div>
            <div className="policy-cards-grid">
              <PolicyCard
                key={`${message.id}-${currentIndex}`}
                policy={message.policies[currentIndex % message.policies.length]}
                index={0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
